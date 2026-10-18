import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import {
  ApplyToJobBody,
  ApplyToJobParams,
  ApplyToJobResponse,
  ListApplicationsResponse,
  ListWorkerApplicationsParams,
  ListWorkerApplicationsResponse,
  UpdateApplicationBody,
  UpdateApplicationParams,
  UpdateApplicationResponse,
} from "@workspace/api-zod";
import {
  db,
  applicationsTable,
  jobListingsTable,
  workerProfilesTable,
} from "@workspace/db";
import { toApplicationViews } from "../lib/application-view";
import { ensureDemoData } from "../lib/marketplace";

const router: IRouter = Router();

router.post("/jobs/:jobId/applications", async (req, res): Promise<void> => {
  const params = ApplyToJobParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = ApplyToJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await ensureDemoData();
  const [job] = await db
    .select({ id: jobListingsTable.id })
    .from(jobListingsTable)
    .where(eq(jobListingsTable.id, params.data.jobId));
  const [worker] = await db
    .select({ id: workerProfilesTable.id })
    .from(workerProfilesTable)
    .where(eq(workerProfilesTable.id, parsed.data.workerId));
  if (!job || !worker) {
    res.status(404).json({ error: !job ? "Job listing not found." : "Worker profile not found." });
    return;
  }
  const [existing] = await db
    .select({ id: applicationsTable.id })
    .from(applicationsTable)
    .where(and(
      eq(applicationsTable.workerId, worker.id),
      eq(applicationsTable.jobId, job.id),
    ));
  if (existing) {
    res.status(400).json({ error: "This worker has already applied to this listing." });
    return;
  }

  const [application] = await db
    .insert(applicationsTable)
    .values({
      id: randomUUID(),
      workerId: worker.id,
      jobId: job.id,
      status: "pending",
      createdAt: new Date(),
    })
    .returning();
  res.status(201).json(ApplyToJobResponse.parse(application));
});

router.get("/workers/:workerId/applications", async (req, res): Promise<void> => {
  const params = ListWorkerApplicationsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await ensureDemoData();
  const [worker] = await db
    .select({ id: workerProfilesTable.id })
    .from(workerProfilesTable)
    .where(eq(workerProfilesTable.id, params.data.workerId));
  if (!worker) {
    res.status(404).json({ error: "Worker profile not found." });
    return;
  }
  const rows = await db
    .select()
    .from(applicationsTable)
    .where(eq(applicationsTable.workerId, worker.id))
    .orderBy(desc(applicationsTable.createdAt));
  res.json(ListWorkerApplicationsResponse.parse(await toApplicationViews(rows)));
});

router.get("/applications", async (_req, res): Promise<void> => {
  await ensureDemoData();
  const rows = await db
    .select()
    .from(applicationsTable)
    .orderBy(desc(applicationsTable.createdAt));
  res.json(ListApplicationsResponse.parse(await toApplicationViews(rows)));
});

router.patch("/applications/:applicationId", async (req, res): Promise<void> => {
  const params = UpdateApplicationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateApplicationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  await ensureDemoData();
  const [updated] = await db
    .update(applicationsTable)
    .set({ status: parsed.data.status })
    .where(eq(applicationsTable.id, params.data.applicationId))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Application not found." });
    return;
  }
  const [view] = await toApplicationViews([updated]);
  res.json(UpdateApplicationResponse.parse(view));
});

export default router;
