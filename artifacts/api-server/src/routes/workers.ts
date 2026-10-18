import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import {
  CreateWorkerBody,
  CreateWorkerResponse,
  GetWorkerParams,
  GetWorkerResponse,
  ListWorkerMatchesParams,
  ListWorkerMatchesResponse,
  ListWorkersQueryParams,
  ListWorkersResponse,
  UpdateWorkerBody,
  UpdateWorkerParams,
  UpdateWorkerResponse,
} from "@workspace/api-zod";
import {
  db,
  jobListingsTable,
  workerProfilesTable,
} from "@workspace/db";
import { ensureDemoData, matchWorkerToJob } from "../lib/marketplace";

const router: IRouter = Router();

router.get("/workers", async (req, res): Promise<void> => {
  const query = ListWorkersQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  await ensureDemoData();
  let workers = await db.select().from(workerProfilesTable).orderBy(desc(workerProfilesTable.createdAt));
  const skill = query.data.skill?.trim().toLocaleLowerCase();
  const location = query.data.location?.trim().toLocaleLowerCase();
  if (skill) {
    workers = workers.filter((worker) =>
      worker.skills.some((value) => value.toLocaleLowerCase().includes(skill)),
    );
  }
  if (location) {
    workers = workers.filter((worker) => worker.location.toLocaleLowerCase().includes(location));
  }
  res.json(ListWorkersResponse.parse(workers));
});

router.post("/workers", async (req, res): Promise<void> => {
  const parsed = CreateWorkerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  await ensureDemoData();
  const [worker] = await db
    .insert(workerProfilesTable)
    .values({
      id: randomUUID(),
      ...parsed.data,
      createdAt: new Date(),
      isDemo: false,
    })
    .returning();
  res.status(201).json(CreateWorkerResponse.parse(worker));
});

router.get("/workers/:workerId", async (req, res): Promise<void> => {
  const params = GetWorkerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await ensureDemoData();
  const [worker] = await db
    .select()
    .from(workerProfilesTable)
    .where(eq(workerProfilesTable.id, params.data.workerId));
  if (!worker) {
    res.status(404).json({ error: "Worker profile not found." });
    return;
  }
  res.json(GetWorkerResponse.parse(worker));
});

router.patch("/workers/:workerId", async (req, res): Promise<void> => {
  const params = UpdateWorkerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateWorkerBody.safeParse(req.body);
  if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
    res.status(400).json({ error: parsed.success ? "Provide at least one profile field to update." : parsed.error.message });
    return;
  }
  await ensureDemoData();
  const [worker] = await db
    .update(workerProfilesTable)
    .set(parsed.data)
    .where(eq(workerProfilesTable.id, params.data.workerId))
    .returning();
  if (!worker) {
    res.status(404).json({ error: "Worker profile not found." });
    return;
  }
  res.json(UpdateWorkerResponse.parse(worker));
});

router.get("/workers/:workerId/matches", async (req, res): Promise<void> => {
  const params = ListWorkerMatchesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await ensureDemoData();
  const [worker] = await db
    .select()
    .from(workerProfilesTable)
    .where(eq(workerProfilesTable.id, params.data.workerId));
  if (!worker) {
    res.status(404).json({ error: "Worker profile not found." });
    return;
  }

  const jobs = await db.select().from(jobListingsTable);
  const matches = jobs
    .map((job) => ({ job, ...matchWorkerToJob(worker, job) }))
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score);
  res.json(ListWorkerMatchesResponse.parse(matches));
});

export default router;
