import { listTextFiles, readTextFile } from "./filesystem.js";
import { MAX_READ_RESULT_BYTES, MAX_SEARCH_FILES, MAX_SEARCH_RESULTS } from "../shared/limits.js";
import { resolveRepositoryRoot } from "../shared/paths.js";
export async function searchRepository(repoPath, query, pathPrefix = "", requestedLimit = 30) {
    if (!query.trim())
        throw new Error("query 不能为空");
    const root = await resolveRepositoryRoot(repoPath);
    const inventory = await listTextFiles(root, MAX_SEARCH_FILES + 1);
    const files = inventory.paths.filter((file) => !pathPrefix || file.startsWith(pathPrefix));
    const limit = Math.min(Math.max(requestedLimit, 1), MAX_SEARCH_RESULTS);
    const needle = query.toLocaleLowerCase();
    const matches = [];
    let totalMatches = 0;
    let scannedFiles = 0;
    let skippedFiles = 0;
    for (const file of files.slice(0, MAX_SEARCH_FILES)) {
        scannedFiles += 1;
        let content;
        try {
            content = await readTextFile(root, file);
        }
        catch {
            skippedFiles += 1;
            continue;
        }
        const lines = content.split(/\r?\n/);
        for (let index = 0; index < lines.length; index += 1) {
            const line = lines[index] ?? "";
            if (!line.toLocaleLowerCase().includes(needle))
                continue;
            totalMatches += 1;
            if (matches.length < limit) {
                matches.push({ path: file, line: index + 1, excerpt: line.trim().slice(0, 240) });
            }
        }
    }
    return {
        query,
        pathPrefix: pathPrefix || null,
        scannedFiles,
        skippedFiles,
        scanTruncated: inventory.truncated || files.length > MAX_SEARCH_FILES,
        totalMatches,
        resultsTruncated: totalMatches > matches.length,
        matches
    };
}
export async function readRepositoryFile(repoPath, filePath, startLine = 1, requestedLineCount = 200) {
    const root = await resolveRepositoryRoot(repoPath);
    const sourceText = await readTextFile(root, filePath);
    const lines = sourceText.split(/\r?\n/);
    const start = Math.max(1, Math.floor(startLine));
    const count = Math.min(Math.max(Math.floor(requestedLineCount), 1), 500);
    const selected = lines.slice(start - 1, start - 1 + count);
    let rendered = selected.map((line, offset) => `${start + offset}: ${line}`).join("\n");
    const byteLimited = Buffer.byteLength(rendered, "utf8") > MAX_READ_RESULT_BYTES;
    if (byteLimited)
        rendered = Buffer.from(rendered, "utf8").subarray(0, MAX_READ_RESULT_BYTES).toString("utf8");
    return {
        path: filePath,
        startLine: start,
        totalLines: lines.length,
        truncated: byteLimited || start - 1 + selected.length < lines.length,
        content: byteLimited ? `${rendered}\n[输出已达读取上限]` : rendered
    };
}
