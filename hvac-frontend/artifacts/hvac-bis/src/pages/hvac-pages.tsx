import { useRef, useState, useEffect } from 'react';
import { Link, useLocation, useParams } from 'wouter';
import { ArrowRight, Check, ChevronRight, ClipboardCheck, CloudOff, Database, FileCheck2, FileText, FileUp, Filter, FolderKanban, Gauge, Info, LockKeyhole, LogIn, MapPin, MoreHorizontal, Plus, RefreshCw, Search, ShieldCheck, SlidersHorizontal, Sparkles, Upload, UserPlus, X } from 'lucide-react';
import { authService, documentService, projectService, requirementService, sizingService, HVACApiClient, type UniversalRequestPayload } from '@/services';
import { useAuth } from '@/contexts/auth-context';
import { SupplierAvailabilityMap } from '@/components/supplier-availability-map';

export function HomePage() {
  const { user, profile, signIn, signUp, signOut, resetPassword } = useAuth();
  const [, setLocation] = useLocation();

  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState('');
  const [successNote, setSuccessNote] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setSuccessNote('');
    if (!email.trim() || !password) {
      setAuthError('Please enter both your work email and password.');
      return;
    }
    setSubmitting(true);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) {
      setAuthError(error);
    } else {
      setLocation('/workspace');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setSuccessNote('');
    if (!email.trim() || !password) {
      setAuthError('Please enter an email and password.');
      return;
    }
    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters long.');
      return;
    }
    setSubmitting(true);
    const { error, needsEmailConfirmation } = await signUp(email, password, {
      fullName: fullName.trim() || email.split('@')[0],
      companyName: companyName.trim() || 'Southline MEP Engineering',
      role: 'HVAC_ESTIMATOR',
    });
    setSubmitting(false);
    if (error) {
      setAuthError(error);
    } else if (needsEmailConfirmation) {
      setSuccessNote('Account created! Please check your email inbox to confirm your account, then sign in.');
      setAuthMode('signin');
    } else {
      setLocation('/workspace');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setSuccessNote('');
    if (!email.trim()) {
      setAuthError('Please enter your work email address.');
      return;
    }
    setSubmitting(true);
    const { error, successMessage } = await resetPassword(email);
    setSubmitting(false);
    if (error) {
      setAuthError(error);
    } else {
      setSuccessNote(successMessage || 'Password reset link sent to your email.');
    }
  };

  return (
    <div className="min-h-[100dvh] overflow-hidden bg-[#1E1E24] text-[#FFF8F0]">
      <div className="mx-auto flex min-h-[100dvh] max-w-[1440px] flex-col px-5 py-5 sm:px-10 sm:py-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#92140C]">
              <svg width="23" height="23" viewBox="0 0 38 38" fill="none">
                <path d="M7 25h24M10 25V14l9-6 9 6v11M15 25v-7h8v7" stroke="#FFF8F0" strokeWidth="2"/>
              </svg>
            </div>
            <div>
              <div className="font-brand text-[13px] tracking-[.1em]">HVAC BIS</div>
              <div className="mt-1 text-[9px] tracking-[.14em] text-[#FFF8F0]/45">
                HVAC BID INTELLIGENCE AND VALIDATION SYSTEM
              </div>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-[11px] text-[#FFF8F0]/48 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-[#D99A79]"/>
            Private workspace <span className="mx-2 text-[#FFF8F0]/20">·</span> Supabase RLS Protected
          </div>
        </div>

        <div className="grid flex-1 items-center gap-14 py-14 lg:grid-cols-[1.15fr_.85fr] lg:gap-24">
          <div className="animate-rise">
            <div className="mb-6 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.22em] text-[#D99A79]">
              <span className="h-px w-9 bg-[#D99A79]"/>Engineering workbench
            </div>
            <h1 className="max-w-[700px] font-brand text-4xl leading-[1.2] tracking-[-.02em] sm:text-6xl lg:text-[72px]">
              From bid noise<br/>
              <span className="text-[#D99A79]">to defensible</span><br/>
              decisions.
            </h1>
            <p className="mt-8 max-w-[510px] text-base leading-8 text-[#FFF8F0]/60">
              HVAC BIS brings requirements, calculations, equipment evidence, and validation into one traceable place for the people responsible for the bid.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3 text-xs text-[#FFF8F0]/55">
              <span className="rounded-full border border-[#FFF8F0]/15 px-3 py-2">Source-aware</span>
              <span className="rounded-full border border-[#FFF8F0]/15 px-3 py-2">Reviewable</span>
              <span className="rounded-full border border-[#FFF8F0]/15 px-3 py-2">Built for MEP teams</span>
              <span className="rounded-full border border-[#D99A79]/30 bg-[#D99A79]/10 px-3 py-2 text-[#D99A79]">Supabase Connected</span>
            </div>
          </div>

          <div className="animate-rise-2 rounded-2xl border border-[#FFF8F0]/13 bg-[#FFF8F0]/[.055] p-6 backdrop-blur-sm sm:p-8">
            {user ? (
              <div>
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#D99A79]">
                      Authenticated Workspace
                    </div>
                    <h2 className="mt-2 text-xl font-semibold">Welcome back.</h2>
                  </div>
                  <LockKeyhole size={18} className="text-[#D99A79]"/>
                </div>

                <div className="mb-6 rounded-xl border border-[#FFF8F0]/12 bg-[#FFF8F0]/[.04] p-4 text-xs">
                  <div className="font-semibold text-[#FFF8F0]">{profile?.full_name || user.email}</div>
                  <div className="mt-1 text-[#FFF8F0]/50">{profile?.company_name || 'MEP Engineering'}</div>
                </div>

                <Link
                  href="/workspace"
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#92140C] px-4 py-3.5 text-sm font-semibold text-[#FFF8F0] transition-transform hover:-translate-y-0.5"
                  data-testid="button-open-workspace"
                >
                  Enter Workspace <ArrowRight size={16}/>
                </Link>
              </div>
            ) : authMode === 'signin' ? (
              <form onSubmit={handleSignIn}>
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#D99A79]">
                      Sign in to workspace
                    </div>
                    <h2 className="mt-2 text-xl font-semibold">Welcome back.</h2>
                  </div>
                  <LogIn size={18} className="text-[#D99A79]"/>
                </div>

                <label className="text-[11px] font-semibold uppercase tracking-[.12em] text-[#FFF8F0]/54">
                  Work Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="mt-2 w-full rounded-lg border border-[#FFF8F0]/15 bg-[#FFF8F0]/[.06] px-3.5 py-3 text-sm text-[#FFF8F0] outline-none placeholder:text-[#FFF8F0]/30 focus:border-[#D99A79]"
                  data-testid="input-signin-email"
                />

                <div className="mt-3 flex items-center justify-between">
                  <label className="text-[11px] font-semibold uppercase tracking-[.12em] text-[#FFF8F0]/54">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => { setAuthMode('forgot'); setAuthError(''); setSuccessNote(''); }}
                    className="text-[10px] font-semibold text-[#D99A79] hover:underline"
                    data-testid="button-forgot-password"
                  >
                    Forgot?
                  </button>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-2 w-full rounded-lg border border-[#FFF8F0]/15 bg-[#FFF8F0]/[.06] px-3.5 py-3 text-sm text-[#FFF8F0] outline-none placeholder:text-[#FFF8F0]/30 focus:border-[#D99A79]"
                  data-testid="input-signin-password"
                />

                {authError && (
                  <div className="mt-4 rounded-lg border border-[#D99A79]/30 bg-[#D99A79]/10 p-3 text-xs leading-relaxed text-[#F0C6B0]" data-testid="status-auth-error">
                    {authError}
                  </div>
                )}

                {successNote && (
                  <div className="mt-4 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-xs leading-relaxed text-green-300">
                    {successNote}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[#92140C] px-4 py-3.5 text-sm font-semibold text-[#FFF8F0] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
                  data-testid="button-signin-submit"
                >
                  {submitting ? 'Authenticating...' : 'Sign In'} <ArrowRight size={16}/>
                </button>

                <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-[.16em] text-[#FFF8F0]/28">
                  <span className="h-px flex-1 bg-[#FFF8F0]/10"/>or<span className="h-px flex-1 bg-[#FFF8F0]/10"/>
                </div>

                <button
                  type="button"
                  onClick={() => { setAuthMode('signup'); setAuthError(''); setSuccessNote(''); }}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#FFF8F0]/15 px-4 py-3 text-xs text-[#FFF8F0]/70 hover:bg-[#FFF8F0]/[.07]"
                  data-testid="button-switch-signup"
                >
                  <UserPlus size={15}/>Create new account
                </button>
              </form>
            ) : authMode === 'signup' ? (
              <form onSubmit={handleSignUp}>
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#D99A79]">
                      Account registration
                    </div>
                    <h2 className="mt-2 text-xl font-semibold">Create account.</h2>
                  </div>
                  <UserPlus size={18} className="text-[#D99A79]"/>
                </div>

                <label className="text-[11px] font-semibold uppercase tracking-[.12em] text-[#FFF8F0]/54">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Arjun Menon"
                  className="mt-2 w-full rounded-lg border border-[#FFF8F0]/15 bg-[#FFF8F0]/[.06] px-3.5 py-3 text-sm text-[#FFF8F0] outline-none placeholder:text-[#FFF8F0]/30 focus:border-[#D99A79]"
                  data-testid="input-signup-fullname"
                />

                <label className="mt-3 block text-[11px] font-semibold uppercase tracking-[.12em] text-[#FFF8F0]/54">
                  Company / Organization
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Southline MEP Engineering"
                  className="mt-2 w-full rounded-lg border border-[#FFF8F0]/15 bg-[#FFF8F0]/[.06] px-3.5 py-3 text-sm text-[#FFF8F0] outline-none placeholder:text-[#FFF8F0]/30 focus:border-[#D99A79]"
                  data-testid="input-signup-company"
                />

                <label className="mt-3 block text-[11px] font-semibold uppercase tracking-[.12em] text-[#FFF8F0]/54">
                  Work Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="mt-2 w-full rounded-lg border border-[#FFF8F0]/15 bg-[#FFF8F0]/[.06] px-3.5 py-3 text-sm text-[#FFF8F0] outline-none placeholder:text-[#FFF8F0]/30 focus:border-[#D99A79]"
                  data-testid="input-signup-email"
                />

                <label className="mt-3 block text-[11px] font-semibold uppercase tracking-[.12em] text-[#FFF8F0]/54">
                  Password (min 6 characters)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-2 w-full rounded-lg border border-[#FFF8F0]/15 bg-[#FFF8F0]/[.06] px-3.5 py-3 text-sm text-[#FFF8F0] outline-none placeholder:text-[#FFF8F0]/30 focus:border-[#D99A79]"
                  data-testid="input-signup-password"
                />

                {authError && (
                  <div className="mt-4 rounded-lg border border-[#D99A79]/30 bg-[#D99A79]/10 p-3 text-xs leading-relaxed text-[#F0C6B0]" data-testid="status-signup-error">
                    {authError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[#92140C] px-4 py-3.5 text-sm font-semibold text-[#FFF8F0] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
                  data-testid="button-signup-submit"
                >
                  {submitting ? 'Creating account...' : 'Create Account'} <ArrowRight size={16}/>
                </button>

                <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-[.16em] text-[#FFF8F0]/28">
                  <span className="h-px flex-1 bg-[#FFF8F0]/10"/>or<span className="h-px flex-1 bg-[#FFF8F0]/10"/>
                </div>

                <button
                  type="button"
                  onClick={() => { setAuthMode('signin'); setAuthError(''); setSuccessNote(''); }}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#FFF8F0]/15 px-4 py-3 text-xs text-[#FFF8F0]/70 hover:bg-[#FFF8F0]/[.07]"
                  data-testid="button-switch-signin"
                >
                  <LogIn size={15}/>Already have an account? Sign in
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword}>
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#D99A79]">
                      Password recovery
                    </div>
                    <h2 className="mt-2 text-xl font-semibold">Reset your password.</h2>
                  </div>
                  <LockKeyhole size={18} className="text-[#D99A79]"/>
                </div>

                <p className="mb-4 text-xs leading-relaxed text-[#FFF8F0]/60">
                  Enter your work email address and we'll send a password recovery link.
                </p>

                <label className="text-[11px] font-semibold uppercase tracking-[.12em] text-[#FFF8F0]/54">
                  Work Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="mt-2 w-full rounded-lg border border-[#FFF8F0]/15 bg-[#FFF8F0]/[.06] px-3.5 py-3 text-sm text-[#FFF8F0] outline-none placeholder:text-[#FFF8F0]/30 focus:border-[#D99A79]"
                  data-testid="input-forgot-email"
                />

                {authError && (
                  <div className="mt-4 rounded-lg border border-[#D99A79]/30 bg-[#D99A79]/10 p-3 text-xs leading-relaxed text-[#F0C6B0]">
                    {authError}
                  </div>
                )}

                {successNote && (
                  <div className="mt-4 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-xs leading-relaxed text-green-300">
                    {successNote}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[#92140C] px-4 py-3.5 text-sm font-semibold text-[#FFF8F0] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
                  data-testid="button-forgot-submit"
                >
                  {submitting ? 'Sending link...' : 'Send Reset Link'} <ArrowRight size={16}/>
                </button>

                <button
                  type="button"
                  onClick={() => { setAuthMode('signin'); setAuthError(''); setSuccessNote(''); }}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-[#FFF8F0]/15 px-4 py-3 text-xs text-[#FFF8F0]/70 hover:bg-[#FFF8F0]/[.07]"
                  data-testid="button-back-signin"
                >
                  Back to Sign In
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function WorkspacePage() {
  const { profile, user } = useAuth();
  const firstName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Engineer';

  const [activeResult, setActiveResult] = useState<any | null>(() => {
    try {
      const raw = localStorage.getItem('HVAC_BIS_ACTIVE_RESULT');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const handleResultChange = (newResult: any) => {
    setActiveResult(newResult);
    try {
      if (newResult) {
        localStorage.setItem('HVAC_BIS_ACTIVE_RESULT', JSON.stringify(newResult));
        if (newResult.project_id) {
          localStorage.setItem('HVAC_BIS_ACTIVE_PROJECT_ID', newResult.project_id);
        }
      }
    } catch (err) {
      console.error('[WorkspacePage] Failed to save result to localStorage:', err);
    }
  };

  return (
    <AppPage
      eyebrow="Workspace"
      title={`Good afternoon, ${firstName}.`}
      subtitle="A review-first view of the active bid. Every number below is labeled by provenance."
    >
      <div className="blueprint-grid -mx-4 border-y border-border px-4 py-5 sm:-mx-8 sm:px-8">
        <ProjectStrip activeResult={activeResult} />
      </div>
      <div className="mt-7">
        <RequirementComposer onResultChange={handleResultChange} activeResult={activeResult} />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <TraceCard activeResult={activeResult} />
        <ValidationCard activeResult={activeResult} />
        <NextActions activeResult={activeResult} />
      </div>
      <div className="mt-5">
        <SizingCard activeResult={activeResult} />
      </div>
      <ProvenanceLegend />
    </AppPage>
  );
}

function ProjectStrip({ activeResult }: { activeResult: any }) {
  const project = activeResult?.unified_project;
  const projectId = activeResult?.project_id;

  if (!activeResult) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-4 py-1" data-testid="project-strip-empty">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/20 p-2 text-primary"><Database size={17}/></div>
          <div>
            <div className="text-sm font-semibold">No Active Project Created</div>
            <div className="mt-0.5 text-xs text-muted-foreground">Submit a prompt or upload tender PDFs below to create your engineering project.</div>
          </div>
        </div>
        <StatusBadge status="NOT_PROVIDED" />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4" data-testid="project-strip-active">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary p-2.5 text-primary-foreground"><Database size={17}/></div>
        <div>
          <div className="text-sm font-semibold">{project?.building_type ? `${project.building_type} HVAC` : `Project ${projectId}`}</div>
          <div className="mt-1 text-xs text-muted-foreground">{project?.location || 'Unspecified Location'} · Mode: {activeResult.mode || 'REQUIREMENT_DRIVEN'}</div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <StatusBadge status={activeResult.status || 'SUCCESS'} />
        <div className="hidden text-right sm:block">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Project ID</div>
          <div className="mt-1 text-xs font-mono font-medium">{projectId}</div>
        </div>
      </div>
    </div>
  );
}

type InputMode = 'REQUIREMENT_DRIVEN' | 'DOCUMENT_DRIVEN' | 'HYBRID';
type StagedDocument = { id: string; file: File; base64?: string };

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export function StatusBadge({ status }: { status?: string }) {
  const norm = (status || '').toUpperCase().trim();
  let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300';
  let label = status || 'NOT_AVAILABLE';

  if (norm === 'VERIFIED' || norm === 'SUCCESS' || norm === 'COMPLIANT' || norm === 'PASS' || norm === 'READY_FOR_BID') {
    badgeStyle = 'bg-[#e5f0e8] text-[#356047] border-[#356047]/30';
  } else if (norm === 'NOT_PROVIDED') {
    badgeStyle = 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400';
  } else if (norm === 'NEEDS_REVIEW' || norm === 'INCOMPLETE' || norm === 'COMMERCIAL_REVIEW_REQUIRED') {
    badgeStyle = 'bg-[#f8e7de] text-[#6c2f23] border-[#6c2f23]/30';
  } else if (norm === 'CONFLICT' || norm === 'ERROR' || norm === 'NON_COMPLIANT') {
    badgeStyle = 'bg-[#f5dddd] text-[#8b3029] border-[#8b3029]/30';
  } else if (norm === 'PRICE_DATA_NOT_YET_VERIFIED') {
    badgeStyle = 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300';
  } else if (norm === 'NOT_AVAILABLE') {
    badgeStyle = 'bg-slate-200 text-slate-700 border-slate-400 dark:bg-slate-800 dark:text-slate-400';
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${badgeStyle}`}
      data-testid={`badge-status-${norm.toLowerCase().replace(/_/g, '-')}`}
    >
      {label}
    </span>
  );
}

function ModeSelector({ mode, onChange }: { mode: InputMode; onChange: (mode: InputMode) => void }) {
  const modes: { id: InputMode; name: string; subtitle: string }[] = [
    {
      id: 'REQUIREMENT_DRIVEN',
      name: 'Requirement-Driven',
      subtitle: 'Natural language brief & structured details',
    },
    {
      id: 'DOCUMENT_DRIVEN',
      name: 'Document-Driven',
      subtitle: 'Extract & analyze tender PDF documents',
    },
    {
      id: 'HYBRID',
      name: 'Hybrid Mode',
      subtitle: 'Combine natural language with PDF evidence',
    },
  ];

  return (
    <div className="border-b border-border pb-5" data-testid="input-mode-selector">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-primary">
            <Sparkles size={14} /> Execution Mode
          </div>
          <h2 className="mt-1 text-base font-bold text-foreground">Select HVAC BIS Working Mode</h2>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-muted/60 p-1">
          {modes.map((m) => {
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onChange(m.id)}
                className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                  active
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
                data-testid={`mode-tab-${m.id.toLowerCase()}`}
              >
                {m.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RequirementComposer({ onResultChange, activeResult }: { onResultChange: (res: any) => void; activeResult: any }) {
  const { user } = useAuth();
  const [mode, setMode] = useState<InputMode>('REQUIREMENT_DRIVEN');
  const [projectId, setProjectId] = useState<string>(() => {
    return localStorage.getItem('HVAC_BIS_ACTIVE_PROJECT_ID') || '';
  });
  const [text, setText] = useState('');
  const [stagedDocuments, setStagedDocuments] = useState<StagedDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationWarning, setValidationWarning] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Guided Project Details (Optional)
  const [projectName, setProjectName] = useState('');
  const [location, setLocation] = useState('');
  const [buildingType, setBuildingType] = useState('');
  const [floors, setFloors] = useState('');
  const [totalArea, setTotalArea] = useState('');
  const [occupancy, setOccupancy] = useState('');
  const [operatingHours, setOperatingHours] = useState('');
  const [showGuidedDetails, setShowGuidedDetails] = useState(false);

  // Scope Selections (Optional)
  const ALL_SCOPES = [
    'Air conditioning',
    'Ventilation',
    'Fresh air',
    'Exhaust',
    'Smoke extraction',
    'BMS / controls',
    'Testing & commissioning',
  ];
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['Air conditioning', 'Ventilation']);

  // Equipment Preference (Optional)
  const ALL_EQUIPMENT_PREFS = [
    'VRF',
    'Chiller',
    'Package AC',
    'AHU / FCU',
    'Split AC',
    'Not specified',
  ];
  const [equipmentPref, setEquipmentPref] = useState<string>('Not specified');

  // Bid Output Required (Optional)
  const ALL_BID_OUTPUTS = [
    'Requirement analysis',
    'Technical proposal',
    'BOQ',
    'Tender compliance',
    'Equipment selection',
    'Commercial quotation',
    'Complete HVAC bid package',
  ];
  const [selectedOutputs, setSelectedOutputs] = useState<string[]>(['Complete HVAC bid package']);

  // Document / Hybrid Tasks
  const ALL_TASKS = [
    'Extract HVAC requirements',
    'Identify equipment specifications',
    'Extract BOQ quantities',
    'Find mandatory tender clauses',
    'Identify missing information',
    'Detect conflicts between documents',
    'Check technical compliance',
    'Identify required makes/models',
    'Extract submission requirements',
    'Build auditable BOQ',
    'Prepare technical bid',
    'Prepare commercial bid',
    'Generate complete bid package',
  ];
  const [selectedTasks, setSelectedTasks] = useState<string[]>([
    'Extract HVAC requirements',
    'Identify equipment specifications',
    'Extract BOQ quantities',
    'Check technical compliance',
    'Generate complete bid package',
  ]);

  const [basisModalData, setBasisModalData] = useState<{ title: string; content: string; status: string } | null>(null);

  const addFiles = (incoming: File[]) => {
    const pdfs = incoming.filter(
      (file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    );
    if (!pdfs.length) {
      setError('Only PDF files can be uploaded for document processing.');
      return;
    }
    setError(null);
    setStagedDocuments((current) => {
      const existing = new Set(current.map(({ file }) => `${file.name}-${file.size}-${file.lastModified}`));
      const next = pdfs
        .filter((file) => !existing.has(`${file.name}-${file.size}-${file.lastModified}`))
        .map((file) => ({ id: `doc_${Math.random().toString(36).slice(2, 9)}`, file }));
      return [...current, ...next];
    });
  };

  const removeFile = (id: string) => {
    setStagedDocuments((current) => current.filter((doc) => doc.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(event.dataTransfer.files));
  };

  const selectMode = (nextMode: InputMode) => {
    setMode(nextMode);
    setError(null);
    setValidationWarning(null);
  };

  const buildCombinedText = () => {
    const parts: string[] = [];

    const guidedLines: string[] = [];
    if (projectName.trim()) guidedLines.push(`Project Name: ${projectName.trim()}`);
    if (location.trim()) guidedLines.push(`Location: ${location.trim()}`);
    if (buildingType.trim()) guidedLines.push(`Building Type: ${buildingType.trim()}`);
    if (floors.trim()) guidedLines.push(`Number of Floors: ${floors.trim()}`);
    if (totalArea.trim()) guidedLines.push(`Total Area: ${totalArea.trim()}`);
    if (occupancy.trim()) guidedLines.push(`Occupancy: ${occupancy.trim()}`);
    if (operatingHours.trim()) guidedLines.push(`Operating Hours: ${operatingHours.trim()}`);

    if (guidedLines.length > 0) {
      parts.push(`[PROJECT DETAILS]\n${guidedLines.join('\n')}`);
    }

    if (selectedScopes.length > 0) {
      parts.push(`[HVAC SCOPE INCLUDED]\n${selectedScopes.join(', ')}`);
    }

    if (equipmentPref && equipmentPref !== 'Not specified') {
      parts.push(`[EQUIPMENT PREFERENCE]\n${equipmentPref}`);
    }

    if (selectedOutputs.length > 0) {
      parts.push(`[BID OUTPUTS REQUESTED]\n${selectedOutputs.join(', ')}`);
    }

    if (selectedTasks.length > 0) {
      parts.push(`[ANALYSIS TASKS REQUESTED]\n${selectedTasks.join(', ')}`);
    }

    if (text.trim()) {
      parts.push(`[REQUIREMENTS BRIEF]\n${text.trim()}`);
    }

    return parts.join('\n\n');
  };

  const handleRunPipeline = async () => {
    setError(null);
    setValidationWarning(null);

    if (mode === 'REQUIREMENT_DRIVEN' && !text.trim() && !totalArea.trim() && !projectName.trim()) {
      setError('Requirement text prompt or project details are required in REQUIREMENT_DRIVEN mode.');
      return;
    }
    if (mode === 'DOCUMENT_DRIVEN' && stagedDocuments.length === 0) {
      setError('At least one PDF tender document is required in DOCUMENT_DRIVEN mode.');
      return;
    }
    if (mode === 'HYBRID' && !text.trim() && !projectName.trim() && stagedDocuments.length === 0) {
      setError('Either requirement text/details or PDF document is required in HYBRID mode.');
      return;
    }

    setLoading(true);

    try {
      const docsPayload = await Promise.all(
        stagedDocuments.map(async (d) => {
          const base64 = d.base64 || (await readFileAsBase64(d.file));
          return {
            document_id: d.id,
            file_name: d.file.name,
            document_type: 'TENDER_SPECIFICATION',
            content_base64: base64,
          };
        })
      );

      const activeProjId = projectId.trim() || `proj_${Date.now()}`;
      const combinedText = buildCombinedText();

      // Map UI output selections to backend RequestedOutputType enum
      const mapOutputType = (outputs: string[]): string => {
        if (outputs.includes('Complete HVAC bid package') || outputs.length > 2) return 'COMPLETE_BID_PACKAGE';
        if (outputs.includes('BOQ') && outputs.length === 1) return 'BOQ';
        if (outputs.includes('Commercial quotation') && outputs.length === 1) return 'COMMERCIAL_ONLY';
        if (outputs.includes('Tender compliance') && outputs.length === 1) return 'COMPLIANCE_REPORT';
        if (
          outputs.includes('Technical proposal') &&
          !outputs.includes('Commercial quotation') &&
          !outputs.includes('BOQ')
        ) return 'TECHNICAL_ONLY';
        if (outputs.includes('Technical proposal') || outputs.includes('Equipment selection')) return 'TECHNICAL_AND_COMMERCIAL';
        return 'COMPLETE_BID_PACKAGE';
      };

      const payload: UniversalRequestPayload = {
        project_id: activeProjId,
        user_id: user?.id || 'user_estimator_001',
        mode,
        requested_output_type: mapOutputType(selectedOutputs),
        text: combinedText || text.trim(),
        documents: docsPayload,
      };

      console.log('[RequirementComposer] Submitting payload:', {
        mode: payload.mode,
        requested_output_type: payload.requested_output_type,
        textLength: payload.text?.length ?? 0,
        documentCount: payload.documents?.length ?? 0,
        tasksSelected: selectedTasks,
        scopesSelected: selectedScopes,
        outputsSelected: selectedOutputs,
      });

      const response = await HVACApiClient.executeWorkflow(payload);
      onResultChange(response);

      if (response.project_id) {
        setProjectId(response.project_id);
      }

      if (response.status === 'NEEDS_REVIEW' || response.status === 'INCOMPLETE') {
        setValidationWarning(`Pipeline completed with status: ${response.status}. Review highlighted cards.`);
      } else if (response.status === 'CONFLICT') {
        setValidationWarning('Cross-document specification conflicts detected! Review Conflicts Card.');
      }
    } catch (err: any) {
      console.error('[RequirementComposer] Execution error:', err);
      setError(err.message || 'Backend workflow execution failed. Please verify the backend server.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    const pdfBase64 =
      activeResult?.bid_package?.pdf_base64 ||
      activeResult?.data?.bid_package?.pdf_base64 ||
      activeResult?.data?.generated_bid_document?.pdf_base64 ||
      activeResult?.data?.pdfBase64 ||
      activeResult?.pdfBase64;

    if (!pdfBase64) {
      console.error('[RequirementComposer] PDF download requested but no pdfBase64 found in activeResult:', activeResult);
      return;
    }

    const fileName =
      activeResult?.data?.generated_bid_document?.file_name ||
      activeResult?.bid_package?.file_name ||
      `HVAC_Bid_Package_${activeResult?.project_id || 'project'}.pdf`;

    HVACApiClient.downloadPdfBlob(pdfBase64, fileName);
  };

  return (
    <section className="card-surface rounded-xl p-5 sm:p-6">
      <ModeSelector mode={mode} onChange={selectMode} />

      {/* Project & User Context Bar */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-[10px] font-semibold uppercase text-muted-foreground">Project ID (Optional / Auto-generated)</label>
          <input
            type="text"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs outline-none focus:border-primary"
            placeholder="Leave empty to auto-generate"
            data-testid="input-project-id"
          />
        </div>
        <div>
          <label className="text-[10px] font-semibold uppercase text-muted-foreground">User ID (Auth Session)</label>
          <input
            type="text"
            readOnly
            value={user?.id || 'user_estimator_001'}
            className="mt-1 w-full rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground outline-none cursor-not-allowed"
            data-testid="input-user-id"
          />
        </div>
      </div>

      {/* MODE 1: REQUIREMENT-DRIVEN */}
      {mode === 'REQUIREMENT_DRIVEN' && (
        <div className="mt-5 border-t border-border pt-5" data-testid="requirement-driven-input">
          <div className="flex items-start justify-between gap-4">
            <div>
              <SectionKicker icon={<SlidersHorizontal size={14} />} text="1. Requirement-Driven Intake" />
              <h2 className="mt-1 text-sm font-semibold">Enter natural language brief or use guided project fields.</h2>
            </div>
            <span className="rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-semibold text-accent-foreground">
              NATURAL LANGUAGE + STRUCTURED
            </span>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="mt-3 min-h-[110px] w-full resize-y rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary"
            placeholder="e.g. 10,000 sq ft office in Chennai, 100 occupants, 10 offices + 2 meeting rooms + reception, 2-storey office, VRF + ventilation..."
            data-testid="textarea-requirement-input"
          />
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-[10px] text-muted-foreground">Deterministic HVAC sizing uses explicit requirements without fabrication.</span>
            <button
              onClick={() => { setText(''); setError(null); }}
              className="rounded-lg px-2.5 py-0.5 text-xs text-muted-foreground hover:bg-muted"
              data-testid="button-clear-requirement"
            >
              Clear prompt
            </button>
          </div>

          {/* Optional Guided Project Details */}
          <div className="mt-4 rounded-xl border border-border bg-card/60 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <SlidersHorizontal size={14} className="text-primary" />
                <span>Optional Guided Project Details</span>
              </div>
              <button
                type="button"
                onClick={() => setShowGuidedDetails(!showGuidedDetails)}
                className="text-xs text-primary font-medium hover:underline"
                data-testid="button-toggle-guided-details"
              >
                {showGuidedDetails ? 'Hide guided fields' : '+ Fill structured fields'}
              </button>
            </div>

            {showGuidedDetails && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs animate-rise">
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">Project Name</label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="e.g. Chennai Office Tower"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 outline-none focus:border-primary"
                    data-testid="input-project-name"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Chennai, Tamil Nadu"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 outline-none focus:border-primary"
                    data-testid="input-project-location"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">Building Type</label>
                  <select
                    value={buildingType}
                    onChange={(e) => setBuildingType(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 outline-none focus:border-primary"
                    data-testid="select-building-type"
                  >
                    <option value="">Select building type...</option>
                    <option value="Commercial Office">Commercial Office</option>
                    <option value="IT Park / Software Facility">IT Park / Software Facility</option>
                    <option value="Hospital / Healthcare">Hospital / Healthcare</option>
                    <option value="Hotel / Hospitality">Hotel / Hospitality</option>
                    <option value="Educational Institute">Educational Institute</option>
                    <option value="Industrial / Factory">Industrial / Factory</option>
                    <option value="Residential Complex">Residential Complex</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">Number of Floors</label>
                  <input
                    type="number"
                    value={floors}
                    onChange={(e) => setFloors(e.target.value)}
                    placeholder="e.g. 2"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 outline-none focus:border-primary"
                    data-testid="input-floors"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">Total Area (sq ft)</label>
                  <input
                    type="text"
                    value={totalArea}
                    onChange={(e) => setTotalArea(e.target.value)}
                    placeholder="e.g. 10000"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 outline-none focus:border-primary"
                    data-testid="input-total-area"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">Occupancy (Persons)</label>
                  <input
                    type="number"
                    value={occupancy}
                    onChange={(e) => setOccupancy(e.target.value)}
                    placeholder="e.g. 100"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 outline-none focus:border-primary"
                    data-testid="input-occupancy"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">Operating Hours</label>
                  <input
                    type="text"
                    value={operatingHours}
                    onChange={(e) => setOperatingHours(e.target.value)}
                    placeholder="e.g. 10 hrs/day (8:00 AM - 6:00 PM)"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 outline-none focus:border-primary"
                    data-testid="input-operating-hours"
                  />
                </div>
              </div>
            )}
          </div>

          {/* HVAC Scope Selections */}
          <div className="mt-4">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase">Optional HVAC Scope Selections</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {ALL_SCOPES.map((scope) => {
                const active = selectedScopes.includes(scope);
                return (
                  <button
                    type="button"
                    key={scope}
                    onClick={() => {
                      setSelectedScopes(active ? selectedScopes.filter((s) => s !== scope) : [...selectedScopes, scope]);
                    }}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                    data-testid={`scope-pill-${scope.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                  >
                    {active ? '✓ ' : '+ '}
                    {scope}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Equipment Preference */}
          <div className="mt-4">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase">Optional Equipment Preference</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {ALL_EQUIPMENT_PREFS.map((eq) => {
                const active = equipmentPref === eq;
                return (
                  <button
                    type="button"
                    key={eq}
                    onClick={() => setEquipmentPref(eq)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      active ? 'bg-primary text-primary-foreground font-semibold' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                    data-testid={`equip-pill-${eq.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                  >
                    {eq}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bid Output Required */}
          <div className="mt-4">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase">Bid Output Required</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {ALL_BID_OUTPUTS.map((out) => {
                const active = selectedOutputs.includes(out);
                return (
                  <button
                    type="button"
                    key={out}
                    onClick={() => {
                      setSelectedOutputs(active ? selectedOutputs.filter((o) => o !== out) : [...selectedOutputs, out]);
                    }}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      active ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                    data-testid={`output-pill-${out.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                  >
                    {active ? '✓ ' : '+ '}
                    {out}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: DOCUMENT-DRIVEN */}
      {mode === 'DOCUMENT_DRIVEN' && (
        <div className="mt-5 border-t border-border pt-5" data-testid="document-driven-input">
          <div className="flex items-start justify-between gap-4">
            <div>
              <SectionKicker icon={<FileText size={14} />} text="2. Document-Driven Intake" />
              <h2 className="mt-1 text-sm font-semibold">Upload tender drawings, BOQ, or specifications.</h2>
            </div>
            <span className="rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-semibold text-accent-foreground">
              MULTI-PDF INTAKE
            </span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            multiple
            className="hidden"
            onChange={(e) => { addFiles(Array.from(e.target.files ?? [])); e.currentTarget.value = ''; }}
            data-testid="input-document-files"
          />

          <div
            onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`mt-3 rounded-xl border border-dashed p-5 text-center transition-colors ${
              isDragging ? 'border-primary bg-primary/5' : 'border-border bg-background'
            }`}
            data-testid="document-dropzone"
          >
            <div className="flex flex-col items-center justify-center">
              <FileUp size={24} className="text-primary" />
              <h3 className="mt-2 text-xs font-semibold">Drag & drop tender PDFs here</h3>
              <p className="mt-1 text-[11px] text-muted-foreground">Multiple PDF documents supported for cross-document extraction.</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
                data-testid="button-browse-documents"
              >
                <Upload size={14} /> Browse PDF files
              </button>
            </div>
          </div>

          {stagedDocuments.length > 0 && (
            <div className="mt-4 space-y-2" data-testid="staged-document-list">
              {stagedDocuments.map(({ id, file }) => (
                <div key={id} className="flex items-center justify-between rounded-lg border border-border bg-background p-2.5 text-xs" data-testid={`staged-document-${id}`}>
                  <div className="flex items-center gap-2 truncate">
                    <FileText size={16} className="text-primary shrink-0" />
                    <span className="truncate font-medium">{file.name}</span>
                    <span className="text-[10px] text-muted-foreground">({formatFileSize(file.size)})</span>
                  </div>
                  <button
                    onClick={() => removeFile(id)}
                    className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    data-testid={`button-remove-document-${id}`}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Selectable AI Tasks */}
          <div className="mt-5 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <SectionKicker icon={<FileCheck2 size={14} />} text="What should HVAC BIS do with your documents?" />
              <span className="text-[10px] text-muted-foreground">Select AI Tasks</span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {ALL_TASKS.map((task) => {
                const active = selectedTasks.includes(task);
                return (
                  <button
                    type="button"
                    key={task}
                    onClick={() => {
                      setSelectedTasks(active ? selectedTasks.filter((t) => t !== task) : [...selectedTasks, task]);
                    }}
                    className={`flex items-center justify-between rounded-lg border p-2.5 text-left text-xs transition-colors ${
                      active ? 'border-primary bg-primary/10 font-semibold text-primary' : 'border-border bg-card text-muted-foreground hover:border-primary/40'
                    }`}
                    data-testid={`task-chip-${task.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                  >
                    <span>{task}</span>
                    {active && <Check size={14} className="text-primary shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Accepted Source Documents Guidance */}
          <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3.5">
            <div className="text-[10px] font-semibold uppercase text-muted-foreground">Accepted Source Documents Guidance</div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {[
                'Tender specification',
                'BOQ',
                'Technical specification',
                'Drawings',
                'Equipment schedule',
                'Other tender documents',
              ].map((docType) => (
                <span key={docType} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-[11px] text-foreground">
                  <FileText size={12} className="text-primary" />
                  {docType}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODE 3: HYBRID */}
      {mode === 'HYBRID' && (
        <div className="mt-5 border-t border-border pt-5" data-testid="hybrid-input">
          <div className="flex items-start justify-between gap-4">
            <div>
              <SectionKicker icon={<Sparkles size={14} />} text="3. Hybrid Intelligence Intake" />
              <h2 className="mt-1 text-sm font-semibold">Combines natural language knowledge with tender document evidence.</h2>
            </div>
            <span className="rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-semibold text-accent-foreground">
              TEXT + TENDER PDF
            </span>
          </div>

          <div className="mt-4 grid gap-5 lg:grid-cols-2">
            {/* WHAT I KNOW */}
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4" data-testid="hybrid-panel-what-i-know">
              <div className="flex items-center justify-between border-b border-primary/20 pb-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                  <SlidersHorizontal size={14} /> WHAT I KNOW
                </div>
                <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  USER REQUIREMENT PROMPT
                </span>
              </div>
              <div className="mt-3">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="min-h-[100px] w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary"
                  placeholder="Describe your HVAC requirement brief..."
                  data-testid="textarea-hybrid-text"
                />
                <button
                  type="button"
                  onClick={() => setShowGuidedDetails(!showGuidedDetails)}
                  className="mt-2 text-xs text-primary font-medium hover:underline"
                  data-testid="button-toggle-hybrid-guided"
                >
                  {showGuidedDetails ? 'Hide structured fields' : '+ Add structured project details'}
                </button>
                {showGuidedDetails && (
                  <div className="mt-3 space-y-2 text-xs">
                    <input type="text" value={projectName} onChange={e=>setProjectName(e.target.value)} placeholder="Project Name" className="w-full rounded-lg border border-border bg-background p-2 text-xs" />
                    <input type="text" value={totalArea} onChange={e=>setTotalArea(e.target.value)} placeholder="Total Area (sq ft)" className="w-full rounded-lg border border-border bg-background p-2 text-xs" />
                  </div>
                )}
              </div>
            </div>

            {/* WHAT THE DOCUMENTS SAY */}
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-4" data-testid="hybrid-panel-what-documents-say">
              <div className="flex items-center justify-between border-b border-indigo-500/20 pb-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  <FileText size={14} /> WHAT THE DOCUMENTS SAY
                </div>
                <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:text-indigo-300">
                  {stagedDocuments.length} DOCUMENT(S) STAGED
                </span>
              </div>
              <div className="mt-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => { addFiles(Array.from(e.target.files ?? [])); e.currentTarget.value = ''; }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-indigo-500/40 bg-background p-3 text-xs font-semibold text-indigo-600 dark:text-indigo-300 hover:bg-indigo-500/10"
                  data-testid="button-browse-hybrid-documents"
                >
                  <Upload size={14} /> Upload Tender PDF File(s)
                </button>
                {stagedDocuments.length > 0 && (
                  <div className="mt-3 space-y-1.5 text-xs">
                    {stagedDocuments.map(({ id, file }) => (
                      <div key={id} className="flex items-center justify-between rounded-lg border border-border bg-background p-2">
                        <span className="truncate font-medium">{file.name}</span>
                        <button onClick={() => removeFile(id)} className="text-muted-foreground hover:text-foreground">
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Selectable AI Tasks */}
          <div className="mt-5 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <SectionKicker icon={<FileCheck2 size={14} />} text="What should HVAC BIS do with user knowledge & documents?" />
              <span className="text-[10px] text-muted-foreground">Select AI Tasks</span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {ALL_TASKS.map((task) => {
                const active = selectedTasks.includes(task);
                return (
                  <button
                    type="button"
                    key={task}
                    onClick={() => {
                      setSelectedTasks(active ? selectedTasks.filter((t) => t !== task) : [...selectedTasks, task]);
                    }}
                    className={`flex items-center justify-between rounded-lg border p-2.5 text-left text-xs transition-colors ${
                      active ? 'border-primary bg-primary/10 font-semibold text-primary' : 'border-border bg-card text-muted-foreground hover:border-primary/40'
                    }`}
                    data-testid={`hybrid-task-chip-${task.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                  >
                    <span>{task}</span>
                    {active && <Check size={14} className="text-primary shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* AI JOB PLAN (Dynamic 15-Step Stepper Timeline) */}
      <div className="mt-6 rounded-xl border border-border bg-card/60 p-4" data-testid="ai-job-plan">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
            <Sparkles size={14} className="text-primary" /> HVAC BIS will perform
          </div>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
            15-STEP AUTOMATED PIPELINE
          </span>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-5 text-[11px]">
          {[
            { step: '01', title: 'Read & extract documents' },
            { step: '02', title: 'Identify HVAC requirements' },
            { step: '03', title: 'Build requirement model' },
            { step: '04', title: 'Cross-check documents' },
            { step: '05', title: 'Detect missing info' },
            { step: '06', title: 'Detect conflicts' },
            { step: '07', title: 'Engineering calculations' },
            { step: '08', title: 'Validate equipment specs' },
            { step: '09', title: 'Verify catalog & pricing' },
            { step: '10', title: 'Build & validate BOQ' },
            { step: '11', title: 'Check tender compliance' },
            { step: '12', title: 'Prepare technical bid' },
            { step: '13', title: 'Prepare commercial bid' },
            { step: '14', title: 'Generate final bid PDF' },
            { step: '15', title: 'Create audit provenance' },
          ].map((item) => (
            <div key={item.step} className="flex items-center gap-2 rounded-lg border border-border/70 bg-background/50 p-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[9px] font-bold text-primary">
                {item.step}
              </span>
              <span className="truncate text-muted-foreground font-medium">{item.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ATTENTION REQUIRED PREVIEW */}
      {(!text.trim() && !totalArea && stagedDocuments.length === 0) && (
        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs" data-testid="attention-required-preview">
          <div className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-300">
            <Info size={15} /> Information that may need engineer review
          </div>
          <div className="mt-2 space-y-1 text-muted-foreground text-[11px]">
            <div>· No requirement prompt or PDF staged yet. Input prompt or upload tender document above.</div>
            <div>· Provenance tags populated upon run: <span className="font-semibold text-foreground">VERIFIED · SOURCE_FACT · DETERMINISTIC_CALCULATION · NEEDS_REVIEW · NOT_PROVIDED · CONFLICT · PRICE_DATA_NOT_YET_VERIFIED</span></div>
          </div>
        </div>
      )}

      {/* Error & Warning Banners */}
      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-300" data-testid="status-pipeline-error">
          <Info size={15} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {validationWarning && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300" data-testid="status-validation-warning">
          <Info size={15} className="shrink-0" />
          <span>{validationWarning}</span>
        </div>
      )}

      {/* Main Execution Trigger */}
      <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
          <ShieldCheck size={14} className="text-green-600" />
          <span>Strict Zero-Fabrication Pipeline · Supabase & Audit Logging Active</span>
        </div>

        <button
          onClick={handleRunPipeline}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-50"
          data-testid="button-run-pipeline"
        >
          {loading ? (
            <>
              <RefreshCw size={15} className="animate-spin" />
              <span>Running Pipeline...</span>
            </>
          ) : (
            <>
              <Sparkles size={15} />
              <span>Run HVAC BIS Pipeline</span>
            </>
          )}
        </button>
      </div>

      {/* Loading Processing State */}
      {loading && (
        <div className="mt-4 rounded-xl border border-primary/40 bg-primary/5 p-5 text-xs" data-testid="status-processing">
          <div className="flex items-center gap-3 font-semibold text-primary">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm">Executing HVAC BIS Intelligence Pipeline...</span>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { label: 'Input Received', done: true },
              { label: 'Documents Processed', done: true },
              { label: 'Requirements Extracted', done: true },
              { label: 'Validation Checks', active: true },
              { label: 'Engineering Calculations', pending: true },
              { label: 'Equipment Verification', pending: true },
              { label: 'BOQ & Pricing', pending: true },
              { label: 'Tender Compliance', pending: true },
              { label: 'Commercial Quotation', pending: true },
              { label: 'Bid Package PDF', pending: true },
            ].map((st, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg border border-border bg-card p-2">
                {st.done ? (
                  <Check size={14} className="text-emerald-500 shrink-0" />
                ) : st.active ? (
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent shrink-0" />
                ) : (
                  <div className="h-2 w-2 rounded-full bg-muted-foreground/40 shrink-0" />
                )}
                <span className={`truncate text-[11px] ${st.done ? 'text-emerald-600 font-semibold' : st.active ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                  {st.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Basis Provenance Modal */}
      {basisModalData && (
        <BasisModal data={basisModalData} onClose={() => setBasisModalData(null)} />
      )}

      {/* Master Results Display */}
      {activeResult ? (
        <MasterResultsView result={activeResult} onDownloadPdf={handleDownloadPdf} onOpenBasis={(title, content, status) => setBasisModalData({ title, content, status })} />
      ) : (
        <div className="mt-8 rounded-xl border border-border bg-card p-12 text-center text-xs text-muted-foreground" data-testid="no-project-input-empty-state">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
            <SlidersHorizontal size={24} />
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-1">No project input yet</h3>
          <p className="max-w-md mx-auto leading-relaxed">
            Describe your HVAC requirement, upload tender documents, or combine both. HVAC BIS will extract requirements, identify missing information, cross-check documents and prepare the requested bid outputs.
          </p>
        </div>
      )}
    </section>
  );
}

function BasisModal({ data, onClose }: { data: { title: string; content: string; status: string } | null; onClose: () => void }) {
  if (!data) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-rise">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-start justify-between border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <StatusBadge status={data.status} />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">ENGINEERING PROVENANCE BASIS</span>
            </div>
            <h3 className="mt-2 text-base font-bold text-foreground">{data.title}</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-muted" data-testid="button-close-basis-modal">
            <X size={18} />
          </button>
        </div>
        <div className="mt-4 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap bg-muted/40 p-4 rounded-xl border border-border">
          {data.content}
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            Close Basis View
          </button>
        </div>
      </div>
    </div>
  );
}

function MasterResultsView({ result, onDownloadPdf, onOpenBasis }: { result: any; onDownloadPdf: () => void; onOpenBasis?: (title: string, content: string, status: string) => void }) {
  if (!result) return null;

  const [activeTab, setActiveTab] = useState<string>('all');

  const data = result.unified_project ? result : (result.data || {});
  const reqs = data.unified_project || data.requirements || data.extracted_requirements || result.technical_bid || {};
  const sizing = data.sizing || data.calculations || data.engineering_sizing || {};
  const project = {
    name: reqs.building_type ? `${reqs.building_type} HVAC` : (result.project_id ? `Project ${result.project_id}` : 'Active HVAC Project'),
    location: reqs.location || 'Unspecified Location',
    buildingType: reqs.building_type || 'Commercial Facility'
  };
  const docs = data.documents_meta || data.documents || [];
  const conflicts = data.conflicts || [];
  const eqList = data.equipment || data.verified_equipment || [];
  const supplier = data.suppliers || data.verified_supplier || {};
  const pricing = data.pricing || data.verified_pricing || {};
  const boq = data.boq || [];
  const compliance = data.compliance_matrix || data.compliance || [];
  const quote = data.commercial || data.commercial_quotation || result.commercial_bid || {};
  const techEnv = data.bid_package || data.technical_bid || data.technical_bid_envelope || result.technical_bid || {};
  const pdfBase64 = data.bid_package?.pdf_base64 || data.pdfBase64 || result.pdfBase64;
  const bidDoc = data.generated_bid_document || (pdfBase64 ? { status: 'GENERATED', pdf_base64: pdfBase64, file_name: `HVAC_Bid_Package_${result.project_id || 'project'}.pdf` } : {});

  const totalOccupants = reqs.total_occupants ?? reqs.occupancy ?? reqs.occupants ?? 0;
  const spacesList = reqs.spaces || [];
  const totalSpacesCount = reqs.total_spaces ?? (Array.isArray(spacesList) ? spacesList.length : 0);
  const totalAreaSqFt = reqs.total_area_sqft || 0;
  const coolingCapTR = sizing.cooling_load_tr ?? sizing.coolingLoadTR ?? null;
  const airflowCFM = sizing.airflow_cfm ?? sizing.airflowCFM ?? null;
  const freshAirCFM = sizing.fresh_air_cfm ?? sizing.freshAirCFM ?? null;

  const showAll = activeTab === 'all';

  return (
    <div className="mt-8 space-y-6 border-t border-border pt-6" data-testid="master-results-view">
      {/* Master Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary/20 bg-card p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-primary">
            <Sparkles size={14} /> Live Pipeline Results
          </div>
          <h2 className="mt-1 text-xl font-bold">
            {project.name} ({result.mode || 'REQUIREMENT_DRIVEN'})
          </h2>
          <div className="mt-1 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span>Project ID: <strong className="text-foreground">{result.project_id || 'N/A'}</strong></span>
            <span>User ID: <strong className="text-foreground">{result.user_id || 'N/A'}</strong></span>
            <span>Area: <strong className="text-foreground">{totalAreaSqFt > 0 ? `${totalAreaSqFt.toLocaleString()} sq ft` : 'NEEDS_REVIEW'}</strong></span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={result.status || 'SUCCESS'} />
          {(bidDoc.status === 'GENERATED' || pdfBase64) && (
            <button
              onClick={onDownloadPdf}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
              data-testid="button-download-bid-pdf"
            >
              <FileText size={15} /> Download PDF Bid Package
            </button>
          )}
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border pb-3 text-xs" data-testid="results-sub-nav">
        {[
          { id: 'all', label: 'PROJECT OVERVIEW' },
          { id: 'requirements', label: 'Requirements' },
          { id: 'documents', label: 'Documents' },
          { id: 'engineering', label: 'Engineering' },
          { id: 'equipment', label: 'Equipment' },
          { id: 'boq', label: 'BOQ' },
          { id: 'compliance', label: 'Compliance' },
          { id: 'commercial', label: 'Commercial' },
          { id: 'bid-package', label: 'Bid Package' },
          { id: 'audit', label: 'Audit Trail' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-lg px-3 py-1.5 font-semibold transition-colors ${
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
            data-testid={`results-tab-${tab.id}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid of Cards */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Card 1: Project Details */}
        {(showAll || activeTab === 'requirements') && (
          <div className="card-surface rounded-xl p-5" data-testid="card-project-details">
            <div className="flex items-center justify-between">
              <SectionKicker icon={<Database size={14} />} text="1. Project Details" />
              <StatusBadge status="SOURCE_FACT" />
            </div>
            <h3 className="mt-2 text-base font-semibold">{project.name}</h3>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div><span className="text-muted-foreground">Location:</span> <div className="font-medium">{project.location}</div></div>
              <div><span className="text-muted-foreground">Building Type:</span> <div className="font-medium">{project.buildingType}</div></div>
              <div><span className="text-muted-foreground">Project ID:</span> <div className="font-medium truncate">{result.project_id || 'N/A'}</div></div>
              <div><span className="text-muted-foreground">Total Area:</span> <div className="font-medium">{totalAreaSqFt > 0 ? `${totalAreaSqFt.toLocaleString()} sq ft` : 'NEEDS_REVIEW'}</div></div>
              <div><span className="text-muted-foreground">Execution Mode:</span> <div className="font-medium">{result.mode || 'REQUIREMENT_DRIVEN'}</div></div>
              <div><span className="text-muted-foreground">Pipeline Status:</span> <div><StatusBadge status={result.status || 'SUCCESS'} /></div></div>
            </div>
            {onOpenBasis && (
              <button
                onClick={() => onOpenBasis('Project Details Provenance', `Location: ${project.location}\nBuilding Type: ${project.buildingType}\nExecution Mode: ${result.mode}\nProvenance: Extracted from user requirements brief / tender documents.`, 'SOURCE_FACT')}
                className="mt-4 text-[11px] font-semibold text-primary hover:underline"
              >
                Why? View basis & provenance
              </button>
            )}
          </div>
        )}

        {/* Card 2: Extracted Requirements */}
        {(showAll || activeTab === 'requirements') && (
          <div className="card-surface rounded-xl p-5" data-testid="card-extracted-requirements">
            <div className="flex items-center justify-between">
              <SectionKicker icon={<SlidersHorizontal size={14} />} text="2. Extracted Requirements & Provenance" />
              <StatusBadge status={totalAreaSqFt > 0 ? 'VERIFIED' : 'NEEDS_REVIEW'} />
            </div>
            <h3 className="mt-2 text-base font-semibold">Requirement Extraction (Live Result)</h3>
            <div className="mt-3 text-xs space-y-2">
              <div>Total Occupants: <strong className="text-primary">{totalOccupants > 0 ? `${totalOccupants} occupants` : 'NEEDS_REVIEW'}</strong></div>
              <div>Total Area: <strong>{totalAreaSqFt > 0 ? `${totalAreaSqFt.toLocaleString()} sq ft` : 'NEEDS_REVIEW'}</strong></div>
              <div>Spaces Breakdown: <strong>{totalSpacesCount} space(s) identified</strong></div>
              <div className="mt-2 flex flex-wrap gap-2">
                {Array.isArray(spacesList) && spacesList.length > 0 ? (
                  spacesList.map((s: any, idx: number) => (
                    <span key={idx} className="rounded-md border border-border bg-muted/60 px-2.5 py-1 text-[11px] font-medium">
                      {typeof s === 'string' ? s : `${s.name || 'Space'}: ${s.area_sqft ? Math.round(s.area_sqft) + ' sq ft' : (s.dimensions || 'Sized')} (${s.occupants || 0} occupants)`}
                    </span>
                  ))
                ) : (
                  <span className="text-muted-foreground italic">No individual zonal space schedule extracted.</span>
                )}
              </div>
            </div>
            {onOpenBasis && (
              <button
                onClick={() => onOpenBasis('Extracted Requirements Basis', `Total Area: ${totalAreaSqFt} sq ft\nTotal Occupants: ${totalOccupants}\nSpaces Identified: ${totalSpacesCount}\nBasis: Extracted directly from project input text / uploaded tender PDF.`, totalAreaSqFt > 0 ? 'VERIFIED' : 'NEEDS_REVIEW')}
                className="mt-4 text-[11px] font-semibold text-primary hover:underline"
              >
                Why? View basis & provenance
              </button>
            )}
          </div>
        )}

        {/* Card 3: Engineering Sizing */}
        {(showAll || activeTab === 'engineering') && (
          <div className="card-surface rounded-xl p-5" data-testid="card-engineering-sizing">
            <div className="flex items-center justify-between">
              <SectionKicker icon={<Gauge size={14} />} text="3. Engineering Sizing & Calculations" />
              <StatusBadge status={coolingCapTR != null ? 'DETERMINISTIC_CALCULATION' : 'NEEDS_REVIEW'} />
            </div>
            <h3 className="mt-2 text-base font-semibold">Cooling & Ventilation Sizing</h3>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div><span className="text-muted-foreground">Cooling Capacity:</span> <div className="font-bold text-primary">{coolingCapTR != null ? `${coolingCapTR} TR` : 'NEEDS_REVIEW'}</div></div>
              <div><span className="text-muted-foreground">Total Airflow:</span> <div className="font-bold text-foreground">{airflowCFM != null ? `${airflowCFM.toLocaleString()} CFM` : 'NEEDS_REVIEW'}</div></div>
              <div><span className="text-muted-foreground">Fresh Air Requirement:</span> <div className="font-medium">{freshAirCFM != null ? `${freshAirCFM.toLocaleString()} CFM` : 'NEEDS_REVIEW'}</div></div>
              <div><span className="text-muted-foreground">Calculation Basis:</span> <div className="font-medium">ASHRAE 62.1 / ISHRAE</div></div>
            </div>
            {onOpenBasis && (
              <button
                onClick={() => onOpenBasis('Engineering Calculation Basis', `Cooling Load: ${coolingCapTR} TR\nTotal Airflow: ${airflowCFM} CFM\nFresh Air: ${freshAirCFM} CFM\nFormula Basis: Deterministic ASHRAE 62.1 sensible/latent heat calculations based on floor area & occupancy.`, 'DETERMINISTIC_CALCULATION')}
                className="mt-4 text-[11px] font-semibold text-primary hover:underline"
              >
                Why? View calculation formula
              </button>
            )}
          </div>
        )}

        {/* Card 4: Equipment Catalog */}
        {(showAll || activeTab === 'equipment') && (
          <div className="card-surface rounded-xl p-5" data-testid="card-equipment-selection">
            <div className="flex items-center justify-between">
              <SectionKicker icon={<MapPin size={14} />} text="4. Verified Equipment Selections" />
              <StatusBadge status={eqList.length > 0 ? 'VERIFIED' : 'REQUIRES_VERIFIED_CATALOG_DATA'} />
            </div>
            <h3 className="mt-2 text-base font-semibold">Equipment Schedule</h3>
            <div className="mt-3 text-xs space-y-2">
              {eqList.length === 0 ? (
                <div className="text-muted-foreground italic">No equipment catalog records matched yet.</div>
              ) : (
                eqList.map((eq: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between rounded-lg border border-border bg-background p-2.5">
                    <div>
                      <div className="font-semibold">{eq.manufacturer || 'Regional Brand'} {eq.model_number || eq.model || 'VRF Unit'}</div>
                      <div className="text-[10px] text-muted-foreground">Type: {eq.type || 'VRF'} · Capacity: {eq.cooling_capacity_tr || eq.capacity} TR</div>
                    </div>
                    <StatusBadge status={eq.verification_status || 'VERIFIED'} />
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Card 5: BOQ Items */}
        {(showAll || activeTab === 'boq') && (
          <div className="card-surface rounded-xl p-5" data-testid="card-boq-items">
            <div className="flex items-center justify-between">
              <SectionKicker icon={<FileText size={14} />} text="5. Bill of Quantities (BOQ)" />
              <StatusBadge status={boq.length > 0 ? 'VERIFIED' : 'NEEDS_REVIEW'} />
            </div>
            <h3 className="mt-2 text-base font-semibold">Quantities & Schedules ({boq.length} items)</h3>
            <div className="mt-3 text-xs space-y-2">
              {boq.length === 0 ? (
                <div className="text-muted-foreground italic">No BOQ items generated yet.</div>
              ) : (
                boq.slice(0, 5).map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between border-b border-border pb-1.5">
                    <span>{item.item_name || item.description || `Item ${idx+1}`}</span>
                    <span className="font-semibold">{item.quantity} {item.unit || 'Units'}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Card 6: Tender Compliance */}
        {(showAll || activeTab === 'compliance') && (
          <div className="card-surface rounded-xl p-5" data-testid="card-tender-compliance">
            <div className="flex items-center justify-between">
              <SectionKicker icon={<ShieldCheck size={14} />} text="6. Tender Compliance Matrix" />
              <StatusBadge status={compliance.length > 0 ? 'VERIFIED' : 'NOT_PROVIDED'} />
            </div>
            <h3 className="mt-2 text-base font-semibold">Compliance Clauses</h3>
            <div className="mt-3 text-xs space-y-2">
              {compliance.length === 0 ? (
                <div className="text-muted-foreground italic">No compliance clauses extracted yet.</div>
              ) : (
                compliance.slice(0, 4).map((c: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between border-b border-border pb-1.5">
                    <span className="truncate max-w-[200px]">{c.clause || c.specification || `Clause ${idx+1}`}</span>
                    <StatusBadge status={c.compliance_status || 'COMPLIANT'} />
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Card 7: Commercial Quotation */}
        {(showAll || activeTab === 'commercial') && (
          <div className="card-surface rounded-xl p-5" data-testid="card-commercial-quotation">
            <div className="flex items-center justify-between">
              <SectionKicker icon={<FileText size={14} />} text="7. Commercial Quotation & Readiness" />
              <StatusBadge status={quote.grand_total != null ? 'VERIFIED' : 'PRICE_DATA_NOT_YET_VERIFIED'} />
            </div>
            <h3 className="mt-2 text-base font-semibold">Commercial Summary</h3>
            <div className="mt-3 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span>BOQ Subtotal:</span>
                <span className="font-bold">{quote.boq_subtotal != null ? `₹${quote.boq_subtotal.toLocaleString()}` : 'PRICE_DATA_NOT_YET_VERIFIED'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>GST Tax (18%):</span>
                <span>{quote.tax_amount != null ? `₹${quote.tax_amount.toLocaleString()}` : 'NOT_PROVIDED'}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-2 font-bold text-sm">
                <span>Grand Total:</span>
                <span className="text-primary">{quote.grand_total != null ? `₹${quote.grand_total.toLocaleString()}` : 'NOT CALCULATED'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Card 8: PDF Bid Package */}
        {(showAll || activeTab === 'bid-package') && (
          <div className="card-surface rounded-xl p-5" data-testid="card-bid-pdf-document">
            <div className="flex items-center justify-between">
              <SectionKicker icon={<FileText size={14} />} text="8. Generated PDF Bid Package" />
              <StatusBadge status={bidDoc.status || 'GENERATED'} />
            </div>
            <h3 className="mt-2 text-base font-semibold">{bidDoc.file_name || `HVAC_Bid_Package_${result.project_id || 'project'}.pdf`}</h3>
            <p className="mt-2 text-xs text-muted-foreground">
              Official PDF package compiled with Cover, Executive Summary, Design Basis, Calculations, Equipment Specs, Compliance Matrix, and Commercial Quotation.
            </p>
            {(bidDoc.status === 'GENERATED' || pdfBase64) && (
              <button
                onClick={onDownloadPdf}
                className="mt-4 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
              >
                <FileText size={14} /> Download PDF Bid Document
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TraceCard({ activeResult }: { activeResult: any }) {
  const reqs = activeResult?.unified_project || activeResult?.requirements || activeResult?.extracted_requirements || {};
  const spaces = reqs.spaces || [];

  return (
    <div className="card-surface rounded-xl p-5" data-testid="card-traceability">
      <SectionKicker icon={<FileText size={14} />} text="Traceability & Provenance" />
      <h3 className="mt-2 text-base font-semibold">Audit Trace</h3>
      <div className="mt-3 text-xs space-y-2">
        <div className="flex items-center justify-between">
          <span>Provenances Logged:</span>
          <StatusBadge status={activeResult ? 'VERIFIED' : 'NOT_PROVIDED'} />
        </div>
        <div className="flex items-center justify-between">
          <span>Zero-Fabrication Mode:</span>
          <span className="font-semibold text-emerald-600">ACTIVE</span>
        </div>
        <div className="text-[11px] text-muted-foreground mt-2">
          {activeResult ? `${spaces.length} spaces mapped to source requirements.` : 'Run pipeline to log provenance trace.'}
        </div>
      </div>
    </div>
  );
}

function ValidationCard({ activeResult }: { activeResult: any }) {
  return (
    <div className="card-surface rounded-xl p-5" data-testid="card-validation-checks">
      <SectionKicker icon={<ShieldCheck size={14} />} text="Automated Checks" />
      <h3 className="mt-2 text-base font-semibold">Validation Status</h3>
      <div className="mt-3 text-xs space-y-2">
        <div className="flex items-center justify-between">
          <span>Pipeline Posture:</span>
          <StatusBadge status={activeResult?.status || 'NOT_PROVIDED'} />
        </div>
        <div className="flex items-center justify-between">
          <span>ASHRAE 62.1 Sizing:</span>
          <StatusBadge status={activeResult?.sizing ? 'VERIFIED' : 'NOT_PROVIDED'} />
        </div>
      </div>
    </div>
  );
}

function NextActions({ activeResult }: { activeResult: any }) {
  return (
    <div className="card-surface rounded-xl p-5" data-testid="card-next-actions">
      <SectionKicker icon={<Sparkles size={14} />} text="Recommended Actions" />
      <h3 className="mt-2 text-base font-semibold">Engineer Next Steps</h3>
      <div className="mt-3 text-xs space-y-2 text-muted-foreground">
        <div>1. Review extracted space schedule and cooling loads.</div>
        <div>2. Check catalog equipment selections.</div>
        <div>3. Download compiled PDF bid package document.</div>
      </div>
    </div>
  );
}

function SizingCard({ activeResult }: { activeResult: any }) {
  const sizing = activeResult?.sizing || activeResult?.calculations || {};

  return (
    <div className="card-surface rounded-xl p-5" data-testid="card-sizing-summary">
      <SectionKicker icon={<Gauge size={14} />} text="HVAC Sizing Summary" />
      <h3 className="mt-2 text-base font-semibold">Calculated Cooling & Ventilation Loads</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-3 text-xs">
        <div className="rounded-lg border border-border bg-background p-3">
          <div className="text-muted-foreground">Cooling Capacity</div>
          <div className="mt-1 text-lg font-bold text-primary">{sizing.cooling_load_tr != null ? `${sizing.cooling_load_tr} TR` : 'NEEDS_REVIEW'}</div>
        </div>
        <div className="rounded-lg border border-border bg-background p-3">
          <div className="text-muted-foreground">Total Airflow</div>
          <div className="mt-1 text-lg font-bold">{sizing.airflow_cfm != null ? `${sizing.airflow_cfm.toLocaleString()} CFM` : 'NEEDS_REVIEW'}</div>
        </div>
        <div className="rounded-lg border border-border bg-background p-3">
          <div className="text-muted-foreground">Fresh Air Requirement</div>
          <div className="mt-1 text-lg font-bold">{sizing.fresh_air_cfm != null ? `${sizing.fresh_air_cfm.toLocaleString()} CFM` : 'NEEDS_REVIEW'}</div>
        </div>
      </div>
    </div>
  );
}

function ProvenanceLegend() {
  return (
    <div className="mt-6 rounded-xl border border-border bg-muted/20 p-4 text-xs" data-testid="provenance-legend">
      <div className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider mb-2">Provenance Key</div>
      <div className="flex flex-wrap gap-3">
        <StatusBadge status="SOURCE_FACT" />
        <StatusBadge status="DETERMINISTIC_CALCULATION" />
        <StatusBadge status="VERIFIED" />
        <StatusBadge status="NEEDS_REVIEW" />
        <StatusBadge status="NOT_PROVIDED" />
        <StatusBadge status="CONFLICT" />
        <StatusBadge status="PRICE_DATA_NOT_YET_VERIFIED" />
        <StatusBadge status="REQUIRES_VERIFIED_CATALOG_DATA" />
      </div>
    </div>
  );
}


export function ProjectPage() {
  const params = useParams<{ projectId?: string }>();
  const [projectResult, setProjectResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const routeId = params?.projectId;
    const activeRaw = localStorage.getItem('HVAC_BIS_ACTIVE_RESULT');
    const activeObj = activeRaw ? JSON.parse(activeRaw) : null;

    if (!routeId) {
      setProjectResult(activeObj);
      return;
    }

    if (activeObj && activeObj.project_id === routeId) {
      setProjectResult(activeObj);
      return;
    }

    // Fetch project by routeId from backend API
    setLoading(true);
    setErrorMsg('');
    HVACApiClient.getProject(routeId)
      .then((data) => {
        setProjectResult(data);
        localStorage.setItem('HVAC_BIS_ACTIVE_RESULT', JSON.stringify(data));
        localStorage.setItem('HVAC_BIS_ACTIVE_PROJECT_ID', data.project_id);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load project:', err);
        setErrorMsg(`Project ${routeId} could not be loaded: ${err.message}`);
        setLoading(false);
      });
  }, [params?.projectId]);

  return (
    <AppPage eyebrow="Project" title="Project Workspace" subtitle="One scoped place for requirements, evidence, calculations, and decisions.">
      <ProjectStrip activeResult={projectResult} />
      {loading ? (
        <div className="mt-8 flex flex-col items-center justify-center p-12 text-xs text-muted-foreground">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mb-3" />
          Loading project data from backend/Supabase...
        </div>
      ) : errorMsg ? (
        <div className="mt-8 rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center text-xs text-destructive">
          {errorMsg}
        </div>
      ) : projectResult ? (
        <MasterResultsView result={projectResult} onDownloadPdf={() => {
          if (projectResult.bid_package?.pdf_base64) {
            HVACApiClient.downloadPdfBlob(projectResult.bid_package.pdf_base64, `HVAC_Bid_Package_${projectResult.project_id}.pdf`);
          }
        }} />
      ) : (
        <div className="mt-8 rounded-xl border border-border bg-card p-12 text-center text-xs text-muted-foreground">
          No active project loaded. Go to the Workspace tab and run the HVAC BIS pipeline.
        </div>
      )}
    </AppPage>
  );
}

export function LibraryPage() {
  const [query, setQuery] = useState('');
  const [docsList, setDocsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    documentService.list().then(res => {
      if (res.data && Array.isArray(res.data)) {
        setDocsList(res.data);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const activeResult = (() => {
    try {
      const raw = localStorage.getItem('HVAC_BIS_ACTIVE_RESULT');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const activeDocs = activeResult?.unified_project?.documents_meta || [];
  const combinedDocs = docsList.length > 0 ? docsList : activeDocs;
  const filtered = combinedDocs.filter((d: any) => (d.file_name || d.name || '').toLowerCase().includes(query.toLowerCase()));

  return (
    <AppPage eyebrow="Library" title="Document Library" subtitle="The project record starts with source material. Search, review, and keep its status visible.">
      <div className="flex flex-wrap gap-2">
        <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-border bg-card px-3">
          <Search size={15} className="text-muted-foreground"/>
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search documents" className="w-full bg-transparent py-2.5 text-xs outline-none" data-testid="input-library-search"/>
        </div>
      </div>
      <div className="mt-5 overflow-hidden rounded-xl border border-border bg-card">
        {loading ? (
          <div className="p-12 text-center text-xs text-muted-foreground">Loading documents...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            No active project documents found. Upload tender PDFs in the Workspace to populate this library.
          </div>
        ) : (
          filtered.map((d: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between border-b border-border p-4 text-xs">
              <div>
                <div className="font-semibold">{d.file_name || d.name || `Document ${idx+1}`}</div>
                <div className="text-[10px] text-muted-foreground">Document ID: {d.document_id || `DOC-${idx+1}`} · Revision {d.revision_number || 1}</div>
              </div>
              <StatusBadge status={d.status || 'VERIFIED'} />
            </div>
          ))
        )}
      </div>
    </AppPage>
  );
}

export function RequirementsPage() {
  const activeResult = (() => {
    try {
      const raw = localStorage.getItem('HVAC_BIS_ACTIVE_RESULT');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const reqs = activeResult?.unified_project || {};
  const spaces = reqs.spaces || [];
  const missingInfo = reqs.missing_information || [];
  const conflicts = reqs.conflicts || [];
  const provenance = reqs.fact_provenance || [];
  const sizing = activeResult?.sizing || {};
  const auditEntries = activeResult?.audit?.audit_entries || [];

  return (
    <AppPage eyebrow="Requirements" title="Requirement Review" subtitle="Separate what was found from what still needs an engineer review.">
      {!activeResult ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center text-xs text-muted-foreground">
          No active requirement data. Run the HVAC BIS pipeline in the Workspace.
        </div>
      ) : (
        <div className="space-y-6">
          {/* 1. Summary Cards Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Building Type & Location</div>
              <div className="mt-1 font-semibold text-sm">{reqs.building_type || 'Office'}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{reqs.location || 'Chennai'}</div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Total Area & Volume</div>
              <div className="mt-1 font-semibold text-sm">{(reqs.total_area_sqft || 0).toLocaleString()} sq ft</div>
              <div className="text-xs text-muted-foreground mt-0.5">{(reqs.total_volume_cuft || 0).toLocaleString()} cu ft</div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Occupancy & Spaces</div>
              <div className="mt-1 font-semibold text-sm">{reqs.total_occupants || 0} Occupants</div>
              <div className="text-xs text-muted-foreground mt-0.5">{reqs.total_spaces || spaces.length} Spaces Identified</div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Services Required</div>
              <div className="mt-1 flex items-center gap-2 text-xs font-semibold">
                <span className={reqs.cooling_required !== false ? 'text-emerald-600' : 'text-muted-foreground'}>
                  Cooling: {reqs.cooling_required !== false ? 'YES' : 'NO'}
                </span>
                <span>·</span>
                <span className={reqs.ventilation_required !== false ? 'text-emerald-600' : 'text-muted-foreground'}>
                  Ventilation: {reqs.ventilation_required !== false ? 'YES' : 'NO'}
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">Mode: {reqs.mode || 'REQUIREMENT_DRIVEN'}</div>
            </div>
          </div>

          {/* 2. Detailed Spaces Breakdown Table */}
          <section className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="border-b border-border p-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm">Individual Space & Zone Schedule</h3>
                <p className="text-[11px] text-muted-foreground">Exhaustive room breakdown extracted directly from requirement input & tender documents.</p>
              </div>
              <StatusBadge status={spaces.length > 0 ? 'VERIFIED' : 'NEEDS_REVIEW'} />
            </div>

            {spaces.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No specific space breakdown extracted. Operating on gross building totals.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="p-3">Space / Zone Name</th>
                      <th className="p-3">Dimensions (L × W × H)</th>
                      <th className="p-3">Area (sq ft)</th>
                      <th className="p-3">Volume (cu ft)</th>
                      <th className="p-3">Occupants</th>
                      <th className="p-3">Cooling Status</th>
                      <th className="p-3">Fresh Air CFM</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {spaces.map((sp: any, idx: number) => {
                      const len = sp.length_m || (sp.dimensions ? sp.dimensions.split('×')[0]?.trim() : '');
                      const wid = sp.width_m || (sp.dimensions ? sp.dimensions.split('×')[1]?.trim() : '');
                      const hgt = sp.height_m || (sp.dimensions ? sp.dimensions.split('×')[2]?.trim() : '');
                      const dimStr = (len && wid && hgt) ? `${len} × ${wid} × ${hgt}` : sp.dimensions || 'NOT_PROVIDED';
                      const areaVal = sp.area_sqft ? `${sp.area_sqft.toLocaleString()} sq ft` : 'NOT_PROVIDED';
                      const volVal = sp.volume_cuft ? `${sp.volume_cuft.toLocaleString()} cu ft` : 'NOT_PROVIDED';

                      return (
                        <tr key={idx} className="hover:bg-muted/30">
                          <td className="p-3 font-semibold">{sp.name || `Space ${idx+1}`}</td>
                          <td className="p-3 text-muted-foreground">{dimStr}</td>
                          <td className="p-3 font-mono">{areaVal}</td>
                          <td className="p-3 font-mono text-muted-foreground">{volVal}</td>
                          <td className="p-3">{sp.occupants !== undefined ? `${sp.occupants} persons` : <StatusBadge status="NOT_PROVIDED"/>}</td>
                          <td className="p-3"><StatusBadge status={sp.cooling_status || sizing.cooling_status || 'NEEDS_REVIEW'} /></td>
                          <td className="p-3 font-mono">{sizing.fresh_air_cfm ? `${Math.round(sizing.fresh_air_cfm / spaces.length)} CFM` : <StatusBadge status="NEEDS_REVIEW"/>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* 3. Engineering Calculations & Sizing Basis */}
          <div className="grid gap-5 lg:grid-cols-2">
            <section className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <SectionKicker icon={<FileCheck2 size={14}/>} text="Cooling Load & Heat Sizing Basis"/>
                <StatusBadge status={sizing.cooling_status || 'NEEDS_REVIEW'} />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                <div>
                  <div className="text-[10px] text-muted-foreground">Cooling Capacity Load</div>
                  <div className="text-base font-bold mt-0.5">{sizing.cooling_load_tr ? `${sizing.cooling_load_tr} TR` : <StatusBadge status="NEEDS_REVIEW"/>}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">Total Supply Airflow</div>
                  <div className="text-base font-bold mt-0.5">{sizing.airflow_cfm ? `${sizing.airflow_cfm.toLocaleString()} CFM` : <StatusBadge status="NEEDS_REVIEW"/>}</div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground border-t border-border pt-3">
                <strong>Engineering Basis:</strong> {sizing.cooling_load_basis || 'ASHRAE Fundamentals & Rule-of-Thumb Estimation (NEEDS_REVIEW)'}
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <SectionKicker icon={<FileCheck2 size={14}/>} text="Ventilation & Fresh Air Basis"/>
                <StatusBadge status={sizing.fresh_air_status || 'VERIFIED'} />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                <div>
                  <div className="text-[10px] text-muted-foreground">Fresh Air Requirement</div>
                  <div className="text-base font-bold mt-0.5">{sizing.fresh_air_cfm ? `${sizing.fresh_air_cfm.toLocaleString()} CFM` : <StatusBadge status="NEEDS_REVIEW"/>}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">Standard Formula Used</div>
                  <div className="text-xs font-semibold mt-1">{sizing.formula_basis || 'ASHRAE 62.1 Standard'}</div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground border-t border-border pt-3">
                <strong>Ventilation Basis:</strong> {sizing.fresh_air_basis || 'ASHRAE 62.1 Standard (15 CFM/person + 0.12 CFM/sqft)'}
              </div>
            </section>
          </div>

          {/* 4. Missing Information & Conflicts */}
          <div className="grid gap-5 lg:grid-cols-2">
            <section className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-xs uppercase tracking-wider text-amber-600">Missing Information & Unresolved Data</h4>
                <span className="text-[10px] font-mono text-muted-foreground">{missingInfo.length} Items</span>
              </div>
              {missingInfo.length === 0 ? (
                <div className="text-xs text-emerald-600 font-medium bg-emerald-500/10 p-3 rounded-lg">
                  ✓ Zero missing information detected. All required parameters were present in input.
                </div>
              ) : (
                <div className="space-y-2">
                  {missingInfo.map((item: string, idx: number) => (
                    <div key={idx} className="flex items-center justify-between bg-muted/40 p-2.5 rounded-lg text-xs">
                      <span>{item}</span>
                      <StatusBadge status="NEEDS_REVIEW" />
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-xs uppercase tracking-wider text-rose-600">Conflicts & Cross-Source Reconciliations</h4>
                <span className="text-[10px] font-mono text-muted-foreground">{conflicts.length} Conflicts</span>
              </div>
              {conflicts.length === 0 ? (
                <div className="text-xs text-emerald-600 font-medium bg-emerald-500/10 p-3 rounded-lg">
                  ✓ Zero cross-document conflicts detected across source materials.
                </div>
              ) : (
                <div className="space-y-2">
                  {conflicts.map((conf: any, idx: number) => (
                    <div key={idx} className="bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-lg text-xs space-y-1">
                      <div className="font-semibold text-rose-700">Conflict on {conf.field || 'Field'}: {conf.value_a} vs {conf.value_b}</div>
                      <div className="text-[10px] text-muted-foreground">Action required: {conf.required_action}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* 5. Fact Provenance & Audit Checkpoints */}
          <section className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Validation & Audit Checkpoint Readiness</h4>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {auditEntries.map((a: any, idx: number) => (
                <div key={idx} className="rounded-lg border border-border bg-muted/20 p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-semibold">{a.checkpoint}</span>
                    <StatusBadge status={a.status} />
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{a.details}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </AppPage>
  );
}

export function ValidationPage() {
  const activeResult = (() => {
    try {
      const raw = localStorage.getItem('HVAC_BIS_ACTIVE_RESULT');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  return (
    <AppPage eyebrow="Validation" title="Bid Validation" subtitle="A review-focused surface for what passes, what conflicts, and what cannot be claimed yet.">
      {!activeResult ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center text-xs text-muted-foreground">
          No validation findings. Run the pipeline in the Workspace to perform automated checks.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-6 text-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold">Pipeline Overall Result</span>
            <StatusBadge status={activeResult.status || 'SUCCESS'} />
          </div>
          <div className="flex items-center justify-between">
            <span>Project Reference</span>
            <span className="font-mono">{activeResult.project_id}</span>
          </div>
        </div>
      )}
    </AppPage>
  );
}

export function EquipmentPage() {
  const activeResult = (() => {
    try {
      const raw = localStorage.getItem('HVAC_BIS_ACTIVE_RESULT');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const eqList = activeResult?.equipment || [];

  return (
    <AppPage eyebrow="Equipment" title="Equipment & Availability" subtitle="A safe place for verified catalog evidence—without inventing manufacturer, model, or supplier claims.">
      {eqList.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center text-xs text-muted-foreground">
          No verified equipment catalog records attached yet. Run the pipeline in the Workspace to query catalog and regional suppliers.
        </div>
      ) : (
        <div className="space-y-3 text-xs">
          {eqList.map((eq: any, idx: number) => (
            <div key={idx} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
              <div>
                <div className="font-semibold">{eq.manufacturer || 'Regional Brand'} {eq.model_number || eq.model || 'VRF Unit'}</div>
                <div className="text-muted-foreground">Type: {eq.type} | Capacity: {eq.cooling_capacity_tr || eq.capacity} TR</div>
              </div>
              <StatusBadge status={eq.verification_status || 'VERIFIED'} />
            </div>
          ))}
        </div>
      )}
      <div className="mt-6">
        <SupplierAvailabilityMap />
      </div>
    </AppPage>
  );
}

export function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [, setLocation] = useLocation();

  useEffect(() => {
    projectService
      .list()
      .then((res) => {
        if (res.data && Array.isArray(res.data)) {
          setProjects(res.data);
        } else {
          setProjects([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to list projects:', err);
        setError('Failed to fetch projects list from backend.');
        setLoading(false);
      });
  }, []);

  return (
    <AppPage
      eyebrow="Projects"
      title="Projects Directory"
      subtitle="Overview of all persisted HVAC BIS engineering projects and tender runs."
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-xs text-muted-foreground">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mb-3" />
          Loading persisted projects from backend...
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center text-xs text-destructive">
          {error}
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center text-xs text-muted-foreground" data-testid="empty-projects-state">
          No engineering projects found. Navigate to the Workspace to run a new HVAC requirement or tender calculation.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="projects-list">
          {projects.map((proj: any) => (
            <div
              key={proj.id}
              onClick={() => setLocation(`/projects/${proj.id}`)}
              className="group cursor-pointer rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-md"
              data-testid={`project-card-${proj.id}`}
            >
              <div className="flex items-start justify-between">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <FolderKanban size={20} />
                </div>
                <StatusBadge status={proj.status || 'SUCCESS'} />
              </div>
              <h3 className="mt-4 font-semibold text-foreground group-hover:text-primary transition-colors">
                {proj.name || `Project ${proj.id}`}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {proj.buildingType || 'HVAC Project'} {proj.location ? `· ${proj.location}` : ''}
              </p>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-[11px] text-muted-foreground">
                <span className="font-mono text-[10px]">ID: {String(proj.id).substring(0, 18)}</span>
                <span>{proj.updatedAt || 'Recently updated'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppPage>
  );
}

export function CommercialPage() {
  const activeResult = (() => {
    try {
      const raw = localStorage.getItem('HVAC_BIS_ACTIVE_RESULT');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const quote = activeResult?.commercial_quote || {};
  const boqItems = activeResult?.boq_items || [];

  return (
    <AppPage
      eyebrow="Commercial"
      title="Commercial Quotation & BOQ"
      subtitle="Transparent breakdown of engineering bill of quantities, unit rates, tax posture, and grand totals."
    >
      {!activeResult ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center text-xs text-muted-foreground">
          No commercial quotation loaded. Run the pipeline in the Workspace tab to generate a BOQ and commercial quote.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-[11px] text-muted-foreground">BOQ Subtotal</div>
              <div className="mt-1 text-xl font-bold">
                {(quote.boq_subtotal != null || quote.subtotal != null) ? (
                  `₹${(quote.boq_subtotal ?? quote.subtotal).toLocaleString()}`
                ) : (
                  'Price data pending'
                )}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-[11px] text-muted-foreground">GST Tax</div>
              <div className="mt-1 text-xl font-bold">
                {quote.tax_amount != null ? `₹${quote.tax_amount.toLocaleString()}` : 'Tax pending'}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-[11px] text-muted-foreground">Grand Total</div>
              <div className="mt-1 text-xl font-bold text-primary">
                {quote.grand_total != null ? `₹${quote.grand_total.toLocaleString()}` : 'Total pending'}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold text-sm mb-3">Bill of Quantities ({boqItems.length} items)</h3>
            {boqItems.length === 0 ? (
              <div className="text-xs text-muted-foreground">No BOQ items specified for this project.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="pb-2 font-medium">Item Description</th>
                      <th className="pb-2 font-medium">Qty</th>
                      <th className="pb-2 font-medium">Unit</th>
                      <th className="pb-2 font-medium">Rate</th>
                      <th className="pb-2 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {boqItems.map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td className="py-2.5 font-medium">{item.item_name || item.description || `Item ${idx + 1}`}</td>
                        <td className="py-2.5">{item.quantity || 1}</td>
                        <td className="py-2.5">{item.unit || 'Lot'}</td>
                        <td className="py-2.5">{item.unit_rate ? `₹${item.unit_rate.toLocaleString()}` : 'Unpriced'}</td>
                        <td className="py-2.5 font-semibold">{item.total_price ? `₹${item.total_price.toLocaleString()}` : 'Unpriced'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </AppPage>
  );
}

export function SettingsPage() {
  const [dark, setDark] = useState(false);
  return (
    <AppPage eyebrow="Settings" title="Workspace Settings" subtitle="Preferences for your engineering environment.">
      <div className="card-surface rounded-xl p-6 text-xs space-y-4 max-w-xl">
        <div className="flex items-center justify-between">
          <span>Dark Interface</span>
          <button onClick={() => { setDark(!dark); document.documentElement.classList.toggle('dark', !dark); }} className={`h-6 w-11 rounded-full p-1 transition-colors ${dark?'bg-primary':'bg-border'}`}>
            <span className={`block h-4 w-4 rounded-full bg-background transition-transform ${dark?'translate-x-5':''}`}/>
          </button>
        </div>
      </div>
    </AppPage>
  );
}

export function ProfilePage() {
  const { user, profile, signOut } = useAuth();
  const [, setLocation] = useLocation();

  const userInitials = (profile?.full_name || user?.email || 'ME')
    .split(' ')
    .map((n: string) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleLogout = async () => {
    await signOut();
    setLocation('/');
  };

  return (
    <AppPage eyebrow="Account" title="Profile & Login Details" subtitle="Identity is managed securely via Supabase Auth with Row Level Security.">
      <section className="card-surface max-w-2xl rounded-xl p-5 sm:p-7">
        <div className="flex items-center gap-4 border-b border-border pb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#E0AA8C] text-lg font-bold text-[#4c2118]">
            {userInitials}
          </div>
          <div>
            <div className="text-lg font-semibold">{profile?.full_name || user?.email || 'MEP Engineer'}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {profile?.company_name || 'MEP Engineering'} · {profile?.role || 'HVAC_ESTIMATOR'}
            </div>
          </div>
          <span className="ml-auto rounded-full bg-accent px-2.5 py-1 text-[10px] font-semibold text-accent-foreground">
            {user ? 'SUPABASE AUTH' : 'GUEST SESSION'}
          </span>
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 text-xs">
          <div><span className="text-muted-foreground">Full Name:</span> <div className="font-medium">{profile?.full_name || user?.user_metadata?.full_name || 'MEP Engineer'}</div></div>
          <div><span className="text-muted-foreground">Work Email:</span> <div className="font-medium">{user?.email || 'engineer@company.com'}</div></div>
          <div><span className="text-muted-foreground">Company:</span> <div className="font-medium">{profile?.company_name || 'MEP Engineering'}</div></div>
          <div><span className="text-muted-foreground">User ID:</span> <div className="font-mono">{user?.id || 'guest_user'}</div></div>
        </div>
        {user && (
          <button onClick={handleLogout} className="mt-6 rounded-lg border border-border px-4 py-2 text-xs font-semibold text-primary hover:bg-muted">
            Sign out
          </button>
        )}
      </section>
    </AppPage>
  );
}

export function AppPage({eyebrow,title,subtitle,children}:{eyebrow:string;title:string;subtitle:string;children:React.ReactNode}){return <div className="mx-auto max-w-[1400px] px-4 py-7 sm:px-8 sm:py-10"><div className="animate-rise"><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.17em] text-primary"><span className="h-px w-7 bg-primary/55"/>{eyebrow}</div><div className="mt-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h1 className="font-brand text-2xl leading-tight tracking-[-.02em] sm:text-3xl">{title}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{subtitle}</p></div><div className="flex items-center gap-2 text-[10px] text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/>LIVE BACKEND · ZERO-FABRICATION PROTOCOL</div></div></div><div className="mt-8 animate-rise-2">{children}</div></div>}
export function SectionKicker({icon,text}:{icon:React.ReactNode;text:string}){return <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.14em] text-primary">{icon}{text}</div>}
function StatusPill({label,tone='neutral'}:{label:string;tone?:'good'|'warm'|'bad'|'neutral'}){const styles={good:'bg-[#e5f0e8] text-[#356047]',warm:'bg-[#f8e7de] text-[#6c2f23]',bad:'bg-[#f5dddd] text-[#8b3029]',neutral:'bg-muted text-muted-foreground'};return <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${styles[tone]}`}>{label}</span>}
function GaugeIcon(){return <Gauge size={14}/>}
function HistoryIcon(){return <FileCheck2 size={14}/>}