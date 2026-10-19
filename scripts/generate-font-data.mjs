import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

// Reproducible server-only snapshot: the hosted static gateway does not retain
// font MIME overrides. The read-only font route serves these exact source bytes.
const data = {};
for (const name of ["manrope-latin.woff2", "vazirmatn-arabic.woff2"]) {
  const file = readFileSync(
    new URL("../public/fonts/" + name, import.meta.url),
  );
  data[name] = {
    base64: file.toString("base64"),
    sha256: createHash("sha256").update(file).digest("hex"),
  };
}
writeFileSync(
  new URL("../lib/server/font-data.json", import.meta.url),
  JSON.stringify(data, null, 2) + "\n",
);
