import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { jobListingsTable } from "./jobs";

export const jobFlagsTable = pgTable("job_flags", {
  id: text("id").primaryKey(),
  jobId: text("job_id")
    .notNull()
    .references(() => jobListingsTable.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("pending_review"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type JobFlagRecord = typeof jobFlagsTable.$inferSelect;
