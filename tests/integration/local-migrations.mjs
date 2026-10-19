import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../", import.meta.url));
const temporary = mkdtempSync(path.join(tmpdir(), "ramtin-public-contact-"));
function run(args, state) {
  const r = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: "utf8",
    timeout: 60000,
    env: {
      ...process.env,
      PORTFOLIO_LOCAL_DB_PATH: state,
      WRANGLER_SEND_METRICS: "false",
      CLOUDFLARE_CF_FETCH_ENABLED: "false",
    },
  });
  assert.equal(r.status, 0, r.stderr || r.stdout || r.error?.message);
  return r.stdout;
}
function sql(command, state, file = false) {
  return JSON.parse(
    run(
      [
        "node_modules/wrangler/bin/wrangler.js",
        "d1",
        "execute",
        "DB",
        "--local",
        "--config",
        "dist/server/wrangler.json",
        "--persist-to",
        state,
        file ? "--file" : "--command",
        command,
        "--json",
      ],
      state,
    ),
  ).flatMap((r) => r.results ?? []);
}
try {
  const old = path.join(temporary, "old");
  sql("drizzle/0000_right_tyrannus.sql", old, true);
  sql("drizzle/0001_fluffy_moon_knight.sql", old, true);
  sql(
    "INSERT INTO inquiries(id,idempotencyKey,fingerprint,name,email,subject,message,status,createdAt,privateNotes,meetingNotes) VALUES ('legacy','key','fp','Client','client@example.com','Subject','Original','sent',1,'Private old note','Old meeting note')",
    old,
  );
  // A removed UI feature's table must remain untouched as well.
  sql(
    "CREATE TABLE meeting_invitations(id TEXT PRIMARY KEY, internalNotes TEXT); INSERT INTO meeting_invitations VALUES ('old-meeting','Private meeting')",
    old,
  );
  run(["scripts/local-database.mjs", "upgrade"], old);
  assert.equal(sql("PRAGMA table_info(inquiries)", old).length, 27);
  assert.deepEqual(
    sql(
      "SELECT message,privateNotes,meetingNotes,notificationPayload FROM inquiries WHERE id='legacy'",
      old,
    )[0],
    {
      message: "Original",
      privateNotes: "Private old note",
      meetingNotes: "Old meeting note",
      notificationPayload: "",
    },
  );
  assert.equal(
    sql(
      "SELECT internalNotes FROM meeting_invitations WHERE id='old-meeting'",
      old,
    )[0].internalNotes,
    "Private meeting",
  );
  assert.match(
    run(["scripts/local-database.mjs", "upgrade"], old),
    /already current/,
  );
  const fresh = path.join(temporary, "fresh");
  run(["scripts/local-database.mjs", "init"], fresh);
  assert.equal(sql("PRAGMA table_info(inquiries)", fresh).length, 27);
  assert.match(
    run(["scripts/local-database.mjs", "init"], fresh),
    /already current/,
  );
  console.log(
    "PASS: real Wrangler fresh/repeated initialization and old/repeated upgrade; original contact fields/private notes and pre-existing meeting table retained. Disposable databases only.",
  );
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
