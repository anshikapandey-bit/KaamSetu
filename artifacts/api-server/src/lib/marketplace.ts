import { db, applicationsTable, jobListingsTable, workerProfilesTable } from "@workspace/db";
import type { JobListing, WorkerProfile } from "@workspace/db";

const demoJobs: JobListing[] = [
  {
    id: "demo-job-carpenter",
    title: "Carpenter for door-frame repairs",
    description: "Repair two wooden door frames and adjust hinges in a small apartment building.",
    requiredSkills: ["Carpentry", "Door fitting"],
    location: "Kothrud, Pune",
    paymentMin: 900,
    paymentMax: 1100,
    paymentUnit: "day",
    workDate: futureDate(2),
    employerName: "Demo employer · Greenview Homes",
    employerVerification: "unverified",
    postedAt: new Date("2026-10-16T10:00:00.000Z"),
    isDemo: true,
  },
  {
    id: "demo-job-electrician",
    title: "Electrician for a safety inspection",
    description: "Check switchboards, replace two fittings, and confirm the wiring is safe.",
    requiredSkills: ["Electrical work", "Wiring"],
    location: "Baner, Pune",
    paymentMin: 1000,
    paymentMax: 1300,
    paymentUnit: "day",
    workDate: futureDate(3),
    employerName: "Demo employer · Aundh Community Hall",
    employerVerification: "unverified",
    postedAt: new Date("2026-10-16T08:30:00.000Z"),
    isDemo: true,
  },
  {
    id: "demo-job-plumber",
    title: "Plumber for bathroom leak repair",
    description: "Find and repair a leaking bathroom pipe; materials will be discussed before work starts.",
    requiredSkills: ["Plumbing", "Pipe repair"],
    location: "Hadapsar, Pune",
    paymentMin: 900,
    paymentMax: 1200,
    paymentUnit: "day",
    workDate: futureDate(4),
    employerName: "Demo employer · Sunrise Apartments",
    employerVerification: "unverified",
    postedAt: new Date("2026-10-15T12:15:00.000Z"),
    isDemo: true,
  },
  {
    id: "demo-job-painter",
    title: "Painter for a two-room repaint",
    description: "Prepare walls and apply two coats of interior paint in two rooms.",
    requiredSkills: ["Painting", "Wall preparation"],
    location: "Viman Nagar, Pune",
    paymentMin: 850,
    paymentMax: 1050,
    paymentUnit: "day",
    workDate: futureDate(5),
    employerName: "Demo employer · Maple Residency",
    employerVerification: "unverified",
    postedAt: new Date("2026-10-15T09:00:00.000Z"),
    isDemo: true,
  },
  {
    id: "demo-job-mason",
    title: "Mason for courtyard tile work",
    description: "Replace cracked courtyard tiles and finish the edges around a small drain.",
    requiredSkills: ["Masonry", "Tile setting"],
    location: "Wakad, Pune",
    paymentMin: 950,
    paymentMax: 1250,
    paymentUnit: "day",
    workDate: futureDate(6),
    employerName: "Demo employer · Lotus Court",
    employerVerification: "unverified",
    postedAt: new Date("2026-10-14T15:30:00.000Z"),
    isDemo: true,
  },
];

const demoWorkers: WorkerProfile[] = [
  {
    id: "demo-worker-carpenter",
    name: "Demo profile · Sunil Patil",
    skills: ["Carpentry", "Door fitting", "Cabinet repair"],
    location: "Kothrud, Pune",
    experienceYears: 8,
    expectedDailyWage: 1000,
    availability: "Available now",
    createdAt: new Date("2026-10-15T09:00:00.000Z"),
    isDemo: true,
  },
  {
    id: "demo-worker-electrician",
    name: "Demo profile · Asha Jadhav",
    skills: ["Electrical work", "Wiring", "Light fitting"],
    location: "Aundh, Pune",
    experienceYears: 5,
    expectedDailyWage: 1100,
    availability: "Available weekdays",
    createdAt: new Date("2026-10-15T11:30:00.000Z"),
    isDemo: true,
  },
];

function futureDate(daysAhead: number): string {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + daysAhead);
  return date.toISOString().slice(0, 10);
}

let seedPromise: Promise<void> | undefined;

export function ensureDemoData(): Promise<void> {
  seedPromise ??= (async () => {
    await db.insert(jobListingsTable).values(demoJobs).onConflictDoNothing();
    await db.insert(workerProfilesTable).values(demoWorkers).onConflictDoNothing();
    await db
      .insert(applicationsTable)
      .values([
        {
          id: "demo-application-carpenter",
          workerId: "demo-worker-carpenter",
          jobId: "demo-job-carpenter",
          status: "pending",
          createdAt: new Date("2026-10-16T11:00:00.000Z"),
        },
        {
          id: "demo-application-electrician",
          workerId: "demo-worker-electrician",
          jobId: "demo-job-electrician",
          status: "accepted",
          createdAt: new Date("2026-10-16T11:15:00.000Z"),
        },
      ])
      .onConflictDoNothing();
  })();
  return seedPromise;
}

const skillAliases: Record<string, string> = {
  carpenter: "carpentry",
  carpentry: "carpentry",
  electrician: "electrical work",
  electrical: "electrical work",
  plumbing: "plumbing",
  plumber: "plumbing",
  painter: "painting",
  painting: "painting",
  mason: "masonry",
  masonry: "masonry",
};

export function canonicalSkill(skill: string): string {
  const normalized = skill.trim().toLocaleLowerCase();
  return skillAliases[normalized] ?? normalized;
}

export function sharedSkills(worker: WorkerProfile, job: JobListing): string[] {
  const workerSkills = new Set(worker.skills.map(canonicalSkill));
  return job.requiredSkills.filter((skill) => workerSkills.has(canonicalSkill(skill)));
}

function areaOf(location: string): string {
  return location.split(",").at(-1)?.trim().toLocaleLowerCase() ?? location.toLocaleLowerCase();
}

function locationsMatch(workerLocation: string, jobLocation: string): boolean {
  return workerLocation.trim().toLocaleLowerCase() === jobLocation.trim().toLocaleLowerCase();
}

function sameCity(workerLocation: string, jobLocation: string): boolean {
  return areaOf(workerLocation) === areaOf(jobLocation);
}

function availabilityFits(availability: string, workDate: string): boolean {
  const value = availability.trim().toLocaleLowerCase();
  if (/unavailable|not available|busy/.test(value)) return false;

  const constrainedDate = value.match(/(?:from|after)\s+(\d{4}-\d{2}-\d{2})/);
  if (constrainedDate && workDate < constrainedDate[1]) return false;

  const day = new Date(`${workDate}T12:00:00.000Z`).getUTCDay();
  if (value.includes("weekdays") && (day === 0 || day === 6)) return false;
  if (value.includes("weekends") && day !== 0 && day !== 6) return false;

  return true;
}

export function matchWorkerToJob(worker: WorkerProfile, job: JobListing) {
  const matchedSkills = sharedSkills(worker, job);
  const reasons: string[] = [];
  let score = 0;

  if (!matchedSkills.length || !availabilityFits(worker.availability, job.workDate)) {
    return { score: 0, reasons };
  }
  score += Math.round((60 * matchedSkills.length) / job.requiredSkills.length);
  reasons.push(`Skills match: ${matchedSkills.join(", ")}`);
  if (locationsMatch(worker.location, job.location)) {
    score += 25;
    reasons.push(`Same area: ${job.location}`);
  } else if (sameCity(worker.location, job.location)) {
    score += 15;
    reasons.push(`Both in ${areaOf(job.location)}`);
  } else {
    reasons.push(`Different area from ${job.location}; confirm travel before accepting.`);
  }
  score += 15;
  reasons.push(`Availability fits ${formatWorkDate(job.workDate)}`);

  return { score: Math.min(score, 100), reasons };
}

export function formatWorkDate(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00.000Z`));
}
