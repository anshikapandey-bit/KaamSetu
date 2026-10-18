import { Router, type IRouter } from "express";
import { desc, inArray } from "drizzle-orm";
import {
  GetDashboardSummaryResponse,
  GetDemoStatusResponse,
  ListReviewQueueResponse,
} from "@workspace/api-zod";
import {
  db,
  applicationsTable,
  jobFlagsTable,
  jobListingsTable,
  workerProfilesTable,
} from "@workspace/db";
import { ensureDemoData } from "../lib/marketplace";

const router: IRouter = Router();

router.get("/demo-status", async (_req, res): Promise<void> => {
  await ensureDemoData();
  res.json(
    GetDemoStatusResponse.parse({
      storage: "database",
      isDemoMode: true,
      notice:
        "Demo workspace: no sign-in or identity verification is active. New profiles, listings and applications are saved here and shared with other demo users.",
    }),
  );
});

router.get("/dashboard", async (_req, res): Promise<void> => {
  await ensureDemoData();
  const [jobs, workers, applications, flags] = await Promise.all([
    db.select({ id: jobListingsTable.id }).from(jobListingsTable),
    db.select({ id: workerProfilesTable.id }).from(workerProfilesTable),
    db.select({ status: applicationsTable.status }).from(applicationsTable),
    db.select({ status: jobFlagsTable.status }).from(jobFlagsTable),
  ]);
  res.json(
    GetDashboardSummaryResponse.parse({
      totalJobs: jobs.length,
      workerProfiles: workers.length,
      applications: applications.length,
      successfulConnections: applications.filter((application) => application.status === "accepted").length,
      pendingReview: flags.filter((flag) => flag.status !== "resolved").length,
    }),
  );
});

router.get("/review-queue", async (_req, res): Promise<void> => {
  await ensureDemoData();
  const [flags, jobs] = await Promise.all([
    db
      .select()
      .from(jobFlagsTable)
      .where(inArray(jobFlagsTable.status, ["pending_review", "in_review"]))
      .orderBy(desc(jobFlagsTable.createdAt)),
    db.select().from(jobListingsTable),
  ]);
  const jobsById = new Map(jobs.map((job) => [job.id, job]));
  const queue = flags.flatMap((flag) => {
    const job = jobsById.get(flag.jobId);
    return job ? [{ ...flag, job }] : [];
  });
  res.json(ListReviewQueueResponse.parse(queue));
});

export default router;
