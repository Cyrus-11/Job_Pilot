import { ZodError } from "zod";

export function extractionDiagnostic(
  error: unknown,
  stage: string,
  operation: string = "Extraction",
) {
  const details = error && typeof error === "object" ? error : {};
  const scalar = (key: string): string | number | undefined => {
    const value = Reflect.get(details, key);
    return typeof value === "number" ||
      (typeof value === "string" && /^[a-zA-Z0-9_.-]{1,100}$/.test(value))
      ? value
      : undefined;
  };
  // Provider and validation messages can contain credentials or resume text.
  const message = error instanceof ZodError
    ? "Model response failed profile validation"
    : error instanceof SyntaxError
      ? "Model response was not valid JSON"
      : stage === "PDF parsing" && error instanceof Error
        ? error.message.replace(/sk-[\w-]+/g, "[redacted]").slice(0, 500)
        : `${operation} step failed; inspect status and code`;
  return {
    stage,
    name: scalar("name"),
    message,
    status: scalar("status") ?? scalar("statusCode"),
    code: scalar("code"),
    requestId: scalar("request_id"),
    issues: error instanceof ZodError
      ? error.issues.map((issue) => ({ path: issue.path, code: issue.code }))
      : undefined,
  };
}
