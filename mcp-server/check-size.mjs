import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import ts from "typescript";
import { fileURLToPath } from "node:url";

const sourceExtensions = new Set([".ts", ".js", ".mjs"]);
const ignoredDirectories = new Set(["dist", "node_modules"]);
const violations = [];

async function collectSources(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory() && !ignoredDirectories.has(entry.name)) return collectSources(path);
    if (entry.isFile() && sourceExtensions.has(extname(entry.name))) return [path];
    return [];
  }));
  return nested.flat();
}

function inspectFunctions(node, sourceFile, filePath) {
  if (ts.isFunctionLike(node) && node.body) {
    const firstLine = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
    const lastLine = sourceFile.getLineAndCharacterOfPosition(node.end).line + 1;
    const length = lastLine - firstLine + 1;
    if (length > 100) violations.push(`${filePath}:${firstLine} 函数/方法 ${length} 行，限制为 100 行`);
  }
  ts.forEachChild(node, (child) => inspectFunctions(child, sourceFile, filePath));
}

async function inspectFile(filePath) {
  const source = await readFile(filePath, "utf8");
  const lineCount = source.split(/\r?\n/).length;
  const displayPath = relative(process.cwd(), filePath);
  if (lineCount > 999) violations.push(`${displayPath} ${lineCount} 行，限制为 999 行`);
  const kind = extname(filePath) === ".ts" ? ts.ScriptKind.TS : ts.ScriptKind.JS;
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, kind);
  inspectFunctions(sourceFile, sourceFile, displayPath);
}

const sources = await Promise.all([
  collectSources(fileURLToPath(new URL("./src/", import.meta.url))),
  collectSources(fileURLToPath(new URL("../scripts/", import.meta.url)))
]).then((groups) => groups.flat());
sources.push(fileURLToPath(new URL("./check-size.mjs", import.meta.url)));
for (const source of sources) await inspectFile(source);

if (violations.length > 0) {
  process.stderr.write(`${violations.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`源码大小检查通过：${sources.length} 个文件。\n`);
}
