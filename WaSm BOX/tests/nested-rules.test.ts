import { expect, it } from "vitest";
import { BotSchema, gradeTemplate, RuleSchema, type ConditionGroup } from "../supabase/functions/_shared/schema";
const leaf = { field: "score", operator: ">=" as const, value: 80 };
const group = (): ConditionGroup => ({ conditions: [leaf], match: "AND" });
const definition = (root: ConditionGroup) => ({version:1, rules:[{...root,output:"yes"}],defaultOutput:"no"});
it("accepts mixed nested groups and keeps legacy rules compatible", () => {
  expect(RuleSchema.safeParse(definition({conditions:[],match:"OR",groups:[group(),{conditions:[{...leaf,value:60}],match:"AND"}]})).success).toBe(true);
  expect(BotSchema.safeParse(gradeTemplate).success).toBe(true);
});
it("rejects empty, too deep, excessive and unknown nested conditions", () => {
  expect(RuleSchema.safeParse(definition({conditions:[],match:"OR"})).success).toBe(false);
  let nested=group();
  for(let i=0;i<4;i++) nested={conditions:[],match:"AND",groups:[nested]};
  expect(RuleSchema.safeParse(definition(nested)).success).toBe(true);
  nested={conditions:[],match:"AND",groups:[nested]};
  expect(RuleSchema.safeParse(definition(nested)).success).toBe(false);
  expect(RuleSchema.safeParse(definition({conditions:[],match:"OR",groups:Array.from({length:6},()=>({conditions:Array.from({length:20},()=>leaf),match:"AND"}))})).success).toBe(false);
  expect(BotSchema.safeParse({...gradeTemplate,rule_definition:definition({conditions:[],match:"OR",groups:[{conditions:[{...leaf,field:"missing"}],match:"AND"}]})}).success).toBe(false);
});
