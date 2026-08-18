// Minimal strict-assert shim. Exposed as `node:assert/strict` via the import map
// in tests/index.html. Implements the subset the *.test.js files use:
// default callable, .ok, .equal (strict ===), .deepEqual (structural).
function stringify(v) {
  try { return typeof v === 'string' ? v : JSON.stringify(v); }
  catch { return String(v); }
}

function deepEqualCheck(a, b) {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return a === b;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ak = Object.keys(a), bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  return ak.every(k => deepEqualCheck(a[k], b[k]));
}

const assert = function (value, msg) {
  if (!value) throw new Error(msg || 'assert failed: value is falsy');
};
assert.ok = function (value, msg) {
  if (!value) throw new Error(msg || 'assert.ok failed');
};
assert.equal = function (a, b, msg) {
  if (a !== b) throw new Error(msg || `equal failed: ${stringify(a)} !== ${stringify(b)}`);
};
assert.deepEqual = function (a, b, msg) {
  if (!deepEqualCheck(a, b)) throw new Error(msg || `deepEqual failed: ${stringify(a)} vs ${stringify(b)}`);
};

export default assert;
