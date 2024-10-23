import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { parse, join, relative, basename, extname } from 'path';
import ts from 'typescript';

const PLUGIN_NAME = 'vite-plugin-wshcm-builder';
const extsToTransform = ['.tsx', '.ts', '.js', '.jsx', '.bs'];
const extsMapping = new Map([
  ['.tsx', '.js'],
  ['.ts', '.js'],
  ['.jsx', '.js']
]);

const CWT_MARKER = '/// <template type="cwt" />';

function wrap(sourceCode) {
  console.log('MARKER', sourceCode.indexOf(CWT_MARKER));
  if (sourceCode.indexOf(CWT_MARKER) !== -1) {
    sourceCode = `<%\n${sourceCode}\n%>\n`;
  }

  return `\ufeff${sourceCode}`;
}

function preTransform(sourceCode) {
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

  const sourceFile = ts.createSourceFile('', sourceCode, ts.ScriptTarget.ES5, true);
  const result = ts.transform(sourceFile, [() => rootNode => ts.visitNode(rootNode, visitor)]);
  const printer = ts.createPrinter();
  return printer.printFile(result.transformed[0]);
}

function transform(sourceCode) {
  const { outputText } = ts.transpileModule(
    sourceCode,
    {
      compilerOptions: { module: ts.ModuleKind.ES2015, target: ts.ScriptTarget.ES5 }
    }
  );

  return outputText;
}

function postTransform(sourceCode) {
  function visitor(node) {
    if (ts.isForInStatement(node)) {
      if (ts.isVariableDeclarationList(node.initializer) && node.initializer.declarations.length > 0) {
        const variableDeclaration = node.initializer.declarations[0];
        const variableName = variableDeclaration.name;

        const newVariableStatement = ts.factory.createVariableStatement(
          undefined,
          ts.factory.createVariableDeclarationList(
            [ts.factory.createVariableDeclaration(variableName)],
            ts.NodeFlags.Let
          )
        );

        const newForInLoop = ts.factory.updateForInStatement(
          node,
          variableName,
          node.expression,
          node.statement
        );

        return [newVariableStatement, newForInLoop];
      }
    }

    return ts.visitEachChild(node, visitor);
  }

  const sourceFile = ts.createSourceFile('', sourceCode, ts.ScriptTarget.ES5, true);
  const result = ts.transform(sourceFile, [() => rootNode => ts.visitNode(rootNode, visitor)]);
  const printer = ts.createPrinter();
  return printer.printFile(result.transformed[0]);
}

export default function wshcmBuilder(config) {
  return {
    name: PLUGIN_NAME,
    async handleHotUpdate(ctx) {
      try {
        const relativePath = relative(ctx.server.config.root, ctx.file);
        const outputRelative = relative(ctx.server.config.root, config.output);

        if (relativePath.startsWith(outputRelative)) {
          return;
        }

        const outputPath = join(config.output, relativePath);
        const outputPathParsed = parse(outputPath);

        if (!existsSync(outputPathParsed.dir)) {
          mkdirSync(outputPathParsed.dir, { recursive: true });
        }

        let sourceCode = await ctx.read();

        if (extsToTransform.indexOf(extname(ctx.file)) !== -1) {
          sourceCode = preTransform(sourceCode);
          sourceCode = transform(sourceCode);
          sourceCode = postTransform(sourceCode);
          sourceCode = wrap(sourceCode);
        }

        writeFileSync(
          join(outputPathParsed.dir, `${outputPathParsed.name}${extsMapping.get(outputPathParsed.ext) ?? outputPathParsed.ext}`),
          sourceCode
        );

        console.log(`✅ ${new Date().toLocaleString()} File "${basename(ctx.file)}" successfully transformed and saved in the "${outputRelative}" folder`);
      } catch (error) {
        console.error(`🛑 Error occurred in plugin ${PLUGIN_NAME}\n`, error);
      }
    },
  };
}
