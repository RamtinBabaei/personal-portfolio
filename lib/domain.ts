import type { InquiryWorkflow } from "./contact-record";
import { z } from "zod";
import { contactFieldsSchema, serviceSelectionSchema } from "./contact";

export const locales = ["en", "fa"] as const;
export type Locale = (typeof locales)[number];
export function isLocale(value: string): value is Locale {
  return value === "en" || value === "fa";
}
export type Kind = "project";
export const categories = ["frontend", "backend", "fullstack"] as const;
const safeUrl = z.union([
  z.literal(""),
  z
    .string()
    .url()
    .max(500)
    .refine((v) => /^https:\/\//i.test(v), "Use an HTTPS URL"),
]);
const imagePath = z.union([
  z.literal(""),
  z.string().regex(/^\/api\/media\/[0-9a-f-]{36}$/),
]);
const translation = z.object({
  title: z.string().trim().max(120),
  summary: z.string().trim().max(500),
  body: z.string().trim().max(30000),
  role: z.string().trim().max(160),
  challenge: z.string().trim().max(3000),
  solution: z.string().trim().max(3000),
  outcome: z.string().trim().max(3000),
  alt: z.string().trim().max(300),
});
export const entrySchema = z
  .object({
    kind: z.literal("project"),
    slug: z
      .string()
      .min(2)
      .max(100)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    status: z.enum(["draft", "published", "archived"]),
    category: z.enum(categories),
    projectType: z.enum(["personal", "practice", "academic", "client"]),
    year: z.number().int().min(2000).max(2100),
    featured: z.boolean(),
    sortOrder: z.number().int().min(0).max(9999),
    technologies: z.array(z.string().trim().min(1).max(40)).max(20),
    cover: imagePath,
    gallery: z.array(imagePath.refine(Boolean)).max(8),
    liveUrl: safeUrl,
    githubUrl: safeUrl,
    en: translation,
    fa: translation,
  })
  .superRefine((entry, ctx) => {
    if (entry.status === "published") {
      for (const locale of locales) {
        if (entry[locale].title.length < 2)
          ctx.addIssue({
            code: "custom",
            path: [locale, "title"],
            message: "A published entry needs a title in both languages",
          });
        if (entry[locale].summary.length < 10)
          ctx.addIssue({
            code: "custom",
            path: [locale, "summary"],
            message: "Add a summary in both languages before publishing",
          });
        if ((entry.cover || entry.gallery.length > 0) && !entry[locale].alt)
          ctx.addIssue({
            code: "custom",
            path: [locale, "alt"],
            message: "Add image alt text in both languages",
          });
      }
    }
  });
export type EntryInput = z.infer<typeof entrySchema>;
export type Entry = EntryInput & {
  id: string;
  createdAt: number;
  updatedAt: number;
};
export type WorkCard = Pick<
  Entry,
  "id" | "slug" | "category" | "cover" | "year" | "technologies"
> & {
  en: Pick<Entry["en"], "title" | "summary" | "alt">;
  fa: Pick<Entry["fa"], "title" | "summary" | "alt">;
};
export function toWorkCards(entries: Entry[]): WorkCard[] {
  return entries.map((e) => ({
    id: e.id,
    slug: e.slug,
    category: e.category,
    cover: e.cover,
    year: e.year,
    technologies: e.technologies.slice(0, 4),
    en: { title: e.en.title, summary: e.en.summary, alt: e.en.alt },
    fa: { title: e.fa.title, summary: e.fa.summary, alt: e.fa.alt },
  }));
}
export interface EntryRow {
  id: string;
  kind: Kind;
  slug: string;
  status: string;
  featured: number;
  sortOrder: number;
  data: string;
  createdAt: number;
  updatedAt: number;
}
export function decodeEntry(row: EntryRow): Entry {
  return {
    ...entrySchema.parse(JSON.parse(row.data)),
    id: row.id,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
export function encodeEntry(
  input: EntryInput,
  id = crypto.randomUUID(),
  createdAt = Date.now(),
): EntryRow {
  return {
    id,
    kind: input.kind,
    slug: input.slug,
    status: input.status,
    featured: Number(input.featured),
    sortOrder: input.sortOrder,
    data: JSON.stringify(input),
    createdAt,
    updatedAt: Date.now(),
  };
}
export const blankTranslation = {
  title: "",
  summary: "",
  body: "",
  role: "",
  challenge: "",
  solution: "",
  outcome: "",
  alt: "",
};
export function blankEntry(kind: Kind = "project"): EntryInput {
  return {
    kind,
    slug: "",
    status: "draft",
    category: "fullstack",
    projectType: "personal",
    year: new Date().getFullYear(),
    featured: false,
    sortOrder: 0,
    technologies: [],
    cover: "",
    gallery: [],
    liveUrl: "",
    githubUrl: "",
    en: { ...blankTranslation },
    fa: { ...blankTranslation },
  };
}
export const contactSchema = contactFieldsSchema
  .extend({
    company: contactFieldsSchema.shape.company.default(""),
    services: serviceSelectionSchema,
    budget: contactFieldsSchema.shape.budget.default("undecided"),
    website: contactFieldsSchema.shape.website.default(""),
    subject: z
      .string()
      .trim()
      .min(3)
      .max(160)
      .refine((value) => !/[\r\n]/.test(value)),
    idempotencyKey: z.string().uuid(),
    startedAt: z.number().finite().positive(),
  })
  .strict();
export type ContactInput = z.infer<typeof contactSchema>;
export interface Inquiry extends InquiryWorkflow {
  id: string;
  idempotencyKey: string;
  fingerprint: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  createdAt: number;
  providerId: string | null;
}
export interface Media {
  id: string;
  mime: string;
  size: number;
  createdAt: number;
}

export function localizedPath(pathname: string, locale: Locale) {
  const parts = pathname.split("/");
  if (isLocale(parts[1] ?? "")) parts[1] = locale;
  else parts.splice(1, 0, locale);
  return parts.join("/") || `/${locale}`;
}
