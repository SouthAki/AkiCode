import { createHash } from "node:crypto";
import { rejectSymlinkSegments, resolveInsideRoot } from "../shared/paths.js";
import { MAX_GIT_ACTION_BYTES, MAX_GIT_STATUS_BYTES, MAX_GIT_STATUS_FILES } from "../shared/limits.js";
import { runGit } from "../shared/process.js";
import { resolveGitRepositoryRoot } from "./git.js";
function parseBranch(header) {
    const value = header.replace(/^##\s*/, "");
    const aheadCount = /\bahead (\d+)\b/.exec(value);
    const behindCount = /\bbehind (\d+)\b/.exec(value);
    const nameAndUpstream = value.replace(/\s+\[.*\]$/, "");
    const [branch = "HEAD", upstream] = nameAndUpstream.split("...", 2);
    return {
        branch: branch === "HEAD (no branch)" ? "HEAD (detached)" : branch,
        ...(upstream ? { upstream } : {}),
        ahead: Number(aheadCount?.[1] ?? 0),
        behind: Number(behindCount?.[1] ?? 0)
    };
}
function parseStatus(output, repository) {
    const entries = output.split("\0");
    const branch = parseBranch(entries[0] ?? "## HEAD");
    const files = [];
    for (let index = 1; index < entries.length; index += 1) {
        const entry = entries[index];
        if (!entry || entry.length < 4)
            continue;
        const code = entry.slice(0, 2);
        const filePath = entry.slice(3);
        const renamed = code.includes("R") || code.includes("C");
        const originalPath = renamed ? entries[index + 1] : undefined;
        if (renamed)
            index += 1;
        files.push({
            path: filePath,
            ...(originalPath ? { originalPath } : {}),
            indexStatus: code[0] ?? " ",
            worktreeStatus: code[1] ?? " ",
            untracked: code === "??"
        });
    }
    if (files.length > MAX_GIT_STATUS_FILES) {
        throw new Error(`变更文件超过 ${MAX_GIT_STATUS_FILES} 个；请先缩小工作区变更范围`);
    }
    return { repository, ...branch, files };
}
export async function getGitWorkspaceStatus(repoPath) {
    const repository = await resolveGitRepositoryRoot(repoPath);
    const [output, stagedDiff] = await Promise.all([
        runGit(repository, ["status", "--porcelain=v1", "--branch", "-z", "--untracked-files=all"]),
        runGit(repository, ["--literal-pathspecs", "diff", "--cached", "--raw", "--no-abbrev", "--no-renames", "-z"])
    ]);
    const status = { ...parseStatus(output, repository), stagedFingerprint: createHash("sha256").update(stagedDiff).digest("hex") };
    if (Buffer.byteLength(JSON.stringify(status), "utf8") > MAX_GIT_STATUS_BYTES) {
        throw new Error(`Git 状态超过 ${MAX_GIT_STATUS_BYTES} 字节输出上限`);
    }
    return status;
}
function indexPaths(file) {
    return [file.path, file.originalPath].filter((path) => Boolean(path));
}
async function validateChangedPaths(repository, requested) {
    if (requested.length < 1 || requested.length > 50)
        throw new Error("每次操作必须选择 1 到 50 个变更路径");
    const status = await getGitWorkspaceStatus(repository);
    const files = requested.map((path) => {
        if (!path || path.includes("\0"))
            throw new Error("变更路径无效");
        const file = status.files.find((entry) => indexPaths(entry).includes(path));
        if (!file)
            throw new Error(`路径不在当前变更清单中：${path}`);
        return file;
    });
    const unique = [...new Map(files.map((file) => [file.path, file])).values()];
    for (const path of unique.flatMap(indexPaths)) {
        await rejectSymlinkSegments(repository, resolveInsideRoot(repository, path));
    }
    return unique;
}
export async function stageGitPaths(repoPath, requested) {
    const repository = await resolveGitRepositoryRoot(repoPath);
    const files = await validateChangedPaths(repository, requested);
    const paths = [...new Set(files.flatMap(indexPaths))];
    if (Buffer.byteLength(JSON.stringify(paths), "utf8") > MAX_GIT_ACTION_BYTES)
        throw new Error("暂存路径列表超过输出上限");
    await runGit(repository, ["--literal-pathspecs", "add", "-A", "--", ...paths]);
    return { repository, staged: paths };
}
export async function unstageGitPaths(repoPath, requested) {
    const repository = await resolveGitRepositoryRoot(repoPath);
    const files = await validateChangedPaths(repository, requested);
    const indexChanges = files.filter((file) => file.indexStatus !== " " && !file.untracked);
    if (!indexChanges.length)
        throw new Error("所选路径没有已暂存的变更");
    const paths = [...new Set(indexChanges.flatMap(indexPaths))];
    if (Buffer.byteLength(JSON.stringify(paths), "utf8") > MAX_GIT_ACTION_BYTES)
        throw new Error("撤销暂存路径列表超过输出上限");
    await runGit(repository, ["--literal-pathspecs", "restore", "--staged", "--", ...paths]);
    return { repository, unstaged: paths };
}
export async function commitGitIndex(repoPath, message, expectedPaths, expectedFingerprint) {
    if (!message.trim() || message.length > 1_000 || message.includes("\0")) {
        throw new Error("提交说明必须为 1 到 1,000 个字符");
    }
    if (!/^[a-f0-9]{64}$/.test(expectedFingerprint) || expectedPaths.length > MAX_GIT_STATUS_FILES) {
        throw new Error("提交预览状态无效，请刷新后重试");
    }
    const status = await getGitWorkspaceStatus(repoPath);
    const staged = status.files.filter((file) => file.indexStatus !== " " && !file.untracked);
    if (!staged.length)
        throw new Error("没有已暂存的变更可提交");
    const currentPaths = staged.map((file) => file.path).sort();
    const previewPaths = [...expectedPaths].sort();
    if (status.stagedFingerprint !== expectedFingerprint || JSON.stringify(currentPaths) !== JSON.stringify(previewPaths)) {
        throw new Error("暂存区在确认后发生变化；请刷新并重新检查提交范围");
    }
    if (Buffer.byteLength(JSON.stringify(currentPaths), "utf8") > MAX_GIT_ACTION_BYTES)
        throw new Error("提交文件清单超过输出上限");
    await runGit(status.repository, ["commit", "-m", message.trim()]);
    const commit = (await runGit(status.repository, ["rev-parse", "--short", "HEAD"])).trim();
    return { repository: status.repository, commit, message: message.trim(), files: staged.map((file) => file.path) };
}
