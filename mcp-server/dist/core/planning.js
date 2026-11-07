import { randomUUID } from "node:crypto";
import { lstat, mkdir, rename, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { rejectSymlinkSegments, resolveInsideRoot, resolveRepositoryRoot } from "../shared/paths.js";
import { MAX_PLAN_BYTES } from "../shared/limits.js";
function validatePlan(input) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.changeId) || input.changeId.length > 64) {
        throw new Error("changeId 必须是最多 64 字符的 kebab-case ID");
    }
    if (input.specs.length < 1 || input.specs.length > 20) {
        throw new Error("specs 数量必须在 1 到 20 之间");
    }
    const names = new Set();
    let totalBytes = 0;
    for (const spec of input.specs) {
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(spec.capability)) {
            throw new Error(`无效的 capability 名称：${spec.capability}`);
        }
        if (names.has(spec.capability))
            throw new Error(`重复的 capability：${spec.capability}`);
        names.add(spec.capability);
    }
    for (const [fileName, content] of planFiles(input)) {
        if (!content.trim())
            throw new Error(`${fileName} 内容不能为空`);
        if (content.split(/\r?\n/).length >= 1000) {
            throw new Error(`${fileName} 达到 1,000 行限制，请拆分规划内容`);
        }
        totalBytes += Buffer.byteLength(content, "utf8");
    }
    if (totalBytes > MAX_PLAN_BYTES)
        throw new Error(`规划总内容超过 ${MAX_PLAN_BYTES} 字节限制，请拆分变更`);
}
function planFiles(input) {
    return [
        ["proposal.md", input.proposal],
        ["design.md", input.design],
        ["tasks.md", input.tasks],
        ...input.specs.map((spec) => [`specs/${spec.capability}/spec.md`, spec.content])
    ];
}
async function ensureDoesNotExist(target) {
    try {
        await lstat(target);
    }
    catch (error) {
        if (error.code === "ENOENT")
            return;
        throw error;
    }
    throw new Error("目标变更目录已存在；为避免覆盖，未写入任何文件");
}
export async function createPlan(input) {
    validatePlan(input);
    const root = await resolveRepositoryRoot(input.repoPath);
    const changeRelative = `openspec/changes/${input.changeId}`;
    const target = resolveInsideRoot(root, changeRelative);
    const changesDirectory = resolveInsideRoot(root, "openspec/changes");
    await rejectSymlinkSegments(root, target);
    await ensureDoesNotExist(target);
    await mkdir(changesDirectory, { recursive: true });
    await rejectSymlinkSegments(root, target);
    const temporary = resolve(changesDirectory, `.${input.changeId}.${randomUUID()}.tmp`);
    await mkdir(temporary);
    try {
        for (const [filePath, content] of planFiles(input)) {
            const outputPath = resolve(temporary, filePath);
            await mkdir(resolve(outputPath, ".."), { recursive: true });
            await writeFile(outputPath, `${content.trimEnd()}\n`, { encoding: "utf8", flag: "wx" });
        }
        await ensureDoesNotExist(target);
        await rename(temporary, target);
    }
    catch (error) {
        await rm(temporary, { recursive: true, force: true });
        throw error;
    }
    return {
        repository: root,
        changeId: input.changeId,
        changeDirectory: changeRelative,
        files: planFiles(input).map(([filePath]) => `${changeRelative}/${filePath}`)
    };
}
