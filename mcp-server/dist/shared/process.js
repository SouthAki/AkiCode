import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileAsync = promisify(execFile);
export async function runGit(root, args) {
    try {
        const result = await execFileAsync("git", ["-C", root, ...args], {
            encoding: "utf8",
            maxBuffer: 4_000_000,
            windowsHide: true
        });
        return result.stdout;
    }
    catch (error) {
        const details = error;
        const stderr = details.stderr?.toString().trim();
        if (details.code === "ENOENT")
            throw new Error("未找到 Git 可执行文件");
        throw new Error(stderr || details.message || "Git 命令执行失败");
    }
}
export function parseNullSeparatedPaths(output) {
    return output.split("\0").filter(Boolean);
}
