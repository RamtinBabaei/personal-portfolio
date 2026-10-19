export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export function errorResponse(error: unknown) {
  if (error instanceof HttpError)
    return Response.json(
      { error: error.code, message: error.message },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
    );
  console.error(
    "Request failed",
    error instanceof Error ? error.name : "Unknown error",
  );
  return Response.json(
    { error: "INTERNAL_ERROR", message: "The request could not be completed." },
    { status: 500 },
  );
}
export function assertOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin)
    throw new HttpError(
      403,
      "ORIGIN_REJECTED",
      "A same-origin request is required.",
    );
}
export async function readJson(
  request: Request,
  max = 100000,
): Promise<unknown> {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new HttpError(415, "CONTENT_TYPE", "Send JSON data.");
  if (Number(request.headers.get("content-length") ?? 0) > max)
    throw new HttpError(413, "TOO_LARGE", "Request is too large.");
  const text = new TextDecoder().decode(await readBytes(request, max));
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "INVALID_JSON", "Invalid JSON body.");
  }
}
export async function readBytes(
  request: Request,
  max: number,
): Promise<Uint8Array> {
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      size += result.value.byteLength;
      if (size > max) {
        await reader.cancel();
        throw new HttpError(413, "TOO_LARGE", "Request is too large.");
      }
      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}
export async function digest(text: string) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(bytes), (v) =>
    v.toString(16).padStart(2, "0"),
  ).join("");
}
