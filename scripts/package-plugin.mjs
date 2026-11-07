import { execFile } from "node:child_process";
import { cp, lstat, mkdir, mkdtemp, readFile, rename, rm, unlink, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const serverRoot = join(workspaceRoot, "mcp-server");

async function run(command, args, cwd) {
  const result = await execFileAsync(command, args, { cwd, maxBuffer: 4_000_000 });
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

async function resolvePackageRoot() {
  const manifest = JSON.parse(await readFile(join(workspaceRoot, "plugin.json"), "utf8"));
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(manifest.name) || !manifest.version) {
    throw new Error("plugin.json 必须包含有效的 name 和 version");
  }
  return resolve(workspaceRoot, "artifacts", `${manifest.name}-${manifest.version}`);
}

async function copyPluginFiles(stageRoot) {
  for (const file of ["plugin.json", "mcp.json", "README.md"]) {
    await cp(join(workspaceRoot, file), join(stageRoot, file));
  }
  await cp(join(workspaceRoot, "skills"), join(stageRoot, "skills"), { recursive: true });
  const stagedServer = join(stageRoot, "mcp-server");
  await mkdir(stagedServer, { recursive: true });
  await cp(join(serverRoot, "dist"), join(stagedServer, "dist"), { recursive: true });
  await cp(join(serverRoot, "package.json"), join(stagedServer, "package.json"));
  await cp(join(serverRoot, "pnpm-lock.yaml"), join(stagedServer, "pnpm-lock.yaml"));
}

async function installRuntimeDependencies(stageRoot) {
  const stagedServer = join(stageRoot, "mcp-server");
  await run("pnpm", ["install", "--prod", "--frozen-lockfile", "--node-linker=hoisted"], stagedServer);
  const dependencyPath = join(stagedServer, "node_modules", "@modelcontextprotocol", "sdk");
  if (!(await exists(dependencyPath))) throw new Error("MCP SDK 没有出现在自包含运行时依赖中");
  const appDependencyPath = join(stagedServer, "node_modules", "@modelcontextprotocol", "ext-apps");
  if (!(await exists(appDependencyPath))) throw new Error("MCP Apps SDK 没有出现在自包含运行时依赖中");
}

async function finalizeRuntimeManifest(stageRoot) {
  const stagedServer = join(stageRoot, "mcp-server");
  const source = JSON.parse(await readFile(join(serverRoot, "package.json"), "utf8"));
  const runtimeManifest = {
    name: source.name,
    version: source.version,
    private: true,
    type: "module",
    engines: source.engines
  };
  await writeFile(join(stagedServer, "package.json"), `${JSON.stringify(runtimeManifest, null, 2)}\n`);
  await unlink(join(stagedServer, "pnpm-lock.yaml"));
}

async function createPackage() {
  const packageRoot = await resolvePackageRoot();
  if (await exists(packageRoot)) {
    throw new Error(`打包目录已存在，请先移走或删除：${packageRoot}`);
  }
  await run("pnpm", ["run", "build"], serverRoot);
  await mkdir(dirname(packageRoot), { recursive: true });
  const temporaryRoot = await mkdtemp(join(dirname(packageRoot), ".vibe-plugin-"));
  const stageRoot = join(temporaryRoot, "plugin");
  try {
    await mkdir(stageRoot);
    await copyPluginFiles(stageRoot);
    await installRuntimeDependencies(stageRoot);
    await finalizeRuntimeManifest(stageRoot);
    await rename(stageRoot, packageRoot);
  } catch (error) {
    await rm(temporaryRoot, { recursive: true, force: true });
    throw error;
  }
  await rm(temporaryRoot, { recursive: true, force: true });
  process.stdout.write(`插件包已生成：${packageRoot}\n`);
}

createPackage().catch((error) => {
  process.stderr.write(`插件打包失败：${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
