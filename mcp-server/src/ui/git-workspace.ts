import { App, PostMessageTransport } from "@modelcontextprotocol/ext-apps";

interface GitFile {
  path: string;
  originalPath?: string;
  indexStatus: string;
  worktreeStatus: string;
  untracked: boolean;
}

interface GitStatus {
  repository: string;
  branch: string;
  upstream?: string;
  ahead: number;
  behind: number;
  stagedFingerprint: string;
  files: GitFile[];
}

interface ToolResult {
  isError?: boolean;
  structuredContent?: unknown;
  content?: Array<{ type?: string; text?: string }>;
}

const app = new App({ name: "Vibe Git Workspace", version: "0.2.6" }, {});
let repositoryPath = "";
let currentStatus: GitStatus | null = null;
let selectedPaths = new Set<string>();
let selectedFile = "";

function getElement<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`缺少 Git 工作区界面元素：${selector}`);
  return element;
}

function setStatus(message: string, tone: "normal" | "warning" | "error" = "normal"): void {
  const status = getElement<HTMLParagraphElement>("#status");
  status.textContent = message;
  status.dataset.tone = tone;
}

function errorText(result: ToolResult): string {
  return result.content?.find((block) => block.type === "text")?.text ?? "MCP 工具调用失败";
}

async function callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
  const result = await app.callServerTool({ name, arguments: args }) as ToolResult;
  if (result.isError) throw new Error(errorText(result));
  return result;
}

function statusLabel(file: GitFile): string {
  const labels: string[] = [];
  if (file.indexStatus !== " " && !file.untracked) labels.push("已暂存");
  if (file.untracked) labels.push("未跟踪");
  else if (file.worktreeStatus !== " ") labels.push("未暂存");
  return labels.join(" · ") || "已变更";
}

function makeFileRow(file: GitFile): HTMLLIElement {
  const row = document.createElement("li");
  row.className = "file-row";
  row.dataset.selected = String(file.path === selectedFile);
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = selectedPaths.has(file.path);
  checkbox.setAttribute("aria-label", `选择 ${file.path}`);
  checkbox.addEventListener("change", () => {
    if (checkbox.checked) selectedPaths.add(file.path);
    else selectedPaths.delete(file.path);
    updateActions();
  });
  const name = document.createElement("button");
  name.className = "file-name";
  name.type = "button";
  name.textContent = file.originalPath ? `${file.path} ← ${file.originalPath}` : file.path;
  name.addEventListener("click", () => void selectFile(file.path));
  const status = document.createElement("span");
  status.className = "file-status";
  status.textContent = statusLabel(file);
  row.append(checkbox, name, status);
  return row;
}

function updateActions(): void {
  const selected = currentStatus?.files.filter((file) => selectedPaths.has(file.path)) ?? [];
  const staged = currentStatus?.files.some((file) => file.indexStatus !== " " && !file.untracked) ?? false;
  const stagedCount = currentStatus?.files.filter((file) => file.indexStatus !== " " && !file.untracked).length ?? 0;
  getElement<HTMLButtonElement>("#stage-selected").disabled = !repositoryPath || selected.length === 0;
  getElement<HTMLButtonElement>("#unstage-selected").disabled = !repositoryPath || !selected.some((file) => file.indexStatus !== " " && !file.untracked);
  getElement<HTMLButtonElement>("#review-commit").disabled = !repositoryPath || !staged;
  getElement<HTMLButtonElement>("#confirm-commit").disabled = !stagedCount || !getElement<HTMLTextAreaElement>("#commit-message").value.trim();
}

function renderStatus(status: GitStatus): void {
  currentStatus = status;
  repositoryPath = status.repository;
  selectedPaths = new Set([...selectedPaths].filter((path) => status.files.some((file) => file.path === path)));
  getElement<HTMLElement>("#repository-path").textContent = status.repository;
  getElement<HTMLElement>("#branch-name").textContent = status.branch;
  const aheadBehind = [status.ahead ? `↑ ${status.ahead}` : "", status.behind ? `↓ ${status.behind}` : ""].filter(Boolean).join("  ");
  getElement<HTMLElement>("#ahead-behind").textContent = status.upstream ? `${status.upstream}${aheadBehind ? ` · ${aheadBehind}` : ""}` : "无上游分支";
  getElement<HTMLElement>("#file-count").textContent = `${status.files.length} 项变更`;
  getElement<HTMLUListElement>("#file-list").replaceChildren(...status.files.map(makeFileRow));
  if (!status.files.length) getElement<HTMLElement>("#diff-output").textContent = "工作区干净，没有待查看的变更。";
  updateActions();
}

async function refreshStatus(): Promise<void> {
  if (!repositoryPath) return;
  try {
    const result = await callTool("vibe_git_get_status", { repoPath: repositoryPath });
    renderStatus(result.structuredContent as GitStatus);
    setStatus("状态已刷新。", "normal");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), "error");
  }
}

async function selectFile(path: string): Promise<void> {
  if (!repositoryPath) return;
  selectedFile = path;
  getElement<HTMLElement>("#diff-title").textContent = path;
  getElement<HTMLElement>("#diff-output").textContent = "读取 Diff…";
  if (currentStatus) getElement<HTMLUListElement>("#file-list").replaceChildren(...currentStatus.files.map(makeFileRow));
  try {
    const result = await callTool("vibe_git_read_file_diff", { repoPath: repositoryPath, filePath: path });
    const diff = result.structuredContent as { diff: string; truncated: boolean };
    getElement<HTMLElement>("#diff-output").textContent = `${diff.diff}${diff.truncated ? "\n\n[Diff 已截断]" : ""}`;
  } catch (error) {
    getElement<HTMLElement>("#diff-output").textContent = error instanceof Error ? error.message : String(error);
  }
}

async function mutateSelection(tool: string, verb: string): Promise<void> {
  const paths = [...selectedPaths];
  if (!repositoryPath || !paths.length) return;
  try {
    await callTool(tool, { repoPath: repositoryPath, paths });
    selectedPaths.clear();
    await refreshStatus();
    setStatus(`${paths.length} 个选中项已${verb}。`, "normal");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), "error");
  }
}

function beginCommitReview(): void {
  if (!currentStatus) return;
  const staged = currentStatus.files.filter((file) => file.indexStatus !== " " && !file.untracked);
  if (!staged.length) {
    getElement<HTMLElement>("#commit-panel").hidden = true;
    setStatus("暂存区已没有可提交的变更。", "warning");
    return;
  }
  const names = staged.map((file) => `• ${file.path}`).join("\n");
  getElement<HTMLElement>("#commit-summary").textContent = `${staged.length} 个已暂存文件将写入本地提交：\n${names}`;
  getElement<HTMLElement>("#commit-panel").hidden = false;
  getElement<HTMLTextAreaElement>("#commit-message").focus();
  updateActions();
}

async function confirmCommit(): Promise<void> {
  if (!currentStatus || !repositoryPath) return;
  const message = getElement<HTMLTextAreaElement>("#commit-message").value.trim();
  const expectedPaths = currentStatus.files.filter((file) => file.indexStatus !== " " && !file.untracked).map((file) => file.path);
  if (!message || !expectedPaths.length) return;
  try {
    const result = await callTool("vibe_git_commit", {
      repoPath: repositoryPath,
      message,
      expectedPaths,
      expectedFingerprint: currentStatus.stagedFingerprint
    });
    const commit = result.structuredContent as { commit: string };
    getElement<HTMLTextAreaElement>("#commit-message").value = "";
    getElement<HTMLElement>("#commit-panel").hidden = true;
    await refreshStatus();
    setStatus(`已创建本地提交 ${commit.commit}。没有推送到远端。`, "normal");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await refreshStatus();
    beginCommitReview();
    setStatus(message, "error");
  }
}

function bindEvents(): void {
  getElement<HTMLButtonElement>("#refresh").addEventListener("click", () => void refreshStatus());
  getElement<HTMLButtonElement>("#stage-selected").addEventListener("click", () => void mutateSelection("vibe_git_stage_paths", "暂存"));
  getElement<HTMLButtonElement>("#unstage-selected").addEventListener("click", () => void mutateSelection("vibe_git_unstage_paths", "撤销暂存"));
  getElement<HTMLButtonElement>("#review-commit").addEventListener("click", beginCommitReview);
  getElement<HTMLButtonElement>("#cancel-commit").addEventListener("click", () => { getElement<HTMLElement>("#commit-panel").hidden = true; });
  getElement<HTMLButtonElement>("#confirm-commit").addEventListener("click", () => void confirmCommit());
  getElement<HTMLTextAreaElement>("#commit-message").addEventListener("input", updateActions);
}

function connectInput(): void {
  app.ontoolinput = (params) => {
    const args = params.arguments as { repoPath?: unknown } | undefined;
    if (typeof args?.repoPath === "string") repositoryPath = args.repoPath;
  };
  app.ontoolresult = (params) => {
    const result = params.structuredContent as GitStatus | undefined;
    if (result?.repository && Array.isArray(result.files)) renderStatus(result);
  };
}

async function connectHost(): Promise<void> {
  try {
    await app.connect(new PostMessageTransport(window.parent, window.parent));
    getElement<HTMLElement>("#branch-name").textContent = "已连接";
    if (repositoryPath) await refreshStatus();
  } catch {
    setStatus("无法连接到 MCP Apps host；请从 Git 工作区工具重新打开。", "error");
  }
}

connectInput();
bindEvents();
void connectHost();
