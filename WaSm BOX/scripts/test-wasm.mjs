import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const bytes = readFileSync(
  new URL(
    "../supabase/functions/wasm-runtime/pkg/wasmbot_engine.wasm",
    import.meta.url,
  ),
);
const module = await WebAssembly.compile(bytes);
assert.deepEqual(
  WebAssembly.Module.imports(module),
  [],
  "No host capabilities",
);
let checks = 1;
const field = (type = "number") => ({
  name: "x",
  label: "X",
  type,
  required: true,
});
async function call(rule, input, schema = { fields: [field()] }) {
  const { exports: e } = await WebAssembly.instantiate(module, {});
  const inputBytes = new TextEncoder().encode(
    JSON.stringify({ rule, input, schema }),
  );
  const p = e.alloc(inputBytes.length);
  assert.ok(p);
  new Uint8Array(e.memory.buffer, p, inputBytes.length).set(inputBytes);
  const packed = e.evaluate(p, inputBytes.length);
  const result = JSON.parse(
    new TextDecoder().decode(
      new Uint8Array(
        e.memory.buffer,
        Number(packed & 0xffffffffn),
        Number(packed >> 32n),
      ),
    ),
  );
  checks++;
  return result;
}
const grade = {
  version: 1,
  rules: [80, 70, 60, 50].map((value, i) => ({
    conditions: [{ field: "x", operator: ">=", value }],
    match: "AND",
    output: ["A", "B", "C", "D"][i],
  })),
  defaultOutput: "F",
};
for (
  const [score, output] of [[85, "A"], [72, "B"], [65, "C"], [55, "D"], [
    0,
    "F",
  ], [95, "A"]]
) assert.equal((await call(grade, { x: score })).output, output);
for (
  const [operator, input, value, expected, type] of [
    ["==", 3, 3, true, "number"],
    ["!=", 3, 4, true, "number"],
    [">", 3, 2, true, "number"],
    [">=", 3, 3, true, "number"],
    ["<", 3, 4, true, "number"],
    ["<=", 3, 3, true, "number"],
    ["contains", "hello", "ell", true, "text"],
    ["not_contains", "hello", "xyz", true, "text"],
    ["starts_with", "hello", "he", true, "text"],
    ["ends_with", "hello", "lo", true, "text"],
    ["is_empty", "", null, true, "text"],
    ["is_not_empty", "hi", null, true, "text"],
    ["contains", [1, 2], 2, true, "json"],
    ["==", 3, "3", false, "number"],
  ]
) {
  const rule = {
    version: 1,
    rules: [{ conditions: [{ field: "x", operator, value }], output: true }],
    defaultOutput: false,
  };
  assert.equal(
    (await call(rule, { x: input }, {
      fields: [{ ...field(type), required: false }],
    })).output,
    expected,
    operator,
  );
}
for (const match of ["AND", "OR"]) {
  const rule = {
    version: 1,
    rules: [{
      match,
      conditions: [{ field: "x", operator: ">=", value: 80 }, {
        field: "x",
        operator: "<",
        value: 50,
      }],
      output: "yes",
    }],
    defaultOutput: "no",
  };
  assert.equal(
    (await call(rule, { x: 85 })).output,
    match === "AND" ? "no" : "yes",
  );
}
assert.equal((await call(grade, { x: "85" })).success, false);
assert.equal((await call({ ...grade, version: 2 }, { x: 85 })).success, false);
assert.equal(
  (await call({
    ...grade,
    rules: [{
      conditions: [{ field: "x", operator: "eval", value: "process.env" }],
      output: true,
    }],
  }, { x: 85 })).success,
  false,
);
assert.equal(
  (await call(grade, { x: 101 }, { fields: [{ ...field(), max: 100 }] }))
    .success,
  false,
);
assert.equal(
  (await call({ ...grade, defaultOutput: "a".repeat(66000), rules: [] }, {
    x: 1,
  })).error,
  "OUTPUT_TOO_LARGE",
);
const { exports: e } = await WebAssembly.instantiate(module, {});
e.memory.grow(512 - e.memory.buffer.byteLength / 65536);
assert.equal(e.memory.buffer.byteLength, 33554432);
assert.throws(() => e.memory.grow(1), RangeError);
assert.equal(e.alloc(131073), 0);
checks += 2;
console.log(
  `WASM verification: ${checks} checks passed; zero imports; hard 32 MiB memory cap; all operators and AND/OR run inside Rust WASM.`,
);
