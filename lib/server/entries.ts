import { decodeEntry, type Kind } from "@/lib/domain";
import { getStore } from "./store";
export async function publishedEntries(kind: Kind) {
  return (await (await getStore()).list(kind)).map(decodeEntry);
}
export async function publishedEntry(kind: Kind, slug: string) {
  const row = await (await getStore()).find(kind, slug);
  return row ? decodeEntry(row) : null;
}
