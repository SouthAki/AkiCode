import { lstat, realpath, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";

export async function resolveRepositoryRoot(repoPath: string): Promise<string> {
  const absolute = resolve(repoPath);
  const info = await stat(absolute);
  if (!info.isDirectory()) throw new Error("repoPath 必须是目录");
  return realpath(absolute);
}

export function resolveInsideRoot(root: string, relativePath: string): string {
  if (!relativePath || isAbsolute(relativePath)) {
    throw new Error("只允许仓库内的相对路径");
  }
  const target = resolve(root, relativePath);
  const rel = relative(root, target);
  if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    throw new Error("路径不能离开仓库根目录");
  }
  return target;
}

export async function rejectSymlinkSegments(root: string, target: string): Promise<void> {
  const rel = relative(root, target);
  if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    throw new Error("路径不能离开仓库根目录");
  }
  let current = root;
  for (const part of rel.split(sep).filter(Boolean)) {
    current = resolve(current, part);
    let info;
    try {
      info = await lstat(current);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
      throw error;
    }
    if (info.isSymbolicLink()) throw new Error("拒绝通过符号链接访问仓库路径");
  }
}
