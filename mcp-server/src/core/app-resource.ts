import { readFile } from "node:fs/promises";
import { MAX_ARCHITECTURE_UI_BYTES } from "../shared/limits.js";

export async function readBundledAppHtml(
  templateUrl: URL,
  bundleUrl: URL,
  scriptName: string,
  titleMarker: string
): Promise<string> {
  const [template, bundle] = await Promise.all([readFile(templateUrl, "utf8"), readFile(bundleUrl, "utf8")]);
  const marker = `<script type="module" src="./${scriptName}"></script>`;
  if (!template.includes(marker) || !template.includes(titleMarker)) throw new Error("MCP App 模板缺少必要标记");
  const html = template.replace(marker, () => `<script type="module">${bundle.replace(/<\/script/gi, "<\\/script")}</script>`);
  if (Buffer.byteLength(html, "utf8") > MAX_ARCHITECTURE_UI_BYTES) throw new Error("MCP App 资源超过大小上限");
  return html;
}
