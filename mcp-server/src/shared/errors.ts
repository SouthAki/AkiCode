export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function successResult<T>(value: T) {
  return {
    structuredContent: value,
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }]
  };
}

export function failureResult(error: unknown) {
  return {
    isError: true,
    content: [{ type: "text" as const, text: `操作失败：${messageOf(error)}` }]
  };
}
