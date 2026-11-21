import { cp, lstat, mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const serverRoot = join(workspaceRoot, "mcp-server");
const packageFiles = [
  "plugin.json",
  "mcp.json",
  "README.md",
  "docs/design-reference.md",
  "docs/npm-distribution.md",
  "skills/**",
  "assets/**",
  "mcp-server/dist/tools/index.js",
  "mcp-server/dist/ui/**"
];

async function runBuild() {
  const result = await execFileAsync("pnpm", ["run", "build"], { cwd: serverRoot, maxBuffer: 4_000_000 });
  if (result.stdout.trim()) process.stdout.write(result.stdout);
  if (result.stderr.trim()) process.stderr.write(result.stderr);
}

async function exists(path) {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function validateManifests(plugin, npmPackage) {
  const validName = /^@[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*$/;
  const validPluginName = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const validVersion = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
  if (!validName.test(npmPackage.name)) throw new Error("scripts/npm-package.json 必须使用有效的小写 scoped npm 名称");
  if (!validPluginName.test(plugin.name) || !validVersion.test(plugin.version)) {
    throw new Error("plugin.json 必须包含有效的 name 和 semver version");
  }
}

async function copyPluginFiles(stageRoot) {
  for (const file of ["plugin.json", "mcp.json", "README.md"]) {
    await cp(join(workspaceRoot, file), join(stageRoot, file));
  }
  await mkdir(join(stageRoot, "docs"), { recursive: true });
  for (const file of ["design-reference.md", "npm-distribution.md"]) {
    await cp(join(workspaceRoot, "docs", file), join(stageRoot, "docs", file));
  }
  await cp(join(workspaceRoot, "skills"), join(stageRoot, "skills"), { recursive: true });
  await cp(join(workspaceRoot, "assets"), join(stageRoot, "assets"), { recursive: true });
  const serverDist = join(stageRoot, "mcp-server", "dist");
  await mkdir(join(serverDist, "tools"), { recursive: true });
  await mkdir(join(serverDist, "ui"), { recursive: true });
  await cp(join(workspaceRoot, "artifacts", ".build", "mcp-server", "dist", "tools", "index.js"), join(serverDist, "tools", "index.js"));
  await cp(join(serverRoot, "dist", "ui"), join(serverDist, "ui"), { recursive: true });
}

function createNpmManifest(plugin, npmPackage) {
  return {
    name: npmPackage.name,
    version: plugin.version,
    description: npmPackage.description || plugin.description,
    type: "module",
    engines: { node: ">=20" },
    files: packageFiles
  };
}

async function createPackage() {
  const plugin = await readJson(join(workspaceRoot, "plugin.json"));
  const npmPackage = await readJson(join(workspaceRoot, "scripts", "npm-package.json"));
  validateManifests(plugin, npmPackage);
  const packageSlug = npmPackage.name.split("/").at(-1);
  const outputRoot = join(workspaceRoot, "artifacts", "npm", packageSlug + "-" + plugin.version);
  if (await exists(outputRoot)) throw new Error("npm 打包目录已存在，请先移走或删除：" + outputRoot);
  await runBuild();
  const parent = dirname(outputRoot);
  await mkdir(parent, { recursive: true });
  const temporaryRoot = await mkdtemp(join(parent, ".akicode-npm-"));
  const stageRoot = join(temporaryRoot, "package");
  try {
    await mkdir(stageRoot);
    await copyPluginFiles(stageRoot);
    await writeFile(join(stageRoot, "package.json"), JSON.stringify(createNpmManifest(plugin, npmPackage), null, 2) + "\n");
    await rename(stageRoot, outputRoot);
  } catch (error) {
    await rm(temporaryRoot, { recursive: true, force: true });
    throw error;
  }
  await rm(temporaryRoot, { recursive: true, force: true });
  process.stdout.write("npm 插件包已生成：" + outputRoot + "\n");
}

createPackage().catch((error) => {
  process.stderr.write("npm 插件打包失败：" + (error instanceof Error ? error.message : String(error)) + "\n");
  process.exitCode = 1;
});
