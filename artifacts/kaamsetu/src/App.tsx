import { createContext, type FormEvent, type ReactNode, useContext, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight, BriefcaseBusiness, CalendarDays, Check, ClipboardList, FileCheck2,
  Flag, Handshake, House, MapPin, Search, ShieldAlert, UserRound, UsersRound,
} from 'lucide-react';
import {
  useApplyToJob, useCreateJob, useCreateWorker, useFlagJob, useGetDashboardSummary,
  useGetDemoStatus, useGetJob, useGetWorker, useHealthCheck, useListApplications,
  useListJobMatches, useListJobs, useListReviewQueue, useListWorkerApplications,
  useListWorkerMatches, useListWorkers, useUpdateApplication, useUpdateWorker,
  getGetDashboardSummaryQueryKey, getGetJobQueryKey,
  getGetWorkerQueryKey, getListApplicationsQueryKey, getListJobMatchesQueryKey,
  getListJobsQueryKey, getListReviewQueueQueryKey, getListWorkerApplicationsQueryKey,
  getListWorkerMatchesQueryKey, getListWorkersQueryKey,
} from '@workspace/api-client-react';
import type { Job, Worker } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Link, Route, Router as WouterRouter, Switch, useLocation } from 'wouter';

const queryClient = new QueryClient();
const ACTIVE_WORKER_KEY = 'kaamsetu-active-worker';
const navItems = [
  { href: '/', label: 'Overview', short: 'Home', icon: House },
  { href: '/find-work', label: 'Find work', short: 'Find', icon: BriefcaseBusiness },
  { href: '/worker-profile', label: 'Worker profile', short: 'Profile', icon: UserRound },
  { href: '/hire', label: 'Hire workers', short: 'Hire', icon: UsersRound },
  { href: '/applications', label: 'My applications', short: 'Applied', icon: ClipboardList },
  { href: '/review', label: 'Safety review', short: 'Review', icon: ShieldAlert },
];

function messageOf(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}

function money(value: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value);
}

function dateLabel(value: string) {
  if (!value) return 'Date to be agreed';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function localDateInputValue() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

function PageTitle({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return <div className="page-head fade-in"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="page-intro">{children}</p></div></div>;
}

function LoadingCards({ count = 3 }: { count?: number }) {
  return <div className="grid" aria-label="Loading"><div className="skeleton" /><div className="skeleton" />{count > 2 && <div className="skeleton" />}</div>;
}

function ErrorNotice({ error, retry }: { error: unknown; retry: () => void }) {
  return <div className="alert" role="alert"><strong>We could not load this just now.</strong> {messageOf(error)} <button className="button button-quiet button-small" onClick={retry} data-testid="button-retry">Try again</button></div>;
}

function EmptyState({ icon: Icon, title, description, action }: { icon: typeof Search; title: string; description: string; action?: ReactNode }) {
  return <div className="empty-state" data-testid="state-empty"><div className="empty-icon"><Icon size={23} /></div><h3>{title}</h3><p>{description}</p>{action}</div>;
}

function AppShell({ children }: { children: ReactNode }) {
  const [path] = useLocation();
  const [workerId, setWorkerId] = useState(() => localStorage.getItem(ACTIVE_WORKER_KEY) ?? '');
  const { data: demoStatus } = useGetDemoStatus();
  const health = useHealthCheck();
  const setActiveWorker = (id: string) => {
    setWorkerId(id);
    if (id) localStorage.setItem(ACTIVE_WORKER_KEY, id);
    else localStorage.removeItem(ACTIVE_WORKER_KEY);
  };
  return <WorkerContext.Provider value={{ workerId, setActiveWorker }}>
    <div className="app-frame">
      <aside className="side-nav">
        <Link href="/" className="brand" data-testid="link-brand"><span className="brand-mark"><Handshake size={24} /></span><span><span className="brand-name">KaamSetu</span><span className="brand-caption">Local work, fair pay</span></span></Link>
        <div className="nav-section-label">Your workspace</div>
        <nav className="nav-links" aria-label="Main navigation">
          {navItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`nav-link ${path === href ? 'active' : ''}`} aria-current={path === href ? 'page' : undefined} data-testid={`link-nav-${href.slice(1) || 'overview'}`}><Icon /><span>{label}</span></Link>)}
        </nav>
        <div className="nav-bottom"><div className="nav-status"><span className="status-dot" />{health.isError ? 'Connection needs attention' : 'Marketplace available'}</div><small>{demoStatus?.notice ?? 'Local work, fair pay, clear expectations.'}</small></div>
      </aside>
      <div className="main-area">
        <header className="topbar"><div className="crumb">KaamSetu <span aria-hidden="true">/</span> <strong>{navItems.find((item) => item.href === path)?.label ?? 'Workspace'}</strong></div><div className="topbar-right"><span>{workerId ? 'Worker mode active' : 'Welcome to KaamSetu'}</span><span className="avatar">{workerId ? 'W' : 'K'}</span></div></header>
        <main className="page-wrap">{children}</main>
      </div>
      <nav className="bottom-nav" aria-label="Mobile navigation">{navItems.map(({ href, short, icon: Icon }) => <Link key={href} href={href} className={path === href ? 'active' : ''} aria-current={path === href ? 'page' : undefined} data-testid={`mobile-nav-${href.slice(1) || 'overview'}`}><Icon /><span>{short}</span></Link>)}</nav>
    </div>
  </WorkerContext.Provider>;
}

type WorkerContextValue = { workerId: string; setActiveWorker: (id: string) => void };
const WorkerContext = createContext<WorkerContextValue>({ workerId: '', setActiveWorker: () => undefined });
function useWorkerContext() { return useContext(WorkerContext); }

function DashboardPage() {
  const { workerId } = useWorkerContext();
  const summary = useGetDashboardSummary();
  const status = useGetDemoStatus();
  const jobs = useListJobs();
  const profile = useGetWorker(workerId, { query: { enabled: !!workerId, queryKey: getGetWorkerQueryKey(workerId) } });
  const matches = useListWorkerMatches(workerId, { query: { enabled: !!workerId, queryKey: getListWorkerMatchesQueryKey(workerId) } });
  const applications = useListWorkerApplications(workerId, { query: { enabled: !!workerId, queryKey: getListWorkerApplicationsQueryKey(workerId) } });
  const counts = summary.data;
  const metrics: [string, number | undefined, typeof BriefcaseBusiness][] = [
    ['Job listings', counts?.totalJobs, BriefcaseBusiness],
    ['Worker profiles', counts?.workerProfiles, UserRound],
    ['Applications', counts?.applications, FileCheck2],
    ['Connections made', counts?.successfulConnections, Handshake],
    ['Awaiting review', counts?.pendingReview, ShieldAlert],
  ];
  const worker = profile.data;
  const completionFields = worker ? [worker.name, worker.skills.length > 0, worker.location, worker.experienceYears >= 0, worker.expectedDailyWage > 0, worker.availability] : [];
  const completion = completionFields.length ? Math.round(completionFields.filter(Boolean).length / completionFields.length * 100) : 0;
  if (workerId) {
    return <div className="grid fade-in">
      {profile.isError && <ErrorNotice error={profile.error} retry={() => void profile.refetch()} />}
      {profile.isLoading ? <div className="skeleton" style={{ height: 190 }} aria-label="Loading your worker dashboard" /> : worker ? <>
        <section className="personal-hero" data-testid="worker-dashboard">
          <div><p className="eyebrow">Your KaamSetu workspace</p><h1>Namaste, {worker.name.split(' ')[0]}.</h1><p>Here’s what’s happening with your work profile today.</p></div>
          <div className="profile-progress" data-testid="profile-completion"><div className="progress-top"><strong>Profile completion</strong><strong>{completion}%</strong></div><div className="progress-track" role="progressbar" aria-label="Profile completion" aria-valuenow={completion} aria-valuemin={0} aria-valuemax={100}><div className="progress-fill" style={{ width: `${completion}%` }} /></div><Link href="/worker-profile" className="button button-secondary button-small" style={{ marginTop: 12 }}>Improve profile <ArrowRight size={15} /></Link></div>
        </section>
        {status.data && <div className="alert info" data-testid="status-demo-notice"><strong>{status.data.isDemoMode ? 'Demo experience' : 'Storage status'}:</strong> {status.data.notice} {status.data.storage === 'memory' ? 'Changes may not stay after a server restart.' : ''}</div>}
        <section className="dashboard-columns">
          <div className="panel panel-pad dashboard-section">
            <div className="page-head" style={{ marginBottom: 12 }}><div><p className="eyebrow">Chosen for your skills</p><h2 className="section-title">Recommended work</h2></div><Link className="button button-quiet button-small" href="/find-work" data-testid="link-dashboard-find-work">Browse all <ArrowRight size={15} /></Link></div>
            {matches.isLoading ? <LoadingCards count={2} /> : matches.isError ? <ErrorNotice error={matches.error} retry={() => void matches.refetch()} /> : matches.data?.length ? matches.data.slice(0, 3).map((match) => <article className="mini-job" key={match.job.id} data-testid={`recommended-job-${match.job.id}`}><div className="job-card-top"><div><h3>{match.job.title}</h3><div className="meta-row"><span className="meta-item"><MapPin />{match.job.location}</span><span>₹{money(match.job.paymentMin)}–₹{money(match.job.paymentMax)} / {match.job.paymentUnit}</span></div></div><span className="score">{match.score}% fit</span></div><div className="match-reasons"><strong>Why it may suit you</strong>{match.reasons.length ? match.reasons.join(' · ') : 'Your profile details align with this opportunity.'}</div></article>) : <EmptyState icon={BriefcaseBusiness} title="No matches just yet" description="As nearby listings fit your skills and location, they will appear here." action={<Link href="/find-work" className="button button-small" data-testid="link-browse-from-dashboard">Browse work</Link>} />}
          </div>
          <div className="panel panel-pad dashboard-section">
            <p className="eyebrow">Your next steps</p><h2 className="section-title">Application status</h2>
            {applications.isLoading ? <LoadingCards count={1} /> : applications.isError ? <ErrorNotice error={applications.error} retry={() => void applications.refetch()} /> : applications.data?.length ? <div className="application-status-card" data-testid="dashboard-applications">{applications.data.slice(0, 4).map((item) => <div className="application-status-line" key={item.id} data-testid={`dashboard-application-${item.id}`}><div><strong>{item.jobTitle}</strong><div className="subtle" style={{ fontSize: 12, marginTop: 4 }}>{item.employerName} · {dateLabel(item.createdAt)}</div></div><span className={`badge ${item.status}`}>{item.status === 'pending' ? 'Waiting' : item.status === 'accepted' ? 'Accepted' : 'Not selected'}</span></div>)}</div> : <EmptyState icon={ClipboardList} title="No applications yet" description="Found work that feels right? Apply and follow its progress here." action={<Link href="/find-work" className="button button-small">Find work</Link>} />}
            <Link href="/applications" className="button button-quiet button-small" style={{ marginTop: 14 }} data-testid="link-all-applications">All applications <ArrowRight size={15} /></Link>
          </div>
        </section>
        <section className="panel panel-pad" data-testid="dashboard-profile-summary"><div className="page-head" style={{ marginBottom: 10 }}><div><p className="eyebrow">Your profile</p><h2 className="section-title">A clear profile builds trust</h2></div><Link href="/worker-profile" className="button button-quiet button-small">Edit profile</Link></div><div className="tag-row">{worker.skills.map((skill) => <span className="tag" key={skill}>{skill}</span>)}</div><p className="subtle" style={{ margin: '12px 0 0', fontSize: 13 }}>{worker.location} · {worker.experienceYears} years experience · Available: {worker.availability}</p></section>
      </> : <EmptyState icon={UserRound} title="We could not find this profile" description="Choose a current worker profile to see your personalized dashboard." action={<Link href="/worker-profile" className="button">Choose profile</Link>} />}
    </div>;
  }
  return <div className="grid fade-in">
    <section className="welcome">
      <div className="welcome-copy"><p className="eyebrow">Connect Skills. Create Opportunities.</p><h1>Good work starts with a fair connection.</h1><p>Find nearby opportunities that fit your skills, or meet dependable workers in your community. Clear details. Respectful choices. No middleman.</p><div className="welcome-actions"><Link href="/find-work" className="button" data-testid="link-find-work-hero">Find Work <ArrowRight /></Link><Link href="/hire" className="button button-secondary" data-testid="link-hire-workers-hero">Hire Workers</Link></div></div>
      <div className="welcome-photo"><img src="/kaamsetu-workers-home.jpg" alt="Skilled neighborhood workers ready to find their next opportunity" data-testid="img-home-workers" /></div>
    </section>
    <section className="steps-strip" aria-label="How to get started" data-testid="getting-started-steps">
      <div className="step-item"><span className="step-number">1</span><span>Create Profile</span><ArrowRight className="steps-arrow" size={15} /></div>
      <div className="step-item"><span className="step-number">2</span><span>Find Matches</span><ArrowRight className="steps-arrow" size={15} /></div>
      <div className="step-item"><span className="step-number">3</span><span>Apply for Work</span></div>
    </section>
    {status.data && <div className="alert info" data-testid="status-demo-notice"><strong>{status.data.isDemoMode ? 'Demo experience' : 'Storage status'}:</strong> {status.data.notice} {status.data.storage === 'memory' ? 'Changes may not stay after a server restart.' : ''}</div>}
    {summary.isError && <ErrorNotice error={summary.error} retry={() => void summary.refetch()} />}
    {summary.isLoading ? <LoadingCards count={2} /> : <section className="metric-grid" aria-label="Marketplace summary">
      {metrics.map(([label, value, Icon]) => <div className="panel metric" key={label} data-testid={`metric-${label.toLowerCase().replaceAll(' ', '-')}`}><div className="metric-label">{label}</div><div className="metric-value">{value ?? '—'}</div><div className="metric-foot">{Icon === ShieldAlert ? 'For a person to check' : 'Across the local marketplace'}</div></div>)}
    </section>}
    <section><h2 className="section-title">What would you like to do?</h2><div className="action-grid">
      <Link href="/find-work" className="panel action-card" data-testid="card-action-find"><span className="action-icon"><Search /></span><span><h3>Find work near you</h3><p>Browse local jobs and see why each may suit you.</p></span></Link>
      <Link href="/worker-profile" className="panel action-card" data-testid="card-action-profile"><span className="action-icon"><UserRound /></span><span><h3>Build your worker profile</h3><p>Share your skills, experience and expected daily wage.</p></span></Link>
      <Link href="/hire" className="panel action-card" data-testid="card-action-hire"><span className="action-icon"><UsersRound /></span><span><h3>Hire for a job</h3><p>Post clear work details and find workers who fit.</p></span></Link>
    </div></section>
    <section><div className="page-head" style={{ marginBottom: 14 }}><div><h2 className="section-title">Recently posted work</h2><p className="subtle" style={{ margin: 0, fontSize: 13 }}>A quick look at opportunities shared nearby.</p></div><Link className="button button-quiet button-small" href="/find-work" data-testid="link-all-jobs">See all work <ArrowRight size={16} /></Link></div>
      {jobs.isLoading ? <LoadingCards count={2} /> : jobs.isError ? <ErrorNotice error={jobs.error} retry={() => void jobs.refetch()} /> : jobs.data?.length ? <div className="job-list">{jobs.data.slice(0, 2).map((job) => <JobCard key={job.id} job={job} compact />)}</div> : <EmptyState icon={BriefcaseBusiness} title="No listings yet" description="When local employers add work, it will appear here." action={<Link href="/hire" className="button button-small" data-testid="link-post-first-job">Post a job</Link>} />}
    </section>
  </div>;
}

function JobCard({ job, compact = false, match, onApply, applying = false, applied = false }: { job: Job; compact?: boolean; match?: { score: number; reasons: string[] }; onApply?: () => void; applying?: boolean; applied?: boolean }) {
  const [flagOpen, setFlagOpen] = useState(false);
  const [flagSent, setFlagSent] = useState(false);
  const [reason, setReason] = useState('');
  const flagMutation = useFlagJob();
  const queryClient = useQueryClient();
  const submitFlag = (event: FormEvent) => {
    event.preventDefault();
    if (reason.trim().length < 5) return;
    flagMutation.mutate({ jobId: job.id, data: { reason: reason.trim() } }, {
      onSuccess: () => {
        setFlagOpen(false);
        setFlagSent(true);
        setReason('');
        void queryClient.invalidateQueries({ queryKey: getListReviewQueueQueryKey() });
        void queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      },
    });
  };
  return <article className="panel job-card" data-testid={`card-job-${job.id}`}>
    <div className="job-card-top"><div><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}><h3>{job.title}</h3>{job.isDemo && <span className="badge demo">Sample listing</span>}</div>
      <div className="meta-row"><span className="meta-item"><MapPin />{job.location}</span><span className="meta-item"><CalendarDays />{dateLabel(job.workDate)}</span><span className="meta-item"><UserRound />{job.employerName}</span><span className="badge unverified">Employer not verified</span></div>
    </div><div className="wage">₹{money(job.paymentMin)}–₹{money(job.paymentMax)}<small> / {job.paymentUnit === 'day' ? 'day' : 'job'}</small></div></div>
    {!compact && <p className="job-description">{job.description}</p>}
    <div className="tag-row">{job.requiredSkills.map((skill) => <span className="tag" key={skill}>{skill}</span>)}</div>
    {match && <div className="match-reasons" data-testid={`match-reasons-${job.id}`}><strong>{match.score}% fit · Why this may suit you</strong>{match.reasons.length ? match.reasons.join(' · ') : 'Your profile has details that align with this work.'}</div>}
    {!compact && <div className="job-actions">
      {onApply && <button className="button" onClick={onApply} disabled={applying || applied} data-testid={`button-apply-${job.id}`}>{applied ? <><Check /> Applied</> : applying ? 'Sending…' : 'I am interested'}</button>}
      <button className="button button-secondary button-small" onClick={() => setFlagOpen((open) => !open)} data-testid={`button-flag-${job.id}`}><Flag size={15} /> Flag for review</button>
    </div>}
    {flagOpen && <form onSubmit={submitFlag} className="grid" style={{ marginTop: 14 }}><label className="field"><span>What concerns you about this listing?</span><textarea className="control" minLength={5} maxLength={500} required value={reason} onChange={(event) => setReason(event.target.value)} placeholder="For example: the pay details do not seem clear." data-testid={`input-flag-reason-${job.id}`} /></label>{flagMutation.isError && <p className="form-error">{messageOf(flagMutation.error)}</p>}<button className="button button-small" disabled={flagMutation.isPending} data-testid={`button-submit-flag-${job.id}`}>{flagMutation.isPending ? 'Sending for review…' : 'Send to human review'}</button></form>}
    {flagSent && <div className="alert info" role="status" data-testid={`status-flag-sent-${job.id}`}>Your report was sent. This listing is awaiting human review.</div>}
  </article>;
}

function FindWorkPage() {
  const { workerId } = useWorkerContext();
  const [search, setSearch] = useState('');
  const [skill, setSkill] = useState('');
  const [location, setLocation] = useState('');
  const params = { search: search || undefined, skill: skill || undefined, location: location || undefined };
  const jobs = useListJobs(params);
  const matches = useListWorkerMatches(workerId, { query: { enabled: !!workerId, queryKey: getListWorkerMatchesQueryKey(workerId) } });
  const workerApplications = useListWorkerApplications(workerId, { query: { enabled: !!workerId, queryKey: getListWorkerApplicationsQueryKey(workerId) } });
  const apply = useApplyToJob();
  const queryClient = useQueryClient();
  const matchById = new Map((matches.data ?? []).map((item) => [item.job.id, item]));
  const appliedIds = new Set((workerApplications.data ?? []).map((application) => application.jobId));
  const handleApply = (jobId: string) => {
    if (!workerId) return;
    apply.mutate({ jobId, data: { workerId } }, { onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: getListWorkerApplicationsQueryKey(workerId) });
      void queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    } });
  };
  return <div className="fade-in">
    <PageTitle eyebrow="Find work" title="Work that fits your skills.">Search nearby listings. We’ll show you what each job pays, when it starts and why it may match your profile.</PageTitle>
    {!workerId && <div className="alert info"><strong>Want personal matches?</strong> Create or choose a worker profile first. You can still browse every listing. <Link href="/worker-profile" style={{ fontWeight: 800, color: 'inherit' }}>Set up profile</Link></div>}
    {matches.isError && <ErrorNotice error={matches.error} retry={() => void matches.refetch()} />}
    {workerApplications.isError && <ErrorNotice error={workerApplications.error} retry={() => void workerApplications.refetch()} />}
    <section className="panel panel-pad" style={{ marginBottom: 20 }}>
      <h2 className="section-title">Search local opportunities</h2>
      <div className="search-row">
        <div className="search-input-wrap"><Search /><input className="control" aria-label="Search jobs" placeholder="Job title or words" value={search} onChange={(event) => setSearch(event.target.value)} data-testid="input-job-search" /></div>
        <input className="control" aria-label="Filter by skill" placeholder="Skill, such as painting" value={skill} onChange={(event) => setSkill(event.target.value)} data-testid="input-job-skill" />
        <input className="control" aria-label="Filter by location" placeholder="Town or area" value={location} onChange={(event) => setLocation(event.target.value)} data-testid="input-job-location" />
        <button className="button button-secondary" onClick={() => { setSearch(''); setSkill(''); setLocation(''); }} data-testid="button-clear-search">Clear</button>
      </div>
      <p className="subtle" style={{ margin: 0, fontSize: 12 }}>Try one simple word. Search is optional; you can browse all available jobs.</p>
    </section>
    <div className="page-head" style={{ marginBottom: 16 }}><div><h2 className="section-title">{workerId ? 'Listings and your matches' : 'Available work'}</h2><p className="subtle" style={{ margin: 0, fontSize: 13 }}>All employers are currently unverified. Agree on details before starting work.</p></div></div>
    {jobs.isLoading ? <LoadingCards /> : jobs.isError ? <ErrorNotice error={jobs.error} retry={() => void jobs.refetch()} /> : jobs.data?.length ? <div className="job-list" data-testid="list-jobs">{jobs.data.map((job) => {
      const matched = matchById.get(job.id);
       const isPendingApply = apply.isPending && apply.variables?.jobId === job.id;
       return <JobCard key={job.id} job={job} match={matched ? { score: matched.score, reasons: matched.reasons } : undefined} onApply={workerId ? () => handleApply(job.id) : undefined} applying={isPendingApply} applied={appliedIds.has(job.id)} />;
    })}</div> : <EmptyState icon={Search} title="No work found for that search" description="Try a nearby location, a shorter job title, or clear your filters to see all listings." action={<button className="button button-secondary button-small" onClick={() => { setSearch(''); setSkill(''); setLocation(''); }} data-testid="button-reset-filters">Show all listings</button>} />}
    {apply.isError && <div className="alert" style={{ marginTop: 16 }} role="alert">Your interest was not sent: {messageOf(apply.error)}. Please try again.</div>}
  </div>;
}

const defaultWorkerForm = { name: '', skills: '', location: '', experienceYears: '', expectedDailyWage: '', availability: '' };
const skillVocabulary = [
  { skill: 'masonry', terms: ['mason', 'masonry', 'brick', 'bricklaying', 'cement', 'concrete', 'plaster'] },
  { skill: 'painting', terms: ['paint', 'painting', 'painter', 'wall colour', 'colouring'] },
  { skill: 'carpentry', terms: ['carpenter', 'carpentry', 'woodwork', 'furniture', 'cabinet'] },
  { skill: 'plumbing', terms: ['plumber', 'plumbing', 'pipe', 'tap', 'water line'] },
  { skill: 'electrical work', terms: ['electrician', 'electrical', 'wiring', 'switchboard', 'lights'] },
  { skill: 'welding', terms: ['weld', 'welding', 'fabrication', 'metal work'] },
  { skill: 'tile laying', terms: ['tile', 'tiling', 'flooring', 'marble'] },
  { skill: 'cleaning', terms: ['clean', 'cleaning', 'housekeeping'] },
  { skill: 'driving', terms: ['drive', 'driving', 'driver', 'vehicle'] },
  { skill: 'gardening', terms: ['garden', 'gardening', 'landscaping', 'plants'] },
  { skill: 'cooking', terms: ['cook', 'cooking', 'kitchen', 'chef'] },
  { skill: 'tailoring', terms: ['tailor', 'tailoring', 'stitch', 'sewing', 'garment'] },
  { skill: 'security', terms: ['security', 'guard', 'watchman'] },
  { skill: 'machine operation', terms: ['machine', 'machinery', 'operator', 'equipment'] },
];

function SkillPassport({ onUseSuggestions }: { onUseSuggestions: (skills: string[]) => void }) {
  const [description, setDescription] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const createSuggestions = () => {
    const normalized = description.toLowerCase();
    const found = skillVocabulary.filter(({ terms }) => terms.some((term) => normalized.includes(term))).map(({ skill }) => skill);
    setSuggestions(found);
  };
  const addSkill = () => {
    const value = newSkill.trim();
    if (value.length >= 2 && !suggestions.some((item) => item.toLowerCase() === value.toLowerCase())) setSuggestions((current) => [...current, value]);
    setNewSkill('');
  };
  return <section className="skill-passport" aria-labelledby="passport-title" data-testid="skill-passport">
    <div className="passport-heading"><div><h3 id="passport-title">Skill Passport</h3><p className="subtle" style={{ margin: 0, fontSize: 12 }}>Describe a task you have done. Review and edit the skill ideas before adding them to your profile.</p></div><span className="rules-badge">Rules-based · AI not configured</span></div>
    <label className="field"><span>What kind of work have you done?</span><textarea className="control" value={description} maxLength={600} onChange={(event) => setDescription(event.target.value)} placeholder="For example: I repaired brick walls, painted rooms and fixed leaking taps." data-testid="input-skill-description" /></label>
    <div className="passport-actions"><button className="button button-secondary button-small" type="button" onClick={createSuggestions} disabled={!description.trim()} data-testid="button-suggest-skills">Suggest skills</button><span className="field-hint" role="status" data-testid="status-skill-parser">Suggestions come from a simple on-device word list, not an AI service.</span></div>
    {suggestions.length > 0 && <div data-testid="list-skill-suggestions"><div className="suggestion-list">{suggestions.map((skill, index) => <span className="suggestion-chip" key={`${skill}-${index}`}><span>{skill}</span><button type="button" aria-label={`Remove ${skill}`} onClick={() => setSuggestions((current) => current.filter((_, itemIndex) => itemIndex !== index))} data-testid={`button-remove-suggestion-${index}`}>×</button></span>)}</div>
      <div className="passport-actions"><label className="sr-only" htmlFor="passport-add-skill">Add a skill suggestion</label><input id="passport-add-skill" className="control" style={{ maxWidth: 230, minHeight: 38 }} value={newSkill} onChange={(event) => setNewSkill(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addSkill(); } }} placeholder="Add another skill" data-testid="input-add-skill-suggestion" /><button className="button button-quiet button-small" type="button" onClick={addSkill} disabled={newSkill.trim().length < 2} data-testid="button-add-skill-suggestion">Add skill</button><button className="button button-small" type="button" onClick={() => onUseSuggestions(suggestions)} data-testid="button-use-suggestions">Use these skills in profile</button></div>
    </div>}
  </section>;
}

function WorkerProfilePage() {
  const { workerId, setActiveWorker } = useWorkerContext();
  const workers = useListWorkers();
  const profile = useGetWorker(workerId, { query: { enabled: !!workerId, queryKey: getGetWorkerQueryKey(workerId) } });
  const createWorker = useCreateWorker();
  const updateWorker = useUpdateWorker();
  const queryClient = useQueryClient();
  const [values, setValues] = useState(defaultWorkerForm);
  const [initializedId, setInitializedId] = useState('');
  const [validation, setValidation] = useState('');
  const mutatePending = createWorker.isPending || updateWorker.isPending;
  useEffect(() => {
    if (profile.data && initializedId !== profile.data.id) {
      const worker = profile.data;
      setValues({ name: worker.name, skills: worker.skills.join(', '), location: worker.location, experienceYears: String(worker.experienceYears), expectedDailyWage: String(worker.expectedDailyWage), availability: worker.availability });
      setInitializedId(worker.id);
    }
  }, [profile.data, initializedId]);
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const skills = values.skills.split(',').map((item) => item.trim()).filter(Boolean);
    if (values.name.trim().length < 2 || values.location.trim().length < 2 || !skills.length || skills.some((item) => item.length < 2) || !values.availability.trim() || Number(values.expectedDailyWage) < 1 || Number(values.experienceYears) < 0) {
      setValidation('Please complete each field. Add at least one skill, a wage above zero, and a valid experience value.');
      return;
    }
    setValidation('');
    const data = { name: values.name.trim(), skills, location: values.location.trim(), experienceYears: Number(values.experienceYears), expectedDailyWage: Number(values.expectedDailyWage), availability: values.availability.trim() };
    const onSaved = (worker: Worker) => {
      setActiveWorker(worker.id);
      setInitializedId(worker.id);
      void queryClient.invalidateQueries({ queryKey: getListWorkersQueryKey() });
      void queryClient.invalidateQueries({ queryKey: getGetWorkerQueryKey(worker.id) });
      void queryClient.invalidateQueries({ queryKey: getListWorkerMatchesQueryKey(worker.id) });
      void queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    };
    if (workerId) updateWorker.mutate({ workerId, data }, { onSuccess: onSaved });
    else createWorker.mutate({ data }, { onSuccess: onSaved });
  };
  const onChange = (key: keyof typeof defaultWorkerForm, value: string) => setValues((current) => ({ ...current, [key]: value }));
  return <div className="fade-in">
    <PageTitle eyebrow="Worker profile" title={workerId ? 'Your work profile' : 'Tell employers what you do.'}>A clear profile helps employers understand your skills. Your details are used to find work that may suit you.</PageTitle>
    {workers.isError && <ErrorNotice error={workers.error} retry={() => void workers.refetch()} />}
    {workerId && profile.isError && <ErrorNotice error={profile.error} retry={() => void profile.refetch()} />}
    {workers.data && workers.data.length > 0 && <section className="panel panel-pad" style={{ marginBottom: 20 }}><label className="field"><span>Choose the worker profile you want to manage</span><select className="control" value={workerId} onChange={(event) => { setActiveWorker(event.target.value); setInitializedId(''); setValues(defaultWorkerForm); }} data-testid="select-active-worker"><option value="">Create a new profile</option>{workers.data.map((worker) => <option key={worker.id} value={worker.id}>{worker.name} · {worker.location}{worker.isDemo ? ' · sample' : ''}</option>)}</select></label></section>}
    {profile.isLoading ? <LoadingCards count={1} /> : <section className="panel panel-pad">
      {profile.data && <div className="profile-summary"><div className="profile-monogram">{profile.data.name.trim().slice(0, 1).toUpperCase()}</div><div><h2>{profile.data.name}</h2><p>{profile.data.location} · {profile.data.experienceYears} years of experience</p></div>{profile.data.isDemo && <span className="badge demo">Sample profile</span>}</div>}
      <h2 className="section-title">{workerId ? 'Update your details' : 'Create your worker profile'}</h2>
      {validation && <p className="form-error" role="alert" data-testid="error-worker-validation">{validation}</p>}
      {(createWorker.isError || updateWorker.isError) && <p className="form-error" role="alert">{messageOf(createWorker.error ?? updateWorker.error)}</p>}
      <form onSubmit={onSubmit}>
        <div className="field-grid">
          <label className="field"><span>Your name</span><input className="control" value={values.name} maxLength={80} required onChange={(event) => onChange('name', event.target.value)} placeholder="Name you want employers to use" data-testid="input-worker-name" /></label>
          <label className="field"><span>Location</span><input className="control" value={values.location} maxLength={120} required onChange={(event) => onChange('location', event.target.value)} placeholder="Town, area or village" data-testid="input-worker-location" /></label>
          <label className="field full"><span>Your skills</span><input className="control" value={values.skills} required onChange={(event) => onChange('skills', event.target.value)} placeholder="For example: masonry, painting, plumbing" data-testid="input-worker-skills" /><span className="field-hint">Separate skills with a comma. Add at least one skill.</span></label>
          <label className="field"><span>Years of experience</span><input className="control" type="number" min="0" max="70" step="1" required value={values.experienceYears} onChange={(event) => onChange('experienceYears', event.target.value)} placeholder="0" data-testid="input-worker-experience" /></label>
          <label className="field"><span>Expected daily wage (₹)</span><input className="control" type="number" min="1" max="1000000" required value={values.expectedDailyWage} onChange={(event) => onChange('expectedDailyWage', event.target.value)} placeholder="For example: 650" data-testid="input-worker-wage" /></label>
          <label className="field full"><span>When are you available?</span><input className="control" value={values.availability} maxLength={120} required onChange={(event) => onChange('availability', event.target.value)} placeholder="For example: weekdays, weekends, or available from 2026-10-25" data-testid="input-worker-availability" /></label>
        </div>
        <SkillPassport onUseSuggestions={(skills) => {
          const current = values.skills.split(',').map((item) => item.trim()).filter(Boolean);
          const merged = [...current];
          skills.forEach((skill) => { if (!merged.some((item) => item.toLowerCase() === skill.toLowerCase())) merged.push(skill); });
          onChange('skills', merged.join(', '));
        }} />
        <div className="form-actions"><button type="submit" className="button" disabled={mutatePending} data-testid="button-save-worker">{mutatePending ? 'Saving your profile…' : workerId ? 'Save changes' : 'Create profile'}</button></div>
      </form>
    </section>}
  </div>;
}

const blankJob = { title: '', description: '', requiredSkills: '', location: '', paymentMin: '', paymentMax: '', paymentUnit: 'day' as 'day' | 'job', workDate: '', employerName: '' };
function HirePage() {
  const createJob = useCreateJob();
  const jobs = useListJobs();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(blankJob);
  const [validation, setValidation] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('');
  const jobDetails = useGetJob(selectedJobId, { query: { enabled: !!selectedJobId, queryKey: getGetJobQueryKey(selectedJobId) } });
  const matches = useListJobMatches(selectedJobId, { query: { enabled: !!selectedJobId, queryKey: getListJobMatchesQueryKey(selectedJobId) } });
  const applications = useListApplications();
  const updateApplication = useUpdateApplication();
  const workers = useListWorkers();
  const setField = (key: keyof typeof blankJob, value: string) => setForm((current) => ({ ...current, [key]: value } as typeof blankJob));
  const onCreate = (event: FormEvent) => {
    event.preventDefault();
    const requiredSkills = form.requiredSkills.split(',').map((skill) => skill.trim()).filter(Boolean);
    if (form.title.trim().length < 4 || form.description.trim().length < 10 || requiredSkills.length < 1 || requiredSkills.some((item) => item.length < 2) || form.location.trim().length < 2 || !form.employerName.trim() || Number(form.paymentMin) < 1 || Number(form.paymentMax) < Number(form.paymentMin) || !form.workDate) {
      setValidation('Check the job details. Add at least one skill, clear pay, a location and a work date. Maximum pay must be at least minimum pay.');
      return;
    }
    setValidation('');
    createJob.mutate({ data: { title: form.title.trim(), description: form.description.trim(), requiredSkills, location: form.location.trim(), paymentMin: Number(form.paymentMin), paymentMax: Number(form.paymentMax), paymentUnit: form.paymentUnit, workDate: form.workDate, employerName: form.employerName.trim() } }, { onSuccess: (job) => {
      setForm(blankJob);
      setSelectedJobId(job.id);
      void queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
      void queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    } });
  };
  const decide = (applicationId: string, status: 'accepted' | 'declined') => updateApplication.mutate({ applicationId, data: { status } }, { onSuccess: () => {
    void queryClient.invalidateQueries({ queryKey: getListApplicationsQueryKey() });
    void queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
  } });
  return <div className="fade-in">
    <PageTitle eyebrow="For employers" title="Hire local talent, fairly.">Share the work, the pay and the date up front. We’ll help you find workers whose skills and location fit.</PageTitle>
    <div className="split-layout">
      <section className="panel panel-pad"><h2 className="section-title">Post a work opportunity</h2>
        {validation && <p className="form-error" role="alert" data-testid="error-job-validation">{validation}</p>}
        {createJob.isError && <p className="form-error" role="alert">{messageOf(createJob.error)}</p>}
        <form onSubmit={onCreate}>
          <div className="field-grid">
            <label className="field full"><span>What work needs doing?</span><input className="control" value={form.title} minLength={4} maxLength={100} required onChange={(event) => setField('title', event.target.value)} placeholder="For example: Repair a courtyard wall" data-testid="input-job-title" /></label>
            <label className="field full"><span>Describe the work</span><textarea className="control" value={form.description} minLength={10} maxLength={1000} required onChange={(event) => setField('description', event.target.value)} placeholder="Explain the main tasks, tools needed and any important details." data-testid="input-job-description" /></label>
            <label className="field full"><span>Skills needed</span><input className="control" value={form.requiredSkills} required onChange={(event) => setField('requiredSkills', event.target.value)} placeholder="For example: masonry, plastering" data-testid="input-job-required-skills" /><span className="field-hint">Separate skills with a comma.</span></label>
            <label className="field"><span>Work location</span><input className="control" value={form.location} maxLength={120} required onChange={(event) => setField('location', event.target.value)} placeholder="Town or area" data-testid="input-job-location" /></label>
            <label className="field"><span>Work starts on</span><input className="control" type="date" min={localDateInputValue()} value={form.workDate} required onChange={(event) => setField('workDate', event.target.value)} data-testid="input-job-date" /></label>
            <label className="field"><span>Minimum pay (₹)</span><input className="control" type="number" min="1" max="1000000" value={form.paymentMin} required onChange={(event) => setField('paymentMin', event.target.value)} placeholder="600" data-testid="input-job-payment-min" /></label>
            <label className="field"><span>Maximum pay (₹)</span><input className="control" type="number" min="1" max="1000000" value={form.paymentMax} required onChange={(event) => setField('paymentMax', event.target.value)} placeholder="800" data-testid="input-job-payment-max" /></label>
            <label className="field"><span>Pay is for</span><select className="control" value={form.paymentUnit} onChange={(event) => setField('paymentUnit', event.target.value)} data-testid="select-job-payment-unit"><option value="day">Each day</option><option value="job">The whole job</option></select></label>
            <label className="field"><span>Your name or business</span><input className="control" value={form.employerName} maxLength={100} required onChange={(event) => setField('employerName', event.target.value)} placeholder="Name workers will see" data-testid="input-employer-name" /></label>
          </div>
          <div className="alert info" style={{ marginTop: 17, marginBottom: 0 }}>Employers are shown as not verified. Make expectations clear and agree on the final details directly.</div>
          <div className="form-actions"><button className="button" disabled={createJob.isPending} data-testid="button-create-job">{createJob.isPending ? 'Posting opportunity…' : 'Post opportunity'}</button></div>
        </form>
      </section>
      <div className="grid">
        <section className="panel panel-pad"><h2 className="section-title">Find matching workers</h2>
          <label className="field"><span>Select one of your listings</span><select className="control" value={selectedJobId} onChange={(event) => setSelectedJobId(event.target.value)} data-testid="select-job-for-matches"><option value="">Choose a listing</option>{jobs.data?.map((job) => <option key={job.id} value={job.id}>{job.title} · {job.location}</option>)}</select></label>
          {selectedJobId && jobDetails.isLoading && <div className="skeleton" style={{ height: 80, marginTop: 12 }} />}
          {selectedJobId && jobDetails.isError && <ErrorNotice error={jobDetails.error} retry={() => void jobDetails.refetch()} />}
          {selectedJobId && jobDetails.data && <div className="alert info" style={{ marginTop: 12, marginBottom: 12 }}><strong>{jobDetails.data.title}</strong> · {jobDetails.data.location} · ₹{money(jobDetails.data.paymentMin)}–₹{money(jobDetails.data.paymentMax)}</div>}
          {!selectedJobId && <p className="subtle" style={{ margin: '12px 0 0', fontSize: 13 }}>Choose a listing to see workers matched by skills and location.</p>}
          {matches.isLoading && selectedJobId && <LoadingCards count={1} />}
          {matches.isError && <ErrorNotice error={matches.error} retry={() => void matches.refetch()} />}
          {selectedJobId && matches.data && (matches.data.length ? <div className="worker-list" style={{ marginTop: 12 }} data-testid="list-worker-matches">{matches.data.map((match) => <div className="worker-row" key={match.worker.id} data-testid={`card-worker-match-${match.worker.id}`}><div><h3>{match.worker.name}</h3><p>{match.worker.location} · {match.worker.experienceYears} years experience · expects ₹{money(match.worker.expectedDailyWage)}/day</p><div className="tag-row">{match.worker.skills.map((item) => <span className="tag" key={item}>{item}</span>)}</div>{match.reasons.length > 0 && <div className="match-reasons">{match.reasons.join(' · ')}</div>}</div><span className="score">{match.score}% fit</span></div>)}</div> : <EmptyState icon={UsersRound} title="No matching workers yet" description="Try another listing or make sure the location and skills are specific." />)}
          {workers.isError && <ErrorNotice error={workers.error} retry={() => void workers.refetch()} />}
        </section>
        <section className="panel panel-pad"><h2 className="section-title">Applications to review</h2>{applications.isLoading ? <LoadingCards count={1} /> : applications.isError ? <ErrorNotice error={applications.error} retry={() => void applications.refetch()} /> : applications.data?.length ? <div data-testid="list-employer-applications">{applications.data.map((item) => <div className="application-row" key={item.id} data-testid={`application-${item.id}`}><div><h3>{item.workerName} · {item.jobTitle}</h3><div className="meta-row"><span className="meta-item"><MapPin />{item.location}</span><span>₹{money(item.paymentMin)}–₹{money(item.paymentMax)} / {item.paymentUnit}</span></div><p className="subtle" style={{ fontSize: 12, margin: '7px 0 0' }}>Employer shown as {item.employerName} · Sent {dateLabel(item.createdAt)}</p></div><div className="application-actions"><span className={`badge ${item.status}`}>{item.status}</span>{item.status === 'pending' && <><button className="button button-small" disabled={updateApplication.isPending} onClick={() => decide(item.id, 'accepted')} data-testid={`button-accept-${item.id}`}>Accept</button><button className="button button-danger button-small" disabled={updateApplication.isPending} onClick={() => decide(item.id, 'declined')} data-testid={`button-decline-${item.id}`}>Decline</button></>}</div></div>)}</div> : <EmptyState icon={FileCheck2} title="No applications yet" description="When a worker shows interest in one of your listings, you can review it here." />}{updateApplication.isError && <p className="form-error">{messageOf(updateApplication.error)}</p>}</section>
      </div>
    </div>
  </div>;
}

function ApplicationsPage() {
  const { workerId } = useWorkerContext();
  const apps = useListWorkerApplications(workerId, { query: { enabled: !!workerId, queryKey: getListWorkerApplicationsQueryKey(workerId) } });
  return <div className="fade-in">
    <PageTitle eyebrow="My applications" title="Keep track of your next step.">See the work you have shown interest in and whether the employer has responded.</PageTitle>
    {!workerId ? <EmptyState icon={UserRound} title="Choose your worker profile first" description="Applications are connected to a worker profile. Set one up or select it to see your application status." action={<Link href="/worker-profile" className="button" data-testid="link-application-profile">Go to worker profile</Link>} /> :
      apps.isLoading ? <LoadingCards /> : apps.isError ? <ErrorNotice error={apps.error} retry={() => void apps.refetch()} /> : apps.data?.length ? <section className="panel panel-pad" data-testid="list-worker-applications">{apps.data.map((item) => <div className="application-row" key={item.id} data-testid={`worker-application-${item.id}`}><div><h3>{item.jobTitle}</h3><div className="meta-row"><span className="meta-item"><MapPin />{item.location}</span><span>{item.employerName}</span><span>₹{money(item.paymentMin)}–₹{money(item.paymentMax)} / {item.paymentUnit}</span></div><p className="subtle" style={{ margin: '8px 0 0', fontSize: 12 }}>You expressed interest on {dateLabel(item.createdAt)}.</p></div><div className="application-actions"><span className={`badge ${item.status}`} data-testid={`status-application-${item.id}`}>{item.status === 'pending' ? 'Waiting for reply' : item.status === 'accepted' ? 'Accepted' : 'Not selected'}</span></div></div>)}</section> : <EmptyState icon={ClipboardList} title="No applications yet" description="When you find a job you like, choose “I am interested”. Your applications will be listed here." action={<Link href="/find-work" className="button" data-testid="link-browse-work">Browse local work</Link>} />}
  </div>;
}

function ReviewPage() {
  const review = useListReviewQueue();
  return <div className="fade-in">
    <PageTitle eyebrow="Community safety" title="Listings waiting for a human review.">A report sends a listing to the review queue. This page shows items awaiting a person’s attention; nothing here is marked approved or resolved.</PageTitle>
    <div className="alert info"><strong>How review works:</strong> A flag is a request to check a listing, not proof that something is wrong. Please avoid sharing private information in a report.</div>
    {review.isLoading ? <LoadingCards /> : review.isError ? <ErrorNotice error={review.error} retry={() => void review.refetch()} /> : review.data?.length ? <div className="job-list" data-testid="list-review-queue">{review.data.map((item) => <article className="panel job-card" key={item.id} data-testid={`review-item-${item.id}`}><div className="job-card-top"><div><div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}><h3>{item.job.title}</h3><span className="badge review">Awaiting human review</span></div><div className="meta-row"><span className="meta-item"><MapPin />{item.job.location}</span><span className="meta-item"><UserRound />{item.job.employerName}</span><span className="badge unverified">Employer not verified</span></div></div><span className="subtle" style={{ fontSize: 12 }}>Flagged {dateLabel(item.createdAt)}</span></div><p className="job-description">{item.job.description}</p><div className="match-reasons"><strong>Reason shared by community</strong>{item.reason}</div></article>)}</div> : <EmptyState icon={ShieldAlert} title="Nothing waiting for review" description="If someone flags a listing, it will appear here for a person to check." />}
  </div>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Router() {
  return <RoutedErrorBoundary><AppShell><Switch>
    <Route path="/" component={DashboardPage} />
    <Route path="/find-work" component={FindWorkPage} />
    <Route path="/worker-profile" component={WorkerProfilePage} />
    <Route path="/hire" component={HirePage} />
    <Route path="/applications" component={ApplicationsPage} />
    <Route path="/review" component={ReviewPage} />
    <Route component={NotFound} />
  </Switch></AppShell></RoutedErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;
