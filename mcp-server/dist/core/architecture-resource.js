import { MAX_ARCHITECTURE_UI_BYTES } from "../shared/limits.js";
const TEMPLATE_MARKER = '<script id="architecture-data" type="application/json"></script>';
const BUNDLE_MARKER = '<script type="module" src="./architecture-canvas.js"></script>';
const ICON_MARKER = '<img class="brand-icon" src="/assets/icon.svg" alt="" aria-hidden="true" />';
export function renderArchitectureResource(template, bundle, icon, graph) {
    assertWithinLimit(template, "UI 模板");
    assertWithinLimit(bundle, "UI bundle");
    assertWithinLimit(icon, "图标");
    const safeData = escapeJsonForHtml(graph);
    const safeBundle = bundle.replace(/<\/script/gi, "<\\/script");
    const safeIcon = `data:image/svg+xml;base64,${Buffer.from(icon, "utf8").toString("base64")}`;
    const html = template
        .replace(ICON_MARKER, () => `<img class="brand-icon" src="${safeIcon}" alt="" aria-hidden="true" />`)
        .replace(TEMPLATE_MARKER, () => `<script id="architecture-data" type="application/json">${safeData}</script>`)
        .replace(BUNDLE_MARKER, () => `<script type="module">${safeBundle}</script>`);
    assertWithinLimit(html, "MCP App 资源");
    if (html.includes(ICON_MARKER) || html.includes(TEMPLATE_MARKER) || html.includes(BUNDLE_MARKER) || !html.includes("Vibe Coding Assistant")) {
        throw new Error("MCP App 模板缺少必要占位符或页面标识");
    }
    return html;
}
function escapeJsonForHtml(graph) {
    return JSON.stringify(graph)
        .replace(/</g, "\\u003c")
        .replace(/>/g, "\\u003e")
        .replace(/&/g, "\\u0026")
        .replace(/\u2028/g, "\\u2028")
        .replace(/\u2029/g, "\\u2029");
}
function assertWithinLimit(value, label) {
    const bytes = Buffer.byteLength(value, "utf8");
    if (bytes > MAX_ARCHITECTURE_UI_BYTES) {
        throw new Error(`${label}超过 ${MAX_ARCHITECTURE_UI_BYTES} 字节限制`);
    }
}
