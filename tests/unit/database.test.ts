import { describe, it, expect } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { testDatabase } from "../helpers/database";
import { blankEntry, encodeEntry } from "@/lib/domain";
describe("retained published content and private delivery storage", () => {
  it("keeps draft content/media private without an administrator fallback", async () => {
    const { db, store } = await testDatabase();
    try {
      const row = encodeEntry({
        ...blankEntry(),
        slug: "fixture",
        cover: "/api/media/aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
      });
      db.prepare(
        "INSERT INTO entries (id,kind,slug,status,featured,sortOrder,data,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?)",
      ).run(
        row.id,
        row.kind,
        row.slug,
        row.status,
        row.featured,
        row.sortOrder,
        row.data,
        row.createdAt,
        row.updatedAt,
      );
      expect(await store.list("project")).toHaveLength(0);
      expect(await store.find("project", "fixture")).toBeNull();
      expect(await store.isMediaPublic(JSON.parse(row.data).cover)).toBe(false);
      db.prepare("UPDATE entries SET status='published' WHERE id=?").run(
        row.id,
      );
      expect(await store.list("project")).toHaveLength(1);
      expect((await store.find("project", "fixture"))?.id).toBe(row.id);
      expect(await store.isMediaPublic(JSON.parse(row.data).cover)).toBe(true);
      expect("save" in store).toBe(false);
      expect("updateInquiry" in store).toBe(true);
      expect("queryInquiries" in store).toBe(true);
    } finally {
      db.close();
    }
  });
  it("increments and expires rate buckets atomically", async () => {
    const { db, store } = await testDatabase();
    try {
      expect(await store.consumeRate("fixture", 1000, 100)).toBe(1);
      expect(await store.consumeRate("fixture", 1050, 100)).toBe(2);
      expect(await store.consumeRate("fixture", 1100, 100)).toBe(1);
    } finally {
      db.close();
    }
  });
  it("adds only the email snapshot column and preserves all legacy rows/notes", () => {
    const db = new DatabaseSync(":memory:");
    try {
      db.exec(readFileSync("drizzle/0000_right_tyrannus.sql", "utf8"));
      db.exec(readFileSync("drizzle/0001_fluffy_moon_knight.sql", "utf8"));
      db.prepare(
        "INSERT INTO inquiries(id,idempotencyKey,fingerprint,name,email,subject,message,status,createdAt,privateNotes,meetingNotes) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
      ).run(
        "legacy",
        "key",
        "fp",
        "Client",
        "client@example.com",
        "Subject",
        "Original",
        "failed",
        1,
        "Private old note",
        "Meeting old note",
      );
      db.exec(readFileSync("drizzle/0002_contact_email_snapshot.sql", "utf8"));
      expect(
        db
          .prepare(
            "SELECT privateNotes,meetingNotes,message,notificationPayload FROM inquiries",
          )
          .get(),
      ).toMatchObject({
        privateNotes: "Private old note",
        meetingNotes: "Meeting old note",
        message: "Original",
        notificationPayload: "",
      });
      expect(db.prepare("PRAGMA table_info(inquiries)").all()).toHaveLength(27);
    } finally {
      db.close();
    }
  });
});
