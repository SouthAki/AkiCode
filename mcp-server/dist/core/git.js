import { lstat, readFile } from "node:fs/promises";
import { resolveRepositoryRoot, rejectSymlinkSegments, resolveInsideRoot } from "../shared/paths.js";
import { MAX_DIFF_BYTES, MAX_FILE_BYTES } from "../shared/limits.js";
import { parseNullSeparatedPaths, runGit } from "../shared/process.js";
export async function resolveGitRepositoryRoot(repoPath) {
    const requestedRoot = await resolveRepositoryRoot(repoPath);
    const root = (await runGit(requestedRoot, ["rev-parse", "--show-toplevel"])).trim();
    return resolveRepositoryRoot(root);
}
function validateRef(value, label) {
    if (!value || !/^[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$/.test(value) || value.includes("..")) {
        throw new Error(`${label} 不是有效的 Git ref`);
    }
    return value;
}
async function collectWorkingTreeFiles(root) {
    const files = new Map();
    const sources = [
        { status: "staged", args: ["diff", "--cached", "--name-only", "-z"] },
        { status: "unstaged", args: ["diff", "--name-only", "-z"] },
        { status: "untracked", args: ["ls-files", "--others", "--exclude-standard", "-z"] }
    ];
    for (const source of sources) {
        const output = await runGit(root, source.args);
        for (const file of parseNullSeparatedPaths(output)) {
            const statuses = files.get(file) ?? new Set();
            statuses.add(source.status);
            files.set(file, statuses);
        }
    }
    return files;
}
export async function listChangedFiles(repoPath, scope, base, head) {
    const root = await resolveGitRepositoryRoot(repoPath);
    if (scope === "working-tree") {
        const changes = await collectWorkingTreeFiles(root);
        return {
            repository: root,
            scope,
            files: [...changes].map(([filePath, statuses]) => ({ path: filePath, status: [...statuses].join("+") }))
        };
    }
    const baseRef = validateRef(base, "base");
    const headRef = validateRef(head, "head");
    const paths = parseNullSeparatedPaths(await runGit(root, ["diff", "--no-renames", "--name-only", "-z", `${baseRef}...${headRef}`, "--"]));
    return { repository: root, scope, files: paths.map((filePath) => ({ path: filePath, status: "branch-range" })) };
}
function trimDiff(diff) {
    const bytes = Buffer.from(diff, "utf8");
    if (bytes.length <= MAX_DIFF_BYTES)
        return { diff, truncated: false };
    const partial = bytes.subarray(0, MAX_DIFF_BYTES).toString("utf8");
    return { diff: `${partial}\n[Diff 已截断，请按更小文件范围重新读取]`, truncated: true };
}
async function untrackedDiff(root, filePath) {
    const absolute = resolveInsideRoot(root, filePath);
    await rejectSymlinkSegments(root, absolute);
    const info = await lstat(absolute);
    if (!info.isFile())
        throw new Error("untracked 路径不是普通文件");
    if (info.size > MAX_FILE_BYTES)
        throw new Error(`文件超过 ${MAX_FILE_BYTES} 字节 Diff 上限`);
    const content = await readFile(absolute, "utf8");
    if (content.includes("\0"))
        return `新文件为二进制文件：${filePath}`;
    const lines = content.split(/\r?\n/);
    const body = lines.map((line) => `+${line}`).join("\n");
    return `diff --git a/${filePath} b/${filePath}\nnew file mode 100644\n--- /dev/null\n+++ b/${filePath}\n@@ -0,0 +1,${lines.length} @@\n${body}`;
}
export async function readGitDiff(repoPath, filePath, scope, base, head) {
    const changeSet = await listChangedFiles(repoPath, scope, base, head);
    const root = changeSet.repository;
    const target = resolveInsideRoot(root, filePath);
    await rejectSymlinkSegments(root, target);
    const change = changeSet.files.find((entry) => entry.path === filePath);
    if (!change)
        return { repository: root, path: filePath, scope, diff: "该文件不在指定变更范围内。", truncated: false };
    let diff = "";
    if (scope === "branch-range") {
        const baseRef = validateRef(base, "base");
        const headRef = validateRef(head, "head");
        diff = await runGit(root, ["--literal-pathspecs", "diff", "--no-ext-diff", "--no-textconv", "--no-color", "--no-renames", "--unified=8", `${baseRef}...${headRef}`, "--", filePath]);
    }
    else {
        if (change.status.includes("unstaged")) {
            diff += await runGit(root, ["--literal-pathspecs", "diff", "--no-ext-diff", "--no-textconv", "--no-color", "--unified=8", "--", filePath]);
        }
        if (change.status.includes("staged")) {
            diff += await runGit(root, ["--literal-pathspecs", "diff", "--cached", "--no-ext-diff", "--no-textconv", "--no-color", "--unified=8", "--", filePath]);
        }
        if (change.status.includes("untracked"))
            diff += await untrackedDiff(root, filePath);
    }
    const limited = trimDiff(diff || "没有可读取的文本 Diff。");
    return { repository: root, path: filePath, scope, diff: limited.diff, truncated: limited.truncated };
}
