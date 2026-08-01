const PATTERNS: RegExp[] = [
  /\bBearer\s+[A-Za-z0-9._~+\/-]+=*/giu,
  /\b(?:authorization|cookie|set-cookie|x-api-key|api[_-]?key|token)\s*[:=]\s*[^\s,;]+/giu,
];

export function redact(value: string): string {
  return PATTERNS.reduce((result, pattern) => result.replace(pattern, "[REDACTED]"), value);
}
