import { uniqueIndex, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { jobListingsTable } from "./jobs";
import { workerProfilesTable } from "./workers";

export const applicationsTable = pgTable(
  "applications",
  {
    id: text("id").primaryKey(),
    workerId: text("worker_id")
      .notNull()
      .references(() => workerProfilesTable.id, { onDelete: "cascade" }),
    jobId: text("job_id")
      .notNull()
      .references(() => jobListingsTable.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("applications_worker_job_unique").on(table.workerId, table.jobId)],
);

export type ApplicationRecord = typeof applicationsTable.$inferSelect;
