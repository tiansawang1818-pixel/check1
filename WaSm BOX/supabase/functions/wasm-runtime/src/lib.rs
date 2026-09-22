use serde::Deserialize;
use serde_json::{json, Value};
const MAX_BYTES: usize = 65_536;
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Condition {field:String,operator:String,#[serde(default)]value:Value}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Rule {conditions:Vec<Condition>,#[serde(default="and",rename="match")] mode:String,output:Value}
fn and()->String {"AND".into()}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Definition {version:u32,rules:Vec<Rule>,#[serde(rename="defaultOutput")]default_output:Value}
#[derive(Deserialize)]
struct Field {name:String,#[serde(rename="type")]kind:String,#[serde(default)]required:bool,min:Option<f64>,max:Option<f64>,options:Option<Vec<String>>}
#[derive(Deserialize)]
struct Schema {fields:Vec<Field>}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Request {rule:Definition,input:Value,schema:Schema}
fn empty(v:&Value)->bool {v.is_null()||v.as_str()==Some("")||v.as_array().is_some_and(|x|x.is_empty())}
fn compare(c:&Condition,input:&Value)->Result<bool,String>{
 let v=&input[&c.field];let r=&c.value;
 Ok(match c.operator.as_str(){
 "=="=>v==r,"!="=>v!=r,
 ">"|">="|"<"|"<="=>match(v.as_f64(),r.as_f64()){(Some(a),Some(b))=>match c.operator.as_str(){">"=>a>b,">="=>a>=b,"<"=>a<b,_=>a<=b},_=>false},
 "contains"|"not_contains"=>{let matched=match(v,r){(Value::String(a),Value::String(b))=>a.contains(b),(Value::Array(a),b)=>a.contains(b),_=>false};if c.operator=="not_contains"{!matched}else{matched}},
 "starts_with"=>matches!((v.as_str(),r.as_str()),(Some(a),Some(b)) if a.starts_with(b)),
 "ends_with"=>matches!((v.as_str(),r.as_str()),(Some(a),Some(b)) if a.ends_with(b)),
 "is_empty"=>empty(v),"is_not_empty"=>!empty(v),_=>return Err("Unknown operator".into())})
}
pub fn evaluate_json(bytes:&[u8])->Result<Value,String>{
 if bytes.len()>MAX_BYTES*2{return Err("Payload too large".into())}
 let req:Request=serde_json::from_slice(bytes).map_err(|_|"Invalid request JSON or structure")?;
 if req.rule.version!=1||req.rule.rules.len()>100||req.schema.fields.is_empty()||req.schema.fields.len()>50{return Err("Invalid rule version or limits".into())}
 let object=req.input.as_object().ok_or("Input must be an object")?;
 let mut names=std::collections::HashSet::new();
 for f in &req.schema.fields{
 if !names.insert(f.name.as_str()){return Err("Duplicate field".into())}
 let v=&req.input[&f.name];if v.is_null()||v.as_str()==Some(""){if f.required{return Err(format!("{} is required",f.name))}continue}
 let valid=match f.kind.as_str(){"number"=>v.as_f64().is_some_and(|n| f.min.is_none_or(|m|n>=m)&&f.max.is_none_or(|m|n<=m)),"boolean"=>v.is_boolean(),"json"=>true,"select"=>v.as_str().is_some_and(|s|f.options.as_ref().is_some_and(|o|o.iter().any(|x|x==s))),"text"|"textarea"|"email"|"date"=>v.as_str().is_some_and(|s|f.min.is_none_or(|m|s.encode_utf16().count() as f64>=m)&&f.max.is_none_or(|m|s.encode_utf16().count() as f64<=m)),_=>false};
 if !valid{return Err(format!("Invalid field: {}",f.name))}
 }
 if object.keys().any(|k|!names.contains(k.as_str())){return Err("Unknown input field".into())}
 // Validate every rule before evaluating, including unreachable branches.
 for r in &req.rule.rules{
 if r.conditions.is_empty()||r.conditions.len()>20||!matches!(r.mode.as_str(),"AND"|"OR"){return Err("Invalid condition group".into())}
 for c in &r.conditions{if !names.contains(c.field.as_str()){return Err("Unknown rule field".into())}compare(c,&req.input)?;}
 }
 for r in &req.rule.rules{
 let matches:Vec<bool>=r.conditions.iter().map(|c|compare(c,&req.input)).collect::<Result<_,_>>()?;
 if if r.mode=="AND"{matches.iter().all(|m|*m)}else{matches.iter().any(|m|*m)}{return Ok(r.output.clone())}
 }
 Ok(req.rule.default_output)
}
// Raw ABI has zero imports: no WASI, host callbacks, files, networking, environment or clock.
// Each request gets a fresh instance. Host allocates at most 128 KiB and discards the instance.
#[no_mangle]
pub extern "C" fn alloc(len:u32)->u32 {
 if len as usize>MAX_BYTES*2{return 0}
 let mut bytes=vec![0u8;len as usize].into_boxed_slice();let ptr=bytes.as_mut_ptr();std::mem::forget(bytes);ptr as u32
}
/// Evaluate a buffer allocated by `alloc` in this instance.
/// # Safety
/// `ptr` must refer to `len` initialized bytes returned by `alloc`.
#[no_mangle]
pub unsafe extern "C" fn evaluate(ptr:u32,len:u32)->u64 {
 if len as usize>MAX_BYTES*2{return 0}
 let input=std::slice::from_raw_parts(ptr as *const u8,len as usize);
 let result=match evaluate_json(input){Ok(output)=>json!({"success":true,"output":output}),Err(error)=>json!({"success":false,"error":error})};
 let mut out=serde_json::to_vec(&result).unwrap_or_default();
 if out.len()>MAX_BYTES{out=b"{\"success\":false,\"error\":\"OUTPUT_TOO_LARGE\"}".to_vec()}
 let mut out=out.into_boxed_slice();let p=out.as_mut_ptr() as u64;let n=out.len() as u64;std::mem::forget(out);(n<<32)|p
}
#[cfg(test)]
mod tests {
 use super::*;
 fn run(score:Value)->Result<Value,String>{evaluate_json(&serde_json::to_vec(&json!({"rule":{"version":1,"rules":[{"conditions":[{"field":"score","operator":">=","value":80}],"output":"A"}],"defaultOutput":"F"},"schema":{"fields":[{"name":"score","type":"number","required":true,"min":0,"max":100}]},"input":{"score":score}})).unwrap())}
 #[test]fn grade(){assert_eq!(run(json!(85)).unwrap(),json!("A"));assert_eq!(run(json!(10)).unwrap(),json!("F"));}
 #[test]fn reject_invalid_input(){assert!(run(json!(101)).is_err());assert!(run(json!("85")).is_err());assert!(run(Value::Null).is_err());}
 #[test]fn reject_invalid_json(){assert!(evaluate_json(b"invalid").is_err());}
 #[test]fn payload_limit(){assert!(evaluate_json(&vec![0;131073]).is_err());}
}
