import { lstat, readdir, readFile } from "node:fs/promises";
import { extname, relative, resolve, sep } from "node:path";
import { IGNORED_DIRECTORIES, MAX_FILE_BYTES, MAX_INDEX_FILES } from "../shared/limits.js";
import { rejectSymlinkSegments, resolveInsideRoot } from "../shared/paths.js";
const TEXT_EXTENSIONS = new Set([
    ".c", ".cc", ".cpp", ".cs", ".css", ".go", ".h", ".hpp", ".html",
    ".java", ".js", ".json", ".jsx", ".kt", ".md", ".mjs", ".php", ".py",
    ".rb", ".rs", ".sh", ".sql", ".svelte", ".swift", ".toml", ".ts",
    ".tsx", ".txt", ".vue", ".xml", ".yaml", ".yml"
]);
const TEXT_FILENAMES = new Set([
    ".editorconfig", ".gitignore", ".npmrc", "Dockerfile", "Makefile", "Justfile"
]);
function isTextCandidate(fileName) {
    return TEXT_FILENAMES.has(fileName) || TEXT_EXTENSIONS.has(extname(fileName).toLowerCase());
}
export async function listTextFiles(root, maxFiles = MAX_INDEX_FILES) {
    const paths = [];
    let truncated = false;
    async function visit(directory) {
        if (paths.length >= maxFiles) {
            truncated = true;
            return;
        }
        const entries = await readdir(directory, { withFileTypes: true });
        entries.sort((left, right) => left.name.localeCompare(right.name));
        for (const entry of entries) {
            if (paths.length >= maxFiles) {
                truncated = true;
                return;
            }
            if (entry.isSymbolicLink())
                continue;
            const absolute = resolve(directory, entry.name);
            if (entry.isDirectory()) {
                if (!IGNORED_DIRECTORIES.has(entry.name))
                    await visit(absolute);
                continue;
            }
            if (!entry.isFile() || !isTextCandidate(entry.name))
                continue;
            paths.push(relative(root, absolute).split(sep).join("/"));
        }
    }
    await visit(root);
    return { paths, truncated };
}
export async function readTextFile(root, relativePath) {
    const absolute = resolveInsideRoot(root, relativePath);
    await rejectSymlinkSegments(root, absolute);
    const info = await lstat(absolute);
    if (!info.isFile())
        throw new Error("目标路径不是普通文件");
    if (info.size > MAX_FILE_BYTES)
        throw new Error(`文件超过 ${MAX_FILE_BYTES} 字节读取上限`);
    const content = await readFile(absolute, "utf8");
    if (content.includes("\0"))
        throw new Error("目标文件包含二进制数据");
    return content;
}
