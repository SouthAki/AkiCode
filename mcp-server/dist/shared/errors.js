export function messageOf(error) {
    return error instanceof Error ? error.message : String(error);
}
export function successResult(value) {
    return {
        structuredContent: value,
        content: [{ type: "text", text: JSON.stringify(value, null, 2) }]
    };
}
export function failureResult(error) {
    return {
        isError: true,
        content: [{ type: "text", text: `操作失败：${messageOf(error)}` }]
    };
}
