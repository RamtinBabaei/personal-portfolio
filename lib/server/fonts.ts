import fontData from "./font-data.json";

const decoded = new Map<string, ArrayBuffer>();
/** Only the two bundled, licensed fonts are addressable; no file or URL input. */
export function fontResponse(name: string, ifNoneMatch: string | null = null) {
  if (!Object.prototype.hasOwnProperty.call(fontData, name))
    return new Response("Not found", { status: 404 });
  const font = fontData[name as keyof typeof fontData];
  const headers = {
    "Content-Type": "font/woff2",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "public, max-age=86400",
    ETag: '"' + font.sha256 + '"',
  };
  if (ifNoneMatch === headers.ETag)
    return new Response(null, { status: 304, headers });
  let bytes = decoded.get(name);
  if (!bytes) {
    bytes = Uint8Array.from(atob(font.base64), (character) =>
      character.charCodeAt(0),
    ).buffer;
    decoded.set(name, bytes);
  }
  return new Response(bytes, { headers });
}
