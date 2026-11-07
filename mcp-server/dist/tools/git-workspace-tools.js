import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import { commitGitIndex, getGitWorkspaceStatus, stageGitPaths, unstageGitPaths } from "../core/git-workspace.js";
import { readBundledAppHtml } from "../core/app-resource.js";
import { readGitDiff } from "../core/git.js";
import { failureResult, successResult } from "../shared/errors.js";
const resourceUri = "ui://vibe-coding-assistant/git-workspace-v1.html";
const bundleUrl = new URL("../ui/git-workspace.js", import.meta.url);
const templateUrl = new URL("../ui/git-workspace.html", import.meta.url);
const statusOutput = z.object({
    repository: z.string(),
    branch: z.string(),
    upstream: z.string().optional(),
    ahead: z.number(),
    behind: z.number(),
    stagedFingerprint: z.string(),
    files: z.array(z.object({
        path: z.string(),
        originalPath: z.string().optional(),
        indexStatus: z.string(),
        worktreeStatus: z.string(),
        untracked: z.boolean()
    })).max(500)
});
export function registerGitWorkspaceTools(server) {
    registerGitWorkspaceResource(server);
    registerGitReadTools(server);
    registerGitMutationTools(server);
    registerGitWorkspaceApp(server);
}
function registerGitWorkspaceResource(server) {
    registerAppResource(server, "Git 工作区", resourceUri, { description: "查看本地变更、Diff，并由用户明确控制暂存和提交。" }, async () => {
        const html = await readBundledAppHtml(templateUrl, bundleUrl, "git-workspace.js", "Git 工作区");
        return { contents: [{ uri: resourceUri, mimeType: RESOURCE_MIME_TYPE, text: html, _meta: { ui: { prefersBorder: true, csp: {} } } }] };
    });
}
function registerGitReadTools(server) {
    server.registerTool("vibe_git_get_status", {
        title: "读取 Git 工作区状态",
        description: "读取当前分支、远端差异和 staged/unstaged/untracked 文件；只读。",
        inputSchema: { repoPath: z.string().min(1) },
        outputSchema: statusOutput,
        annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }
    }, async ({ repoPath }) => {
        try {
            return successResult(await getGitWorkspaceStatus(repoPath));
        }
        catch (error) {
            return failureResult(error);
        }
    });
    server.registerTool("vibe_git_read_file_diff", {
        title: "读取 Git 文件 Diff",
        description: "读取当前工作区中指定变更文件的有界 Diff；只读。",
        inputSchema: { repoPath: z.string().min(1), filePath: z.string().min(1) },
        outputSchema: z.object({ repository: z.string(), path: z.string(), scope: z.literal("working-tree"), diff: z.string(), truncated: z.boolean() }),
        annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }
    }, async ({ repoPath, filePath }) => {
        try {
            return successResult(await readGitDiff(repoPath, filePath, "working-tree"));
        }
        catch (error) {
            return failureResult(error);
        }
    });
}
function registerGitMutationTools(server) {
    server.registerTool("vibe_git_stage_paths", {
        title: "暂存变更文件",
        description: "仅暂存当前 Git 状态中列出的仓库内变更路径；不提交。",
        inputSchema: { repoPath: z.string().min(1), paths: z.array(z.string().min(1).max(4_096)).min(1).max(50) },
        outputSchema: z.object({ repository: z.string(), staged: z.array(z.string()) }),
        annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false }
    }, async ({ repoPath, paths }) => {
        try {
            return successResult(await stageGitPaths(repoPath, paths));
        }
        catch (error) {
            return failureResult(error);
        }
    });
    server.registerTool("vibe_git_unstage_paths", {
        title: "撤销暂存变更",
        description: "将当前已暂存的所选变更从 index 撤出；保留工作区文件内容。",
        inputSchema: { repoPath: z.string().min(1), paths: z.array(z.string().min(1).max(4_096)).min(1).max(50) },
        outputSchema: z.object({ repository: z.string(), unstaged: z.array(z.string()) }),
        annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false }
    }, async ({ repoPath, paths }) => {
        try {
            return successResult(await unstageGitPaths(repoPath, paths));
        }
        catch (error) {
            return failureResult(error);
        }
    });
    server.registerTool("vibe_git_commit", {
        title: "提交已暂存变更",
        description: "在本地提交当前 index 中的所有变更；不会 push 到远端。",
        inputSchema: {
            repoPath: z.string().min(1),
            message: z.string().min(1).max(1_000),
            expectedPaths: z.array(z.string().min(1).max(4_096)).max(500),
            expectedFingerprint: z.string().regex(/^[a-f0-9]{64}$/)
        },
        outputSchema: z.object({ repository: z.string(), commit: z.string(), message: z.string(), files: z.array(z.string()) }),
        annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false }
    }, async ({ repoPath, message, expectedPaths, expectedFingerprint }) => {
        try {
            return successResult(await commitGitIndex(repoPath, message, expectedPaths, expectedFingerprint));
        }
        catch (error) {
            return failureResult(error);
        }
    });
}
function registerGitWorkspaceApp(server) {
    registerAppTool(server, "vibe_open_git_workspace", {
        title: "打开 Git 工作区",
        description: "在 MCP Apps 界面浏览仓库状态、查看 Diff、暂存/撤销暂存并提交；不会 push。",
        inputSchema: z.object({ repoPath: z.string().min(1) }),
        outputSchema: statusOutput,
        annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
        _meta: { ui: { resourceUri } }
    }, async ({ repoPath }) => {
        try {
            return successResult(await getGitWorkspaceStatus(repoPath));
        }
        catch (error) {
            return failureResult(error);
        }
    });
}
