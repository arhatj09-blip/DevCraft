function stringifyDetails(input) {
  if (!input) return undefined;
  if (typeof input === "string") return input;
  try {
    return JSON.stringify(input);
  } catch {
    return String(input);
  }
}

export function toErrorRoute({ code = "500", message, retry = true, details }) {
  const params = new URLSearchParams();
  params.set("code", String(code));
  if (message) params.set("message", message);
  params.set("retry", retry ? "true" : "false");

  const serialized = stringifyDetails(details);
  if (serialized) params.set("details", serialized);

  return `/error?${params.toString()}`;
}

export function mapApiErrorToRoute(error, fallbackMessage, options = {}) {
  const status =
    typeof error?.status === "number" && error.status >= 400 && error.status <= 599
      ? error.status
      : 500;

  const message = error?.message || fallbackMessage || "Unexpected API error";

  return toErrorRoute({
    code: status,
    message,
    retry: options.retry ?? true,
    details: options.details ?? error?.payload,
  });
}
