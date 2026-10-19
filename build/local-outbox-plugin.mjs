import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseEnv } from "node:util";

export function startOutboxLoop({
  origin,
  secret,
  requester = fetch,
  intervalMs = 60000,
  report = console.warn,
}) {
  let busy = false;
  let stopped = false;
  const tick = async () => {
    if (busy || stopped) return;
    busy = true;
    try {
      const response = await requester(
        new URL("/api/internal/contact-outbox", origin),
        {
          method: "POST",
          headers: { Authorization: "Bearer " + secret },
          signal: AbortSignal.timeout(115000),
        },
      );
      if (!response.ok)
        report("Local automatic email retry deferred; HTTP " + response.status);
      await response.body?.cancel();
    } catch {
      if (!stopped)
        report("Local automatic email retry is temporarily unavailable.");
    } finally {
      busy = false;
    }
  };
  const timer = setInterval(() => void tick(), intervalMs);
  timer.unref?.();
  return {
    tick,
    stop() {
      stopped = true;
      clearInterval(timer);
    },
  };
}
export function localOutbox() {
  let enabled = false;
  let loop;
  return {
    name: "portfolio-local-outbox",
    configResolved(config) {
      enabled = config.command === "serve";
    },
    async configureServer(server) {
      if (!enabled || !server.httpServer) return;
      let config;
      try {
        config = parseEnv(
          await readFile(join(server.config.root, ".dev.vars"), "utf8"),
        );
      } catch {
        return;
      }
      if (!config.CRON_SECRET || config.CRON_SECRET.length < 32) {
        server.config.logger.warn(
          "Run pnpm setup:local to enable automatic local email retries.",
        );
        return;
      }
      const begin = () => {
        const address = server.httpServer.address();
        if (
          !address ||
          typeof address === "string" ||
          server.config.server.https
        )
          return;
        loop = startOutboxLoop({
          origin: "http://127.0.0.1:" + address.port,
          secret: config.CRON_SECRET,
        });
        server.config.logger.info(
          "Contact notifications: immediate send + automatic local retries.",
        );
      };
      server.httpServer.once("listening", begin);
      server.httpServer.once("close", () => loop?.stop());
    },
  };
}
