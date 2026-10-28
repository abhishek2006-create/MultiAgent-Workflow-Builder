const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

test('layout transition never mutates a streamed login page before it hydrates', () => {
  const effects = [];
  const refs = [];
  const targets = [];
  let cleaned = false;
  const jsx = (type, props) => ({ type, props });
  const gsap = {
    matchMedia: () => ({ add: (_query, run) => { const cleanup = run(); gsap.cleanup = cleanup; }, revert: () => { gsap.cleanup?.(); } }),
    context: (run) => { run(); return { revert: () => { cleaned = true; } }; },
    fromTo: (target) => {
      // A selector or a page descendant here would reintroduce the reported race.
      assert.equal(target, refs[1].current);
      targets.push(target);
    },
  };
  const filename = path.resolve(__dirname, '../components/layout/SiteMotion.tsx');
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const exports = {};
  const imports = {
    react: { useRef: () => { const ref = { current: {} }; refs.push(ref); return ref; }, useEffect: (run) => effects.push(run) },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/navigation': { usePathname: () => '/login' },
    gsap,
  };
  vm.runInNewContext(code, { exports, require: (name) => imports[name] ?? require(name) }, { filename });
  const loginPage = { type: 'div', props: { className: 'auth-page' } };
  exports.default({ children: loginPage });
  const cleanup = effects[0]();
  assert.equal(targets.length, 1);
  assert.equal(loginPage.props.style, undefined);
  cleanup();
  assert.equal(cleaned, true);
});
