import { App, PostMessageTransport } from "@modelcontextprotocol/ext-apps";

interface ArchitectureNode {
  id: string;
  title: string;
  kind: "surface" | "skill" | "mcp-tool" | "boundary";
  summary: string;
  paths: string[];
  x: number;
  y: number;
}

interface ArchitectureEdge {
  from: string;
  to: string;
  label: string;
}

interface ArchitectureGraph {
  title: string;
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
}

interface Viewport {
  x: number;
  y: number;
  scale: number;
}

interface PointerDrag {
  pointerId: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  moved: boolean;
  nodeId: string | null;
}

interface CanvasTheme {
  accent: string;
  edge: string;
  edgeLabel: string;
  gridDot: string;
  node: string;
  nodeBorder: string;
  nodeCopy: string;
  nodeSelected: string;
  nodeShadow: string;
  nodeShadowActive: string;
  foreground: string;
}

const NODE_WIDTH = 248;
const NODE_HEIGHT = 122;
const NODE_COLUMN_GAP = 88;
const NODE_CLEARANCE = 20;
const VERTICAL_SPACING_SCALE = 1.08;
const MIN_SCALE = 0.34;
const MAX_SCALE = 1.8;
const graph = readGraph();
applySpaciousLayerLayout();
const canvas = document.querySelector<HTMLCanvasElement>("#architecture-canvas");
const context = canvas?.getContext("2d");
const viewport: Viewport = { x: 0, y: 0, scale: 0.8 };
const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
let selectedNode = graph.nodes.find((node) => node.id === "vibe-code") ?? graph.nodes[0];
let drag: PointerDrag | null = null;
let hostCanMessage = false;
let canvasTheme = readCanvasTheme();
let lastCanvasSize: { width: number; height: number } | null = null;
const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resizeCanvas);

const app = new App({ name: "Vibe Coding Assistant Architecture Canvas", version: "0.2.4" }, {});

function readGraph(): ArchitectureGraph {
  const source = document.querySelector<HTMLScriptElement>("#architecture-data")?.textContent ?? "{}";
  return JSON.parse(source) as ArchitectureGraph;
}

function applySpaciousLayerLayout(): void {
  const columns = new Map<number, ArchitectureNode[]>();
  for (const node of graph.nodes) {
    const column = columns.get(node.x) ?? [];
    column.push(node);
    columns.set(node.x, column);
  }
  const layers = [...columns.entries()]
    .sort(([leftX], [rightX]) => leftX - rightX)
    .map(([, nodes]) => nodes);
  layers.forEach((nodes, columnIndex) => {
    nodes.sort((left, right) => left.y - right.y);
    nodes.forEach((node) => {
      node.x = 64 + columnIndex * (NODE_WIDTH + NODE_COLUMN_GAP);
      node.y = 64 + node.y * VERTICAL_SPACING_SCALE;
    });
  });
}

function getElement<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`缺少画布元素：${selector}`);
  return element;
}

function readCanvasTheme(): CanvasTheme {
  const styles = getComputedStyle(document.documentElement);
  const read = (name: string) => styles.getPropertyValue(name).trim();
  return {
    accent: read("--accent"),
    edge: read("--canvas-edge"),
    edgeLabel: read("--canvas-edge-label"),
    gridDot: read("--canvas-dot"),
    node: read("--node-surface"),
    nodeBorder: read("--node-border"),
    nodeCopy: read("--node-copy"),
    nodeSelected: read("--node-selected"),
    nodeShadow: read("--node-shadow"),
    nodeShadowActive: read("--node-shadow-active"),
    foreground: read("--foreground")
  };
}

function setStatus(message: string, tone: "normal" | "warning" | "error" = "normal"): void {
  const status = getElement<HTMLParagraphElement>("#request-status");
  status.textContent = message;
  status.dataset.tone = tone;
}

function setConnection(connected: boolean, message: string): void {
  const state = getElement<HTMLSpanElement>("#connection-state");
  state.dataset.connected = String(connected);
  const label = state.querySelector("span");
  if (label) label.textContent = message;
}

async function connectHost(): Promise<void> {
  try {
    await app.connect(new PostMessageTransport(window.parent, window.parent));
    hostCanMessage = Boolean(app.getHostCapabilities()?.message?.text);
    setConnection(true, hostCanMessage ? "可发送到对话" : "当前 host 仅支持查看");
    getElement<HTMLButtonElement>("#submit-request").disabled = !hostCanMessage;
    updateDisplayModeButton();
    if (!hostCanMessage) setStatus("当前客户端未提供消息桥接；可复制请求后粘贴到对话。", "warning");
  } catch {
    setConnection(false, "未连接到 MCP Apps host");
    setStatus("无法连接客户端消息桥接。请求仍可复制到对话中。", "warning");
  }
}

function updateDisplayModeButton(): void {
  const button = getElement<HTMLButtonElement>("#toggle-display-mode");
  const modes = app.getHostContext()?.availableDisplayModes ?? [];
  button.hidden = !modes.includes("fullscreen");
  button.textContent = app.getHostContext()?.displayMode === "fullscreen" ? "返回对话" : "展开画布";
}

async function toggleDisplayMode(): Promise<void> {
  const current = app.getHostContext()?.displayMode;
  const target = current === "fullscreen" ? "inline" : "fullscreen";
  if (!app.getHostContext()?.availableDisplayModes?.includes(target)) return;
  try {
    await app.requestDisplayMode({ mode: target });
    updateDisplayModeButton();
  } catch {
    setStatus("客户端没有切换显示模式；仍可继续使用当前画布。", "warning");
  }
}

function updateDetailsToggle(): void {
  const workspace = getElement<HTMLElement>("#canvas-workspace");
  const button = getElement<HTMLButtonElement>("#toggle-details");
  const collapsed = workspace.classList.contains("is-detail-hidden");
  const expanded = !collapsed;
  const action = expanded ? "收起详情侧栏" : "显示详情侧栏";
  button.setAttribute("aria-expanded", String(expanded));
  button.setAttribute("aria-label", action);
  button.title = action;
  getElement<HTMLSpanElement>("#detail-toggle-label").textContent = expanded ? "收起详情" : "显示详情";
  getElement<HTMLSpanElement>("#details-toggle-icon").textContent = expanded ? "‹" : "›";
}

function toggleDetails(): void {
  getElement<HTMLElement>("#canvas-workspace").classList.toggle("is-detail-hidden");
  updateDetailsToggle();
  requestAnimationFrame(resizeCanvas);
}

function kindLabel(kind: ArchitectureNode["kind"]): string {
  const labels = { surface: "交互界面", skill: "Codex Skill", "mcp-tool": "本地 MCP 工具", boundary: "模块边界" };
  return labels[kind];
}

function fillNodeChoices(): void {
  const list = getElement<HTMLDivElement>("#capability-list");
  for (const node of graph.nodes) {
    const button = document.createElement("button");
    button.className = "node-choice";
    button.type = "button";
    button.textContent = node.title;
    button.setAttribute("aria-pressed", String(node.id === selectedNode?.id));
    button.addEventListener("click", () => selectNode(node));
    list.append(button);
  }
}

function updateNodeDetails(): void {
  if (!selectedNode) return;
  const kind = getElement<HTMLSpanElement>("#node-kind");
  kind.textContent = kindLabel(selectedNode.kind);
  kind.dataset.kind = selectedNode.kind;
  getElement<HTMLHeadingElement>("#node-title").textContent = selectedNode.title;
  getElement<HTMLParagraphElement>("#node-summary").textContent = selectedNode.summary;
  const paths = getElement<HTMLUListElement>("#node-paths");
  paths.replaceChildren(...selectedNode.paths.map((path) => {
    const item = document.createElement("li");
    item.textContent = path;
    return item;
  }));
  for (const button of document.querySelectorAll<HTMLButtonElement>(".node-choice")) {
    button.setAttribute("aria-pressed", String(button.textContent === selectedNode.title));
  }
}

function selectNode(node: ArchitectureNode): void {
  selectedNode = node;
  updateNodeDetails();
  draw();
}

function canvasSize(): { width: number; height: number } {
  const rect = canvas!.getBoundingClientRect();
  return { width: rect.width, height: rect.height };
}

function resizeCanvas(): void {
  const ratio = Math.max(1, window.devicePixelRatio || 1);
  const { width, height } = canvasSize();
  if (lastCanvasSize) {
    viewport.x += (width - lastCanvasSize.width) / 2;
    viewport.y += (height - lastCanvasSize.height) / 2;
  }
  lastCanvasSize = { width, height };
  canvas!.width = Math.floor(width * ratio);
  canvas!.height = Math.floor(height * ratio);
  context!.setTransform(ratio, 0, 0, ratio, 0, 0);
  draw();
}

function drawGrid(width: number, height: number): void {
  const ctx = context!;
  const spacing = 34 * viewport.scale;
  const offsetX = ((viewport.x % spacing) + spacing) % spacing;
  const offsetY = ((viewport.y % spacing) + spacing) % spacing;
  ctx.save();
  ctx.fillStyle = canvasTheme.gridDot;
  for (let x = offsetX; x < width; x += spacing) {
    for (let y = offsetY; y < height; y += spacing) ctx.fillRect(x, y, 1.2, 1.2);
  }
  ctx.restore();
}

function drawEdge(edge: ArchitectureEdge): void {
  const from = nodeById.get(edge.from);
  const to = nodeById.get(edge.to);
  if (!from || !to) return;
  const deltaX = to.x + NODE_WIDTH / 2 - from.x - NODE_WIDTH / 2;
  const deltaY = to.y + NODE_HEIGHT / 2 - from.y - NODE_HEIGHT / 2;
  const horizontal = Math.abs(deltaX) >= Math.abs(deltaY);
  const sign = horizontal ? Math.sign(deltaX) || 1 : Math.sign(deltaY) || 1;
  const startX = horizontal ? from.x + (sign > 0 ? NODE_WIDTH : 0) : from.x + NODE_WIDTH / 2;
  const startY = horizontal ? from.y + NODE_HEIGHT / 2 : from.y + (sign > 0 ? NODE_HEIGHT : 0);
  const endX = horizontal ? to.x + (sign > 0 ? 0 : NODE_WIDTH) : to.x + NODE_WIDTH / 2;
  const endY = horizontal ? to.y + NODE_HEIGHT / 2 : to.y + (sign > 0 ? 0 : NODE_HEIGHT);
  const gap = Math.abs(horizontal ? endX - startX : endY - startY);
  const bend = Math.min(120, Math.max(18, gap * 0.42));
  const controlOneX = horizontal ? startX + sign * bend : startX;
  const controlOneY = horizontal ? startY : startY + sign * bend;
  const controlTwoX = horizontal ? endX - sign * bend : endX;
  const controlTwoY = horizontal ? endY : endY - sign * bend;
  const ctx = context!;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.bezierCurveTo(controlOneX, controlOneY, controlTwoX, controlTwoY, endX, endY);
  ctx.strokeStyle = canvasTheme.edge;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  const angle = Math.atan2(endY - controlTwoY, endX - controlTwoX);
  ctx.fillStyle = canvasTheme.edge;
  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(endX - 9 * Math.cos(angle - 0.45), endY - 9 * Math.sin(angle - 0.45));
  ctx.lineTo(endX - 9 * Math.cos(angle + 0.45), endY - 9 * Math.sin(angle + 0.45));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = canvasTheme.edgeLabel;
  ctx.font = '400 11px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = "center";
  ctx.fillText(edge.label, (startX + endX) / 2, (startY + endY) / 2 - 8);
}

function drawNode(node: ArchitectureNode): void {
  const ctx = context!;
  const active = node.id === selectedNode?.id;
  ctx.save();
  ctx.shadowColor = active ? canvasTheme.nodeShadowActive : canvasTheme.nodeShadow;
  ctx.shadowBlur = active ? 17 : 10;
  ctx.shadowOffsetY = 4;
  ctx.beginPath();
  ctx.roundRect(node.x, node.y, NODE_WIDTH, NODE_HEIGHT, 13);
  ctx.fillStyle = active ? canvasTheme.nodeSelected : canvasTheme.node;
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.lineWidth = active ? 2 : 1;
  ctx.strokeStyle = active ? canvasTheme.accent : canvasTheme.nodeBorder;
  ctx.stroke();
  ctx.fillStyle = canvasTheme.accent;
  ctx.beginPath();
  ctx.roundRect(node.x + 13, node.y + 14, 4, 24, 2);
  ctx.fill();
  ctx.textAlign = "left";
  ctx.fillStyle = canvasTheme.foreground;
  ctx.font = '600 15px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
  ctx.fillText(node.title, node.x + 27, node.y + 31, NODE_WIDTH - 40);
  ctx.fillStyle = canvasTheme.nodeCopy;
  ctx.font = '400 11px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
  wrapText(node.summary, node.x + 16, node.y + 57, NODE_WIDTH - 30, 16, 2);
  ctx.fillStyle = canvasTheme.accent;
  ctx.font = '600 10px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
  ctx.fillText(kindLabel(node.kind), node.x + 16, node.y + NODE_HEIGHT - 13);
  ctx.restore();
}

function wrapText(text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number): void {
  const ctx = context!;
  const words = text.split("");
  let line = "";
  let lineIndex = 0;
  for (const character of words) {
    const next = line + character;
    if (ctx.measureText(next).width > maxWidth && line) {
      ctx.fillText(line, x, y + lineIndex * lineHeight);
      line = character;
      lineIndex += 1;
      if (lineIndex >= maxLines) break;
    } else {
      line = next;
    }
  }
  if (lineIndex < maxLines && line) ctx.fillText(line, x, y + lineIndex * lineHeight, maxWidth);
}

function draw(): void {
  if (!context || !canvas) return;
  const { width, height } = canvasSize();
  context.clearRect(0, 0, width, height);
  drawGrid(width, height);
  context.save();
  context.translate(viewport.x, viewport.y);
  context.scale(viewport.scale, viewport.scale);
  graph.edges.forEach(drawEdge);
  graph.nodes.forEach(drawNode);
  context.restore();
  getElement<HTMLSpanElement>("#zoom-level").textContent = `${Math.round(viewport.scale * 100)}%`;
}

function fitCanvas(): void {
  const { width, height } = canvasSize();
  const minX = Math.min(...graph.nodes.map((node) => node.x));
  const minY = Math.min(...graph.nodes.map((node) => node.y));
  const maxX = Math.max(...graph.nodes.map((node) => node.x + NODE_WIDTH));
  const maxY = Math.max(...graph.nodes.map((node) => node.y + NODE_HEIGHT));
  const scale = Math.min((width - 90) / (maxX - minX), (height - 90) / (maxY - minY), 1);
  viewport.scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));
  viewport.x = (width - (maxX - minX) * viewport.scale) / 2 - minX * viewport.scale;
  viewport.y = (height - (maxY - minY) * viewport.scale) / 2 - minY * viewport.scale;
  draw();
}

function zoomAt(factor: number, clientX?: number, clientY?: number): void {
  const { width, height } = canvasSize();
  const anchorX = clientX ?? width / 2;
  const anchorY = clientY ?? height / 2;
  const nextScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, viewport.scale * factor));
  const ratio = nextScale / viewport.scale;
  viewport.x = anchorX - (anchorX - viewport.x) * ratio;
  viewport.y = anchorY - (anchorY - viewport.y) * ratio;
  viewport.scale = nextScale;
  draw();
}

function nodeAt(clientX: number, clientY: number): ArchitectureNode | undefined {
  const rect = canvas!.getBoundingClientRect();
  const x = (clientX - rect.left - viewport.x) / viewport.scale;
  const y = (clientY - rect.top - viewport.y) / viewport.scale;
  return [...graph.nodes].reverse().find((node) =>
    x >= node.x && x <= node.x + NODE_WIDTH && y >= node.y && y <= node.y + NODE_HEIGHT
  );
}

function collidesWithNode(nodeId: string, x: number, y: number): boolean {
  return graph.nodes.some((other) => other.id !== nodeId &&
    x < other.x + NODE_WIDTH + NODE_CLEARANCE &&
    x + NODE_WIDTH + NODE_CLEARANCE > other.x &&
    y < other.y + NODE_HEIGHT + NODE_CLEARANCE &&
    y + NODE_HEIGHT + NODE_CLEARANCE > other.y
  );
}

function moveNode(node: ArchitectureNode, dx: number, dy: number): void {
  const nextX = node.x + dx;
  const nextY = node.y + dy;
  if (!collidesWithNode(node.id, nextX, nextY)) {
    node.x = nextX;
    node.y = nextY;
    return;
  }
  if (!collidesWithNode(node.id, nextX, node.y)) node.x = nextX;
  if (!collidesWithNode(node.id, node.x, nextY)) node.y = nextY;
}

function onPointerDown(event: PointerEvent): void {
  if (event.button !== 0) return;
  const node = nodeAt(event.clientX, event.clientY);
  drag = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    lastX: event.clientX,
    lastY: event.clientY,
    moved: false,
    nodeId: node?.id ?? null
  };
  canvas!.setPointerCapture(event.pointerId);
}

function onPointerMove(event: PointerEvent): void {
  if (!drag || drag.pointerId !== event.pointerId) {
    return;
  }
  const dx = event.clientX - drag.lastX;
  const dy = event.clientY - drag.lastY;
  drag.moved ||= Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 4;
  if (drag.nodeId) {
    const node = nodeById.get(drag.nodeId);
    if (node) moveNode(node, dx / viewport.scale, dy / viewport.scale);
    canvas!.classList.add("is-moving-node");
  } else {
    viewport.x += dx;
    viewport.y += dy;
    canvas!.classList.add("is-panning");
  }
  drag.lastX = event.clientX;
  drag.lastY = event.clientY;
  canvas!.style.cursor = "grabbing";
  draw();
}

function onPointerUp(event: PointerEvent): void {
  if (!drag || drag.pointerId !== event.pointerId) return;
  const wasClick = !drag.moved;
  const draggedNode = drag.nodeId ? nodeById.get(drag.nodeId) : undefined;
  drag = null;
  canvas!.classList.remove("is-panning");
  canvas!.classList.remove("is-moving-node");
  canvas!.style.cursor = "";
  if (draggedNode) {
    selectNode(draggedNode);
  } else if (wasClick) {
    const node = nodeAt(event.clientX, event.clientY);
    if (node) selectNode(node);
  }
}

function onWheel(event: WheelEvent): void {
  event.preventDefault();
  const rect = canvas!.getBoundingClientRect();
  zoomAt(event.deltaY < 0 ? 1.1 : 0.9, event.clientX - rect.left, event.clientY - rect.top);
}

function followupMessage(node: ArchitectureNode, request: string): string {
  const quoted = request.trim().split("\n").map((line) => `> ${line}`).join("\n");
  return [
    "请使用 $vibe-code 调整当前插件中我从架构画布选中的能力。",
    `能力：${node.title}（${node.id}）`,
    `相关文件：${node.paths.join("、")}`,
    "我的调整要求：",
    quoted,
    "请先读取这些文件并确认变更范围；按现有规划、实现与审查约定推进。若需求本身存在关键歧义，再先向我说明。"
  ].join("\n\n");
}

async function submitRequest(): Promise<void> {
  const request = getElement<HTMLTextAreaElement>("#change-request").value.trim();
  if (!selectedNode || !request) {
    setStatus("先选择一项能力并写下具体调整要求。", "warning");
    return;
  }
  if (!hostCanMessage) {
    setStatus("当前 host 不支持发送消息；请使用“复制请求”再粘贴到对话。", "warning");
    return;
  }
  try {
    const result = await app.sendMessage({ role: "user", content: [{ type: "text", text: followupMessage(selectedNode, request) }] });
    if (result.isError) throw new Error("host 拒绝了这条消息");
    setStatus("调整请求已发送到对话；代码仍由现有工作流处理。", "normal");
  } catch (error) {
    setStatus(`发送失败：${error instanceof Error ? error.message : String(error)}。草稿仍保留，可复制后粘贴。`, "error");
  }
}

async function copyRequest(): Promise<void> {
  const request = getElement<HTMLTextAreaElement>("#change-request").value.trim();
  if (!selectedNode || !request) {
    setStatus("先选择一项能力并写下具体调整要求。", "warning");
    return;
  }
  const message = followupMessage(selectedNode, request);
  try {
    await navigator.clipboard.writeText(message);
    setStatus("完整调整请求已复制，可以粘贴到对话。", "normal");
  } catch {
    getElement<HTMLTextAreaElement>("#change-request").value = message;
    getElement<HTMLTextAreaElement>("#change-request").select();
    setStatus("自动复制不可用；请求已选中，请手动复制。", "warning");
  }
}

function bindControls(): void {
  canvas!.addEventListener("pointerdown", onPointerDown);
  canvas!.addEventListener("pointermove", onPointerMove);
  canvas!.addEventListener("pointerup", onPointerUp);
  canvas!.addEventListener("pointercancel", onPointerUp);
  canvas!.addEventListener("wheel", onWheel, { passive: false });
  getElement<HTMLButtonElement>("#zoom-in").addEventListener("click", () => zoomAt(1.18));
  getElement<HTMLButtonElement>("#zoom-out").addEventListener("click", () => zoomAt(0.84));
  getElement<HTMLButtonElement>("#fit-canvas").addEventListener("click", fitCanvas);
  getElement<HTMLButtonElement>("#toggle-details").addEventListener("click", toggleDetails);
  getElement<HTMLButtonElement>("#toggle-display-mode").addEventListener("click", () => void toggleDisplayMode());
  getElement<HTMLButtonElement>("#submit-request").addEventListener("click", () => void submitRequest());
  getElement<HTMLButtonElement>("#copy-request").addEventListener("click", () => void copyRequest());
  window.addEventListener("resize", resizeCanvas);
  resizeObserver?.observe(getElement<HTMLElement>(".canvas-wrap"));
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    canvasTheme = readCanvasTheme();
    draw();
  });
}

app.onhostcontextchanged = updateDisplayModeButton;

if (canvas && context && graph.nodes.length > 0) {
  fillNodeChoices();
  updateNodeDetails();
  bindControls();
  resizeCanvas();
  fitCanvas();
  void connectHost();
} else {
  setStatus("架构数据为空，无法显示画布。", "error");
}
