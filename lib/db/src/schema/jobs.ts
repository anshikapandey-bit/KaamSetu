import { boolean, date, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const jobListingsTable = pgTable("job_listings", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  requiredSkills: text("required_skills").array().notNull(),
  location: text("location").notNull(),
  paymentMin: integer("payment_min").notNull(),
  paymentMax: integer("payment_max").notNull(),
  paymentUnit: text("payment_unit").notNull(),
  workDate: date("work_date", { mode: "string" }).notNull(),
  employerName: text("employer_name").notNull(),
  employerVerification: text("employer_verification").notNull().default("unverified"),
  postedAt: timestamp("posted_at", { withTimezone: true }).notNull().defaultNow(),
  isDemo: boolean("is_demo").notNull().default(false),
});

export type JobListing = typeof jobListingsTable.$inferSelect;
export type NewJobListing = typeof jobListingsTable.$inferInsert;
