import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { parse, join, relative, basename, extname } from 'path';
import ts from 'typescript';

const PLUGIN_NAME = 'vite-plugin-wshcm';
const EXTS_TO_TRANSFORM = ['.tsx', '.ts', '.js', '.jsx', '.bs'];
const EXTS_MAPPING = new Map([
  ['.tsx', '.js'],
  ['.ts', '.js'],
  ['.jsx', '.js']
]);

const CWT_MARKER = '/// <template type="cwt" />';
const TRANSPILE_OPTIONS = {
  compilerOptions: {
    module: ts.ModuleKind.ES2015,
    target: ts.ScriptTarget.ES5,
  }
};

/**
 * Метод для оборачивания исходного кода в теги <% %>, если имеется маркер в файле.
 * И добавлени bom метки
 * @param {string} code - Исходный код
 * @returns {string}
 */
export function wrap(code) {
  if (code.indexOf(CWT_MARKER) !== -1) {
    code = `<%\n${code}\n%>\n`;
  }

  return `\ufeff${code}`;
}

/**
 * Подготовка кода перед транспиляцией
 * @param {string} code - Исходный код
 * @returns {string}
 */
export function prepare(code) {
  function visitor(node) {
    if (ts.isExportDeclaration(node) || ts.isImportDeclaration(node)) {
      ts.addSyntheticLeadingComment(node, ts.SyntaxKind.MissingDeclaration, '', false);
      return node;
    }

    if (ts.isTemplateExpression(node)) {
      const expressions = [ts.factory.createStringLiteral(node.head.text)];

      node.templateSpans.forEach(span => {
        expressions.push(span.expression);
        expressions.push(ts.factory.createStringLiteral(span.literal.text));
      });
  
      let concatenated = expressions[0];
  
      for (let i = 1; i < expressions.length; i++) {
        concatenated = ts.factory.createBinaryExpression(
          concatenated,
          ts.SyntaxKind.PlusToken,
          expressions[i]
        );
      }

      return concatenated;
    }

    return ts.visitEachChild(node, visitor);
  }

  const sourceFile = ts.createSourceFile('', code, ts.ScriptTarget.ES5, true);
  const result = ts.transform(sourceFile, [() => rootNode => ts.visitNode(rootNode, visitor)]);
  const printer = ts.createPrinter();
  return printer.printFile(result.transformed[0]);
}

/**
 * Транспиляция кода
 * @param {string} code - Исходный код
 * @returns {string}
 */
export function pare(code) {
  const { outputText } = ts.transpileModule(code, TRANSPILE_OPTIONS);
  return outputText;
}

/**
 * Правка кода после транспиляции
 * @param {string} code - Исходный код
 * @returns {string}
 */
export function afterpare(code) {
  function visitor(node) {
    if (ts.isForInStatement(node)) {
      if (ts.isVariableDeclarationList(node.initializer) && node.initializer.declarations.length > 0) {
        const variableDeclaration = node.initializer.declarations[0];
        const variableName = variableDeclaration.name;

        const newVariableStatement = ts.factory.createVariableStatement(
          undefined,
          ts.factory.createVariableDeclarationList([ts.factory.createVariableDeclaration(variableName)], ts.NodeFlags.None)
        );

        const newForInLoop = ts.factory.updateForInStatement(node, variableName, node.expression, node.statement);
        return [newVariableStatement, newForInLoop];
      }
    }

    return ts.visitEachChild(node, visitor);
  }

  const sourceFile = ts.createSourceFile('', code, ts.ScriptTarget.ES5, true);
  const result = ts.transform(sourceFile, [() => rootNode => ts.visitNode(rootNode, visitor)]);
  const printer = ts.createPrinter();
  return printer.printFile(result.transformed[0]);
}

/**
 * Обработка кода и возвращение в формате WSHCM
 * @param {import('vite').HmrContext} ctx - Контекст плагина
 * @returns 
 */
export async function transmute(ctx) {
  let code = await ctx.read();

  if (EXTS_TO_TRANSFORM.indexOf(extname(ctx.file)) !== -1) {
    code = prepare(code);
    code = pare(code);
    code = afterpare(code);
    code = wrap(code);
  }

  return code;
}

/**
 * Плагин
 * @param {import('.').WSHCMConfiguration} config - Конфигурация плагина
 * @returns {Promise<void>}
 */
export default async function wshcm(config) {
  return {
    name: PLUGIN_NAME,
    /**
     * 
     * @param {import('vite').HmrContext} ctx - Контекст плагина
     * @returns {Promise<void>}
     */
    async handleHotUpdate(ctx) {
      const relativePath = relative(ctx.server.config.root, ctx.file);
      const outputRelative = relative(ctx.server.config.root, config.output);

      if (relativePath.startsWith(outputRelative)) {
        return;
      }

      const outputPath = join(config.output, relativePath);
      const { dir, name, ext } = parse(outputPath);

      try {
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }

        writeFileSync(join(dir, `${name}${EXTS_MAPPING.get(ext) ?? ext}`), await transmute(ctx));
        console.log(`✅ ${new Date().toLocaleString()} File "${basename(ctx.file)}" successfully transformed and saved in the "${outputRelative}" folder`);
      } catch (error) {
        console.error(`🛑 Error occurred in plugin ${PLUGIN_NAME}\n`, error);
      }
    },
  };
}
