import { boolean, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const workerProfilesTable = pgTable("worker_profiles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  skills: text("skills").array().notNull(),
  location: text("location").notNull(),
  experienceYears: integer("experience_years").notNull(),
  expectedDailyWage: integer("expected_daily_wage").notNull(),
  availability: text("availability").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  isDemo: boolean("is_demo").notNull().default(false),
});

export type WorkerProfile = typeof workerProfilesTable.$inferSelect;
export type NewWorkerProfile = typeof workerProfilesTable.$inferInsert;
