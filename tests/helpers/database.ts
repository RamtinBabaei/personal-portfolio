import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { withRuntime } from "@/lib/server/runtime";
import { getStore } from "@/lib/server/store";
export async function testDatabase() {
  const db = new DatabaseSync(":memory:");
  for (const file of readdirSync("drizzle")
    .filter((file) => file.endsWith(".sql"))
    .sort())
    db.exec(readFileSync("drizzle/" + file, "utf8"));
  const binding = {
    prepare(sql: string) {
      const statement = db.prepare(sql);
      let values: (string | number | null)[] = [];
      return {
        bind(...args: (string | number | null)[]) {
          values = args;
          return this;
        },
        async all() {
          return { results: statement.all(...values) };
        },
        async first() {
          return statement.get(...values) ?? null;
        },
        async run() {
          const result = statement.run(...values);
          return { meta: { changes: Number(result.changes) } };
        },
      };
    },
  } as unknown as D1Database;
  const store = await withRuntime({ DB: binding }, () => getStore());
  return { db, binding, store };
}
