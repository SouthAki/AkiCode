import { randomUUID } from "node:crypto";
import { appendFile, lstat, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { MAX_ITERATION_OUTPUT_BYTES, MAX_ITERATION_RECORD_BYTES, MAX_LOCAL_EXCLUDE_BYTES } from "../shared/limits.js";
import { rejectSymlinkSegments, resolveInsideRoot, resolveRepositoryRoot } from "../shared/paths.js";
import { resolveGitRepositoryRoot } from "./git.js";
import { runGit } from "../shared/process.js";
function validateRecord(input) {
    const values = [input.title, input.summary, ...input.files, ...input.verification, ...input.followUps];
    if (values.some((value) => !value.trim() || value.includes("\0"))) {
        throw new Error("迭代记录字段不能为空或包含 NUL 字符");
    }
    if (input.title.length > 160 || input.summary.length > 5_000)
        throw new Error("标题或摘要超过长度限制");
    if (input.files.length > 40 || input.verification.length > 20 || input.followUps.length > 20) {
        throw new Error("迭代记录列表超过条数限制");
    }
    for (const item of [...input.files, ...input.verification, ...input.followUps]) {
        if (item.length > 600)
            throw new Error("迭代记录单项超过 600 字符");
    }
}
function formatRecord(input) {
    const section = (title, lines) => `## ${title}\n${lines.length ? lines.map((line) => `- ${line}`).join("\n") : "- 无"}`;
    return [
        `# ${input.title.trim()}`,
        `- 结果：${input.outcome}`,
        "",
        "## 摘要",
        input.summary.trim(),
        "",
        section("变更文件", input.files),
        "",
        section("验证", input.verification),
        "",
        section("后续事项", input.followUps)
    ].join("\n");
}
export async function addLocalGitExclude(repoPath, pattern) {
    if (!/^\/[A-Za-z0-9._/-]+\/$/.test(pattern) || pattern.includes(".."))
        throw new Error("Git exclude 规则格式无效");
    const requestedRoot = await resolveRepositoryRoot(repoPath);
    let root;
    try {
        root = await resolveGitRepositoryRoot(requestedRoot);
    }
    catch (error) {
        if (/not a git repository|未找到 Git 可执行文件/i.test(String(error)))
            return false;
        throw error;
    }
    const commonDirectory = await resolveRepositoryRoot(resolve(root, (await runGit(root, ["rev-parse", "--git-common-dir"])).trim()));
    const excludePath = resolve(commonDirectory, "info", "exclude");
    await rejectSymlinkSegments(commonDirectory, excludePath);
    await mkdir(dirname(excludePath), { recursive: true });
    await rejectSymlinkSegments(commonDirectory, excludePath);
    try {
        const info = await lstat(excludePath);
        if (info.isSymbolicLink() || !info.isFile())
            throw new Error("Git 私有 exclude 必须是普通文件");
        if (info.size > MAX_LOCAL_EXCLUDE_BYTES)
            throw new Error("Git 私有 exclude 文件过大，拒绝修改");
        const current = await readFile(excludePath, "utf8");
        if (current.split(/\r?\n/).includes(pattern))
            return true;
        const line = `${current.endsWith("\n") || !current ? "" : "\n"}${pattern}\n`;
        if (Buffer.byteLength(current, "utf8") + Buffer.byteLength(line, "utf8") > MAX_LOCAL_EXCLUDE_BYTES) {
            throw new Error("Git 私有 exclude 追加后会超过大小限制，拒绝修改");
        }
        await appendFile(excludePath, line, "utf8");
    }
    catch (error) {
        if (error.code !== "ENOENT")
            throw error;
        await writeFile(excludePath, `${pattern}\n`, { encoding: "utf8", flag: "wx" });
    }
    return true;
}
function newRecordName() {
    const timestamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
    return `${timestamp}-${randomUUID()}.md`;
}
export async function appendIterationRecord(input) {
    validateRecord(input);
    const root = await resolveRepositoryRoot(input.repoPath);
    const content = `${formatRecord(input)}\n`;
    if (Buffer.byteLength(content, "utf8") > MAX_ITERATION_RECORD_BYTES)
        throw new Error("迭代记录超过 20,000 字节");
    const gitExcluded = await addLocalGitExclude(root, "/.vibe/");
    const relativeDirectory = ".vibe/iterations";
    const directory = resolveInsideRoot(root, relativeDirectory);
    await rejectSymlinkSegments(root, directory);
    await mkdir(directory, { recursive: true });
    await rejectSymlinkSegments(root, directory);
    const relativePath = `${relativeDirectory}/${newRecordName()}`;
    const target = resolveInsideRoot(root, relativePath);
    await writeFile(target, content, { encoding: "utf8", flag: "wx" });
    return { repository: root, path: relativePath, gitExcluded };
}
async function readRecord(root, relativePath) {
    const target = resolveInsideRoot(root, relativePath);
    await rejectSymlinkSegments(root, target);
    const info = await lstat(target);
    if (!info.isFile() || info.size > MAX_ITERATION_RECORD_BYTES)
        throw new Error(`迭代记录无效或超限：${relativePath}`);
    return readFile(target, "utf8");
}
export async function readIterationJournal(repoPath, limit = 8) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 20)
        throw new Error("limit 必须在 1 到 20 之间");
    const root = await resolveRepositoryRoot(repoPath);
    const directory = resolveInsideRoot(root, ".vibe/iterations");
    await rejectSymlinkSegments(root, directory);
    let names;
    try {
        names = await readdir(directory);
    }
    catch (error) {
        if (error.code === "ENOENT")
            return { repository: root, records: [], truncated: false };
        throw error;
    }
    const records = names.filter((name) => /^\d{4}-\d{2}-\d{2}T.*-[0-9a-f-]{36}\.md$/.test(name)).sort().reverse();
    const selected = records.slice(0, limit);
    const result = [];
    let outputBytes = 0;
    for (const name of selected) {
        const path = `.vibe/iterations/${name}`;
        const content = await readRecord(root, path);
        const recordBytes = Buffer.byteLength(content, "utf8");
        if (outputBytes + recordBytes > MAX_ITERATION_OUTPUT_BYTES)
            break;
        result.push({ path, content });
        outputBytes += recordBytes;
    }
    return { repository: root, records: result, truncated: records.length > selected.length || result.length < selected.length };
}
