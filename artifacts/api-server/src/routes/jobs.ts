import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import {
  CreateJobBody,
  CreateJobResponse,
  FlagJobBody,
  FlagJobParams,
  FlagJobResponse,
  GetJobParams,
  GetJobResponse,
  ListJobMatchesParams,
  ListJobMatchesResponse,
  ListJobsQueryParams,
  ListJobsResponse,
} from "@workspace/api-zod";
import {
  db,
  jobFlagsTable,
  jobListingsTable,
  workerProfilesTable,
} from "@workspace/db";
import { ensureDemoData, matchWorkerToJob } from "../lib/marketplace";

const router: IRouter = Router();

router.get("/jobs", async (req, res): Promise<void> => {
  const query = ListJobsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  await ensureDemoData();
  let jobs = await db.select().from(jobListingsTable).orderBy(desc(jobListingsTable.postedAt));
  const search = query.data.search?.trim().toLocaleLowerCase();
  const skill = query.data.skill?.trim().toLocaleLowerCase();
  const location = query.data.location?.trim().toLocaleLowerCase();

  if (search) {
    jobs = jobs.filter((job) =>
      [job.title, job.description, job.employerName, job.location, ...job.requiredSkills]
        .some((value) => value.toLocaleLowerCase().includes(search)),
    );
  }
  if (skill) {
    jobs = jobs.filter((job) =>
      job.requiredSkills.some((value) => value.toLocaleLowerCase().includes(skill)),
    );
  }
  if (location) {
    jobs = jobs.filter((job) => job.location.toLocaleLowerCase().includes(location));
  }

  res.json(ListJobsResponse.parse(jobs));
});

router.post("/jobs", async (req, res): Promise<void> => {
  const parsed = CreateJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (parsed.data.paymentMax < parsed.data.paymentMin) {
    res.status(400).json({ error: "Maximum payment must be at least the minimum payment." });
    return;
  }
  const earliestWorkDate = new Date();
  earliestWorkDate.setUTCHours(0, 0, 0, 0);
  if (parsed.data.workDate < earliestWorkDate) {
    res.status(400).json({ error: "Work date must be today or a future date." });
    return;
  }

  await ensureDemoData();
  const [job] = await db
    .insert(jobListingsTable)
    .values({
      id: randomUUID(),
      ...parsed.data,
      workDate: parsed.data.workDate.toISOString().slice(0, 10),
      employerVerification: "unverified",
      postedAt: new Date(),
      isDemo: false,
    })
    .returning();

  res.status(201).json(CreateJobResponse.parse(job));
});

router.get("/jobs/:jobId", async (req, res): Promise<void> => {
  const params = GetJobParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await ensureDemoData();
  const [job] = await db
    .select()
    .from(jobListingsTable)
    .where(eq(jobListingsTable.id, params.data.jobId));

  if (!job) {
    res.status(404).json({ error: "Job listing not found." });
    return;
  }
  res.json(GetJobResponse.parse(job));
});

router.get("/jobs/:jobId/matches", async (req, res): Promise<void> => {
  const params = ListJobMatchesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await ensureDemoData();
  const [job] = await db
    .select()
    .from(jobListingsTable)
    .where(eq(jobListingsTable.id, params.data.jobId));
  if (!job) {
    res.status(404).json({ error: "Job listing not found." });
    return;
  }

  const workers = await db.select().from(workerProfilesTable);
  const matches = workers
    .map((worker) => ({ worker, ...matchWorkerToJob(worker, job) }))
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score);
  res.json(ListJobMatchesResponse.parse(matches));
});

router.post("/jobs/:jobId/flags", async (req, res): Promise<void> => {
  const params = FlagJobParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = FlagJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  await ensureDemoData();
  const [job] = await db
    .select({ id: jobListingsTable.id })
    .from(jobListingsTable)
    .where(eq(jobListingsTable.id, params.data.jobId));
  if (!job) {
    res.status(404).json({ error: "Job listing not found." });
    return;
  }

  const [flag] = await db
    .insert(jobFlagsTable)
    .values({
      id: randomUUID(),
      jobId: job.id,
      reason: parsed.data.reason,
      status: "pending_review",
      createdAt: new Date(),
    })
    .returning();
  res.status(201).json(FlagJobResponse.parse(flag));
});

export default router;
