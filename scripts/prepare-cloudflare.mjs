import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname, relative } from "node:path";
const [worker, databaseId, databaseName, bucketName, siteUrl] =
  process.argv.slice(2);
if (
  !worker ||
  !databaseName ||
  !bucketName ||
  !/^[0-9a-f-]{36}$/i.test(databaseId || "") ||
  databaseId === "00000000-0000-4000-8000-000000000000" ||
  !siteUrl ||
  new URL(siteUrl).protocol !== "https:"
)
  throw new Error(
    "Usage: node scripts/prepare-cloudflare.mjs WORKER_NAME D1_ID D1_NAME R2_NAME https://your-domain.com",
  );
const built = resolve("dist/server/wrangler.json");
const config = JSON.parse(await readFile(built, "utf8"));
config.name = worker;
config.main = relative(process.cwd(), resolve(dirname(built), config.main));
config.assets = {
  ...config.assets,
  directory: relative(
    process.cwd(),
    resolve(dirname(built), config.assets.directory),
  ),
};
config.d1_databases = [
  {
    binding: "DB",
    database_id: databaseId,
    database_name: databaseName,
    migrations_dir: "drizzle",
  },
];
config.r2_buckets = [{ binding: "BUCKET", bucket_name: bucketName }];
config.triggers = { crons: ["* * * * *"] };
config.vars = {
  SITE_URL: new URL(siteUrl).origin,
  ADMIN_AUTH_MODE: "basic",
  ADMIN_USERNAME: "ramtin",
  CONTACT_RATE_LIMIT_PER_HOUR: "5",
};
delete config.topLevelName;
await writeFile(
  "wrangler.production.json",
  JSON.stringify(config, null, 2) + "\n",
);
console.log(
  "Prepared wrangler.production.json. Configure server secrets before deployment. No deployment was performed.",
);
