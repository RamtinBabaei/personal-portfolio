import { parseEnv } from "node:util";
import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
const target = new URL("../.dev.vars", import.meta.url);
try {
  const template = await readFile(
    new URL("../.dev.vars.example", import.meta.url),
    "utf8",
  );
  await writeFile(
    target,
    template
      .replace(
        "replace-with-a-long-random-local-value",
        randomBytes(32).toString("hex"),
      )
      .replace(
        "ADMIN_PASSWORD=",
        "ADMIN_PASSWORD=" + randomBytes(32).toString("hex"),
      )
      .replace(
        "CRON_SECRET=",
        "CRON_SECRET=" + randomBytes(32).toString("hex"),
      ),
    { flag: "wx", mode: 0o600 },
  );
  console.log("Created .dev.vars with a random local rate-limit salt.");
} catch (error) {
  if (error.code !== "EEXIST") throw error;
  console.log(
    "Preserved existing .dev.vars values; checking missing local defaults.",
  );
}
console.log(
  "Set RESEND_API_KEY and CONTACT_FROM in .dev.vars, then restart the server.",
);
console.log(
  "Contact recipient is fixed server-side: ramtin.babaei2002@gmail.com",
);

const existing = parseEnv(await readFile(target, "utf8"));
const additions = [];
for (const [key, value] of Object.entries({
  ADMIN_AUTH_MODE: "basic",
  ADMIN_USERNAME: "ramtin",
  ADMIN_PASSWORD: randomBytes(32).toString("hex"),
  CRON_SECRET: randomBytes(32).toString("hex"),
  CONTACT_RATE_LIMIT_PER_HOUR: "100",
})) {
  if (existing[key] === undefined || !existing[key].trim())
    additions.push(key + "=" + value);
}
if (additions.length)
  await writeFile(
    target,
    (await readFile(target, "utf8")) +
      "\n# Added local dashboard and automatic retry settings\n" +
      additions.join("\n") +
      "\n",
    { mode: 0o600 },
  );
console.log(
  "Private dashboard credentials are in .dev.vars. Automatic retries run with the dev server. Never share this file.",
);
