// Minimal browser test harness. Exposed as `node:test` via the import map in
// tests/index.html so the *.test.js files can import { test } unchanged.
const _tests = [];

export function test(name, fn) {
  _tests.push({ name, fn });
}

export async function runAll() {
  let pass = 0, fail = 0;
  const lines = [];
  for (const t of _tests) {
    try {
      await t.fn();
      pass++;
      lines.push('PASS  ' + t.name);
    } catch (e) {
      fail++;
      lines.push('FAIL  ' + t.name + '  ::  ' + (e && e.message ? e.message : e));
    }
  }
  const summary = `TEST SUMMARY: ${pass} passed, ${fail} failed, ${_tests.length} total`;
  lines.forEach(l => console.log(l));
  console.log(summary);
  const el = document.getElementById('out');
  if (el) el.textContent = lines.join('\n') + '\n\n' + summary;
  window.__TEST_RESULT__ = { pass, fail, total: _tests.length };
  return window.__TEST_RESULT__;
}
