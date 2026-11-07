# Local MCP tools

A first-party stdio MCP server that gives the plugin stable local operations. Skills remain responsible for semantic repository explanations, requirement modeling, and review judgments.

## Tools

| Tool | Access | Purpose |
| --- | --- | --- |
| `vibe_repository_overview` | Read-only | Text-file inventory, project manifests, top-level modules, candidate entry points, and file-type counts. |
| `vibe_search_repository` | Read-only | Literal case-insensitive source search with relative paths and line numbers. |
| `vibe_read_repository_file` | Read-only | Bounded text file reads with line numbers. |
| `vibe_list_changed_files` | Read-only | Staged, unstaged, untracked, or explicit branch-range change inventory. |
| `vibe_read_git_diff` | Read-only | One file's exact Git Diff, including untracked files. |
| `vibe_create_openspec_plan` | Writes new files | Creates `proposal.md`, `design.md`, `tasks.md`, and capability specs under a new `openspec/changes/<id>/` directory. It refuses to replace an existing directory. |
| `vibe_open_architecture_canvas` | Read-only | Returns the plugin's bounded Skills/tool graph and links an MCP Apps canvas for inspection and user-directed follow-up requests. It never writes repository files. |

Repository, Git, and planning tools require an explicit `repoPath`; the architecture canvas has no repository-path input and serves only the plugin's built-in graph. Filesystem tools stay within the supplied root and reject symlink traversal. The server has no network client; Git is launched with argument arrays rather than a shell. Text, file-count, search-result, architecture, and Diff limits are centralized in `src/shared/limits.ts`.

## Build

```bash
pnpm install
pnpm run check:size
pnpm run typecheck
pnpm run build
```

The generated `dist/index.js` is the local MCP entry point referenced by the plugin's root `mcp.json`. The build also creates the browser bundle and copies the static canvas template under `dist/ui/`; the MCP resource inlines them without external network requests. Build after source changes. The server is intended for the Codex desktop local executor.

From this directory, `pnpm run package` builds the server and produces a self-contained plugin directory under the workspace `artifacts/` folder, including production dependencies for the local stdio server. The package contains only the runtime manifest and no development dependencies. The command refuses to replace an existing artifact.
