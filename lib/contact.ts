import { z } from "zod";
export const CONTACT_RECIPIENT = "ramtin.babaei2002@gmail.com";

export const contactServices = [
  "fullstack",
  "frontend",
  "backend",
  "uiux",
  "redesign",
  "other",
] as const;
export const contactBudgets = [
  "undecided",
  "under-2k",
  "2k-5k",
  "5k-10k",
  "10k-plus",
] as const;
export const serviceLabels = {
  en: [
    "Full-Stack Development",
    "Frontend Development",
    "Backend & API Development",
    "UI/UX Design",
    "Website Redesign",
    "Other",
  ],
  fa: [
    "توسعه فول‌استک",
    "توسعه فرانت‌اند",
    "بک‌اند و API",
    "طراحی رابط و تجربه کاربری",
    "بازطراحی وب‌سایت",
    "سایر",
  ],
} as const;
export const budgetLabels = {
  en: ["Not sure yet", "Under $2k", "$2k–$5k", "$5k–$10k", "$10k+"],
  fa: [
    "هنوز مشخص نیست",
    "کمتر از ۲ هزار دلار",
    "۲ تا ۵ هزار دلار",
    "۵ تا ۱۰ هزار دلار",
    "بیش از ۱۰ هزار دلار",
  ],
} as const;
export const serviceSelectionSchema = z
  .array(z.enum(contactServices))
  .min(1)
  .max(contactServices.length)
  .refine(
    (values) => new Set(values).size === values.length,
    "Choose each service once",
  );
export const contactFieldsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .refine((value) => !/[\r\n]/.test(value)),
  email: z.string().trim().email().max(254),
  company: z
    .string()
    .trim()
    .max(160)
    .refine((value) => !/[\r\n]/.test(value)),
  services: serviceSelectionSchema,
  budget: z.enum(contactBudgets),
  message: z.string().trim().min(20).max(5000),
  website: z.string().max(500),
});
export function orderedServices(values: readonly string[]) {
  return contactServices.filter((value) => values.includes(value));
}
export function inquirySubject(values: readonly string[]) {
  const first = orderedServices(values)[0];
  return first
    ? "Project inquiry — " + serviceLabels.en[contactServices.indexOf(first)]
    : "New project inquiry";
}
export function inquiryMessage(data: {
  company: string;
  services?: readonly string[];
  budget: (typeof contactBudgets)[number];
  message: string;
}) {
  if (!data.company && !data.services?.length && data.budget === "undecided")
    return data.message;
  const lines = [
    "Company / organization: " + (data.company || "Not provided"),
    "Requested services: " +
      (orderedServices(data.services ?? [])
        .map((value) => serviceLabels.en[contactServices.indexOf(value)])
        .join(", ") || "Not specified"),
    "Budget (USD): " + budgetLabels.en[contactBudgets.indexOf(data.budget)],
  ];
  return lines.join("\n") + "\n\nProject description:\n" + data.message;
}
