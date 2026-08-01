export function callMcp(
  url: string | undefined,
  tool: string,
  input: Record<string, unknown>,
  token: string | undefined,
): Promise<Record<string, unknown>>;
