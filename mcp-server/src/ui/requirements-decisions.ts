import { App, PostMessageTransport } from "@modelcontextprotocol/ext-apps";

interface RequirementQuestion {
  id: string;
  prompt: string;
  context: string;
  options: string[];
  recommended?: string;
  allowOther: boolean;
}

interface RequirementRequest {
  context: string;
  questions: RequirementQuestion[];
}

interface Decision {
  question: string;
  answer: string;
}

const app = new App({ name: "Vibe Requirement Decisions", version: "0.2.6" }, {});
let requestData: RequirementRequest | null = null;
let hostCanMessage = false;

function getElement<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`缺少需求决策界面元素：${selector}`);
  return element;
}

function setStatus(message: string, tone: "normal" | "warning" | "error" = "normal"): void {
  const status = getElement<HTMLParagraphElement>("#status");
  status.textContent = message;
  status.dataset.tone = tone;
}

function makeChoice(question: RequirementQuestion, value: string, labelText: string, recommended: boolean): HTMLLabelElement {
  const label = document.createElement("label");
  label.className = "choice";
  const input = document.createElement("input");
  input.type = "radio";
  input.name = `answer-${question.id}`;
  input.value = value;
  const text = document.createElement("span");
  const strong = document.createElement("strong");
  strong.textContent = labelText;
  text.append(strong);
  if (recommended) {
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = "建议";
    strong.append(badge);
  }
  label.append(input, text);
  return label;
}

function makeQuestionCard(question: RequirementQuestion): HTMLElement {
  const card = document.createElement("article");
  card.className = "question";
  const title = document.createElement("h2");
  title.textContent = question.prompt;
  card.append(title);
  if (question.context) {
    const context = document.createElement("p");
    context.textContent = question.context;
    card.append(context);
  }
  const choices = document.createElement("div");
  choices.className = "choices";
  for (const option of question.options) choices.append(makeChoice(question, option, option, option === question.recommended));
  choices.append(makeChoice(question, "__defer", "还没决定，需要继续讨论", false));
  if (question.allowOther) choices.append(makeChoice(question, "__other", "其他", false));
  card.append(choices);
  if (question.allowOther) {
    const other = document.createElement("textarea");
    other.className = "other-answer";
    other.dataset.otherFor = question.id;
    other.maxLength = 500;
    other.placeholder = "写下你的选择";
    card.append(other);
    for (const radio of card.querySelectorAll<HTMLInputElement>(`input[name="answer-${question.id}"]`)) {
      radio.addEventListener("change", () => other.classList.toggle("is-visible", radio.value === "__other" && radio.checked));
    }
  }
  return card;
}

function renderRequest(value: RequirementRequest): void {
  requestData = value;
  getElement<HTMLElement>("#request-context").textContent = value.context;
  const container = getElement<HTMLElement>("#questions");
  container.replaceChildren(...value.questions.map(makeQuestionCard));
  getElement<HTMLButtonElement>("#submit-answers").disabled = !hostCanMessage;
  getElement<HTMLButtonElement>("#copy-answers").disabled = false;
}

function isRequirementRequest(value: unknown): value is RequirementRequest {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<RequirementRequest>;
  return typeof candidate.context === "string" && Array.isArray(candidate.questions);
}

function readAnswers(): Decision[] {
  if (!requestData) return [];
  return requestData.questions.map((question) => {
    const selected = [...document.querySelectorAll<HTMLInputElement>(`input[name="answer-${question.id}"]`)].find((input) => input.checked);
    if (!selected) throw new Error(`请选择一个选项：${question.prompt}`);
    if (selected.value === "__defer") return { question: question.prompt, answer: "尚未决定，需要继续讨论" };
    if (selected.value === "__other") {
      const other = document.querySelector<HTMLTextAreaElement>(`textarea[data-other-for="${question.id}"]`);
      if (!other?.value.trim()) throw new Error(`请补充“其他”选项：${question.prompt}`);
      return { question: question.prompt, answer: `其他：${other.value.trim()}` };
    }
    return { question: question.prompt, answer: selected.value };
  });
}

function decisionMessage(): string {
  if (!requestData) throw new Error("需求问题尚未载入");
  const decisions = readAnswers().map((item) => `- ${item.question}\n  - 决策：${item.answer}`).join("\n");
  const extra = getElement<HTMLTextAreaElement>("#extra-context").value.trim();
  return [
    "需求澄清结果，请在当前对话继续处理。",
    `需求背景：\n${requestData.context}`,
    `用户决策：\n${decisions}`,
    extra ? `补充说明：\n${extra}` : "",
    "请以这些选择为约束。标记为未决定的内容继续询问我；确认范围后再按 `$vibe-plan` 与 `$vibe-code` 约定推进。"
  ].filter(Boolean).join("\n\n");
}

async function copyDecisions(): Promise<void> {
  try {
    const message = decisionMessage();
    await navigator.clipboard.writeText(message);
    setStatus("决策摘要已复制，可以粘贴到对话。", "normal");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "请先回答所有问题。", "warning");
  }
}

async function submitDecisions(): Promise<void> {
  try {
    if (!hostCanMessage) throw new Error("当前 Codex host 不支持消息桥，请复制决策摘要。");
    const result = await app.sendMessage({ role: "user", content: [{ type: "text", text: decisionMessage() }] });
    if (result.isError) throw new Error("host 未接受决策消息");
    setStatus("决策已发送到对话。", "normal");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), "error");
  }
}

function connectInput(): void {
  app.ontoolinput = (params) => {
    if (isRequirementRequest(params.arguments)) renderRequest(params.arguments);
  };
  app.ontoolresult = (params) => {
    if (isRequirementRequest(params.structuredContent)) renderRequest(params.structuredContent);
  };
}

async function connectHost(): Promise<void> {
  try {
    await app.connect(new PostMessageTransport(window.parent, window.parent));
    hostCanMessage = Boolean(app.getHostCapabilities()?.message?.text);
    getElement<HTMLElement>("#connection-state").textContent = hostCanMessage ? "已连接到 Codex" : "当前 host 仅支持查看和复制";
    getElement<HTMLButtonElement>("#submit-answers").disabled = !hostCanMessage;
    if (!hostCanMessage) setStatus("当前客户端未提供消息桥接；可复制决策摘要后粘贴到对话。", "warning");
  } catch {
    getElement<HTMLElement>("#connection-state").textContent = "未连接到 MCP Apps host";
    setStatus("连接失败；可尝试复制决策摘要。", "warning");
  }
}

connectInput();
getElement<HTMLButtonElement>("#copy-answers").addEventListener("click", () => void copyDecisions());
getElement<HTMLButtonElement>("#submit-answers").addEventListener("click", () => void submitDecisions());
void connectHost();
