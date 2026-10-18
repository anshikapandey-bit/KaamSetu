import { db, applicationsTable, jobListingsTable, workerProfilesTable } from "@workspace/db";
import type { ApplicationRecord } from "@workspace/db";

export async function toApplicationViews(
  applications: ApplicationRecord[],
) {
  const [workers, jobs] = await Promise.all([
    db.select().from(workerProfilesTable),
    db.select().from(jobListingsTable),
  ]);
  const workerById = new Map(workers.map((worker) => [worker.id, worker]));
  const jobById = new Map(jobs.map((job) => [job.id, job]));

  return applications.flatMap((application) => {
    const worker = workerById.get(application.workerId);
    const job = jobById.get(application.jobId);
    if (!worker || !job) return [];
    return [{
      ...application,
      workerName: worker.name,
      jobTitle: job.title,
      employerName: job.employerName,
      location: job.location,
      paymentMin: job.paymentMin,
      paymentMax: job.paymentMax,
      paymentUnit: job.paymentUnit,
    }];
  });
}
