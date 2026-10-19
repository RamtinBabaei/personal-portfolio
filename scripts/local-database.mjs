import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = fileURLToPath(new URL("../", import.meta.url));
const mode = process.argv[2];
if (!["init", "upgrade"].includes(mode))
  throw new Error("Use local-database.mjs init or upgrade.");
const cli = path.join(root, "node_modules/wrangler/bin/wrangler.js");
const remote = process.argv.includes("--remote");
const config = remote
  ? "wrangler.production.json"
  : "dist/server/wrangler.json";
if (remote) {
  const deployment = JSON.parse(readFileSync(path.join(root, config), "utf8"));
  if (
    !deployment.d1_databases?.find(
      (d) =>
        d.binding === "DB" &&
        d.database_id !== "00000000-0000-4000-8000-000000000000",
    )
  )
    throw new Error(
      "Prepare an explicit production database configuration first.",
    );
  console.log(
    "Applying additive schema changes to the explicitly configured REMOTE database. Existing records are retained.",
  );
}
const base = [
  "d1",
  "execute",
  "DB",
  remote ? "--remote" : "--local",
  "--config",
  config,
  ...(remote
    ? []
    : [
        "--persist-to",
        process.env.PORTFOLIO_LOCAL_DB_PATH || ".wrangler/state",
      ]),
];

function execute(args, json = false) {
  const result = spawnSync(
    process.execPath,
    [cli, ...base, ...args, ...(json ? ["--json"] : [])],
    {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
    },
  );
  if (result.status !== 0) {
    process.stderr.write(
      result.stderr ||
        "Local database command failed. Build the project first.\n",
    );
    process.exit(result.status || 1);
  }
  if (!json) return;
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error(
      "Could not inspect local database schema. No migration was applied.",
    );
  }
}
const info = execute(["--command", "PRAGMA table_info(inquiries)"], true);
let columns = info
  .flatMap((item) => item.results ?? [])
  .map((column) => column.name);
if (!columns.length) {
  if (mode !== "init")
    throw new Error(
      "No local inquiry table exists. For a new installation, run pnpm db:local:init.",
    );
  execute(["--file", "drizzle/0000_right_tyrannus.sql"]);
  columns = [
    "id",
    "idempotencyKey",
    "fingerprint",
    "name",
    "email",
    "subject",
    "message",
    "status",
    "createdAt",
    "providerId",
  ];
}
const migration = "drizzle/0001_fluffy_moon_knight.sql";
const sql = readFileSync(path.join(root, migration), "utf8");
const additions = [...sql.matchAll(/ALTER TABLE \S+ ADD (\S+) /g)].map(
  (match) => match[1].slice(1, -1),
);
if (additions.length !== 16)
  throw new Error("Unexpected inquiry migration. No changes were applied.");
const present = additions.filter((column) => columns.includes(column));
if (present.length === additions.length)
  console.log(
    "Local inquiry schema is already current. Existing data was retained.",
  );
else if (present.length)
  throw new Error(
    "Partial local migration detected. Back up .wrangler/state and inspect the schema before retrying.",
  );
else {
  execute(["--file", migration]);
  console.log(
    "Local inquiry workflow migration applied. Existing data was retained.",
  );
}

// Additive upgrade; legacy workflow/meeting tables are intentionally retained.
const current = execute(["--command", "PRAGMA table_info(inquiries)"], true)
  .flatMap((item) => item.results ?? [])
  .map((c) => c.name);
if (!current.includes("notificationPayload")) {
  execute(["--file", "drizzle/0002_contact_email_snapshot.sql"]);
  console.log("Email snapshot migration applied. Existing records retained.");
} else
  console.log(
    "Email snapshot schema is already current. Existing records retained.",
  );
