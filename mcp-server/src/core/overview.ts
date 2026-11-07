import { extname } from "node:path";
import { listTextFiles } from "./filesystem.js";
import { ROOT_MANIFESTS } from "../shared/limits.js";
import { resolveRepositoryRoot } from "../shared/paths.js";

const ENTRY_POINT_PATTERN = /(^|\/)(src\/)?(main|index|app|server|cli)\.(c|cc|cpp|cs|go|java|js|jsx|kt|php|py|rb|rs|swift|ts|tsx)$/i;

export async function inspectRepository(repoPath: string) {
  const root = await resolveRepositoryRoot(repoPath);
  const inventory = await listTextFiles(root);
  const modules = new Map<string, number>();
  const languages = new Map<string, number>();
  const manifests: string[] = [];
  const entryPoints: string[] = [];

  for (const file of inventory.paths) {
    const parts = file.split("/");
    const moduleName = parts.length === 1 ? "<root>" : (parts[0] ?? "<root>");
    modules.set(moduleName, (modules.get(moduleName) ?? 0) + 1);
    const extension = extname(file).toLowerCase() || "<none>";
    languages.set(extension, (languages.get(extension) ?? 0) + 1);
    if (parts.length === 1 && ROOT_MANIFESTS.has(file)) manifests.push(file);
    if (ENTRY_POINT_PATTERN.test(file)) entryPoints.push(file);
  }

  return {
    repository: root,
    indexedTextFileCount: inventory.paths.length,
    inventoryTruncated: inventory.truncated,
    rootManifests: manifests,
    likelyEntryPoints: entryPoints.slice(0, 80),
    topLevelModules: [...modules].slice(0, 100).map(([name, fileCount]) => ({ name, fileCount })),
    modulesTruncated: modules.size > 100,
    fileTypes: [...languages]
      .map(([extension, fileCount]) => ({ extension, fileCount }))
      .sort((left, right) => right.fileCount - left.fileCount),
    note: "This is a deterministic inventory, not a semantic dependency graph. Use search and file reads to trace relationships."
  };
}
