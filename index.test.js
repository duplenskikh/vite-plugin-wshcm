import { mock, describe, it } from 'node:test';
import { wrap, prepare, pare, afterpare, transmute, convertFilename } from './index.js';
import assert from 'node:assert';
import { resolve } from 'node:path';

describe('vite-plugin-wshcm suite', () => {
  const TEMPLATE_DEFAULT_VALUES = `/// <template type="cwt" />
function sumWithC(a: number = 1, b: number = 10) {
  const c = a + b;
  return c;
}
`;

  const TEMPLATE_STRINGS_CODE = 'const string = `before${"in between"}after`';

  const FOR_IN_LOOP_CODE = `for (const key in array) {
  alert(key);
}

for (key in array) {
  alert(key);
}
`;

  const IMPORT_EXPORT_CODE = `import { something } from 'somehwere';
function decorateSomethingWithAnArgument(argument: Object) {
    return something(Object) + "decorate";
}

export {
  decorateSomethingWithAnArgument
};
`;

  it('Test wrap', () => {
    assert.strictEqual(wrap(TEMPLATE_DEFAULT_VALUES), `\ufeff<%\n${TEMPLATE_DEFAULT_VALUES}\n%>\n`);
  });

  it('Test prepare default values', () => {
    const expected = `/// <template type="cwt" />
function sumWithC(a: number = 1, b: number = 10) {
    const c = a + b;
    return c;
}
`;
    assert.strictEqual(prepare(TEMPLATE_DEFAULT_VALUES), expected);
  });

  it('Test prepare literal strings', () => {
    const expected = `const string = "before" + "in between" + "after";\n`;
    assert.strictEqual(prepare(TEMPLATE_STRINGS_CODE), expected);
  });

  it('Test pare default values', () => {
    const expected = `/// <template type="cwt" />
function sumWithC(a, b) {
    if (a === void 0) { a = 1; }
    if (b === void 0) { b = 10; }
    var c = a + b;
    return c;
}
`;
    assert.strictEqual(pare(TEMPLATE_DEFAULT_VALUES), expected);
  });

  it('Test pare literal strings', () => {
    const expected = `var string = "before" + "in between" + "after";\n`;
    assert.strictEqual(pare(prepare(TEMPLATE_STRINGS_CODE)), expected);
  });

  it('Test afterpare for in loop', () => {
    const expected = `var key;
for (key in array) {
    alert(key);
}
for (key in array) {
    alert(key);
}
`;
    assert.strictEqual(afterpare(pare(prepare(FOR_IN_LOOP_CODE))), expected);
  });

  it('Test afterpare import export', () => {
    const expected = `// import { something } from 'somehwere';
function decorateSomethingWithAnArgument(argument) {
    return something(Object) + "decorate";
}
// export { decorateSomethingWithAnArgument };
`;
    assert.strictEqual(afterpare(pare(prepare(IMPORT_EXPORT_CODE))), expected);
  });

  it('Test transmute', async() => {
    const ctx = {
      file: 'index.tsx',
      read: async() => FOR_IN_LOOP_CODE,
    };
    const expected = `var key;
for (key in array) {
    alert(key);
}
for (key in array) {
    alert(key);
}
`;

    assert.strictEqual(await transmute(ctx), `\ufeff${expected}`);
  });

  it('Test plugin wshcm itself', async () => {
    const ctx = {
      async read() {
        return TEMPLATE_DEFAULT_VALUES;
      },
      file: 'dummy_file.ts',
      server: {
        config: {
          root: import.meta.dirname
        }
      }
    };

    const config = {
      src: resolve(import.meta.dirname, 'testdata', 'dummy_src_path'),
      output: resolve(import.meta.dirname, 'testdata', 'dummy_output_path'),
    };

    const expected = `\ufeff<%
/// <template type="cwt" />
function sumWithC(a, b) {
    if (a === void 0) {
        a = 1;
    }
    if (b === void 0) {
        b = 10;
    }
    var c = a + b;
    return c;
}

%>
`;

    const fsMock = mock.module('node:fs', {
      namedExports: {
        existsSync: () => true,
        mkdirSync() { },
        writeFileSync(path, content) {
          assert.equal(path, resolve(config.output, convertFilename(ctx.file)));
          assert.equal(content, expected);
        }
      }
    });

    const wshcm = await import(`./index.js?${Date.now()}`);
    const plugin = await wshcm.default(config);
    assert.equal(plugin.name, 'vite-plugin-wshcm');
    await plugin.handleHotUpdate(ctx);
    fsMock.restore();
  });
});