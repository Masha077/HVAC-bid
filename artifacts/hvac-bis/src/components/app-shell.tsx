import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Bell, BookOpen, ChevronDown, CircleHelp, FileText, FolderKanban, Gauge, History, Library, LogOut, Map, Menu, MoreHorizontal, Search, Settings, SlidersHorizontal, UserRound, X } from 'lucide-react';
import { HvacMark } from '@/components/hvac-mark';
import { demoDocuments, demoProject } from '@/data/demo';
import { useAuth } from '@/contexts/auth-context';

const nav = [
  {href:'/workspace',label:'Workspace',icon:Gauge},
  {href:'/projects/chennai-office',label:'Projects',icon:FolderKanban},
  {href:'/requirements',label:'Requirements',icon:SlidersHorizontal},
  {href:'/validation',label:'Validation',icon:CircleHelp},
  {href:'/equipment',label:'Equipment',icon:Map},
  {href:'/library',label:'Library',icon:Library},
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { user, profile, signOut } = useAuth();
  const [mobileNav, setMobileNav] = useState(false);
  const [history, setHistory] = useState(false);
  const [menu, setMenu] = useState(false);

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Arjun Menon';
  const displayCompany = profile?.company_name || 'Southline MEP';
  const userInitials = (profile?.full_name || user?.email || 'AM')
    .split(' ')
    .map((n: string) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleLogout = async () => {
    setMenu(false);
    await signOut();
    setLocation('/');
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[242px] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-200 lg:translate-x-0 ${mobileNav ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-[78px] items-center justify-between border-b border-sidebar-border px-5">
          <HvacMark />
          <button className="rounded-md p-1 text-sidebar-foreground/70 lg:hidden" onClick={() => setMobileNav(false)} data-testid="button-close-navigation">
            <X size={18}/>
          </button>
        </div>
        <div className="px-3 pt-5">
          <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[.16em] text-sidebar-foreground/45">Workbench</div>
          <nav className="space-y-1">
            {nav.map(({href,label,icon:Icon}) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileNav(false)}
                className={`focus-ring flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${location === href || (href.startsWith('/projects') && location.startsWith('/projects')) ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/68 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground'}`}
                data-testid={`link-nav-${label.toLowerCase()}`}
              >
                <Icon size={16} strokeWidth={1.8}/>
                <span>{label}</span>
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-auto px-3 pb-4">
          <Link href="/settings" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/65 hover:bg-sidebar-accent" data-testid="link-nav-settings">
            <Settings size={16} strokeWidth={1.8}/>Settings
          </Link>
          <div className="mt-4 flex items-center gap-3 border-t border-sidebar-border px-3 pt-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E0AA8C] text-xs font-bold text-[#4c2118]">
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold">{displayName}</div>
              <div className="truncate text-[10px] text-sidebar-foreground/45">{displayCompany}</div>
            </div>
            <button className="text-sidebar-foreground/45" onClick={() => setMenu(!menu)} data-testid="button-sidebar-account">
              <MoreHorizontal size={17}/>
            </button>
          </div>
        </div>
      </aside>
      {mobileNav && <button aria-label="Close navigation" className="fixed inset-0 z-30 bg-[#1E1E24]/35 lg:hidden" onClick={() => setMobileNav(false)} data-testid="button-navigation-backdrop"/>}
      <div className="lg:pl-[242px]">
        <header className="sticky top-0 z-20 flex h-[78px] items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur-md sm:px-7">
          <button className="rounded-lg border border-border p-2 lg:hidden" onClick={() => setMobileNav(true)} data-testid="button-open-navigation">
            <Menu size={18}/>
          </button>
          <div className="min-w-0 flex-1">
            <button className="group flex items-center gap-2 text-left" data-testid="button-project-selector">
              <div className="hidden text-[10px] uppercase tracking-[.14em] text-muted-foreground sm:block">Active project</div>
              <span className="max-w-[190px] truncate text-sm font-semibold text-foreground sm:max-w-none">{demoProject.name}</span>
              <ChevronDown size={14} className="text-muted-foreground transition-transform group-hover:translate-y-px"/>
            </button>
            <div className="mt-1 hidden items-center gap-1.5 text-[11px] text-muted-foreground sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-[#B9785E]"/>{demoProject.location} <span className="mx-1 text-border">·</span> DEMO DATA
            </div>
          </div>
          <div className="hidden w-[190px] items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground md:flex">
            <Search size={14}/><span>Search workbench</span><span className="ml-auto text-[10px] text-muted-foreground/65">⌘ K</span>
          </div>
          <button className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" data-testid="button-notifications">
            <Bell size={18}/><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary"/>
          </button>
          <div className="relative">
            <button className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => setMenu(!menu)} data-testid="button-account-menu">
              <MoreHorizontal size={19}/>
            </button>
            {menu && (
              <div className="absolute right-0 top-11 z-30 w-52 rounded-xl border border-border bg-card p-1.5 shadow-xl animate-rise">
                <MenuItem href="/profile" icon={<UserRound size={15}/>} label="Profile" test="menu-profile" onClick={() => setMenu(false)}/>
                <MenuItem href="/profile" icon={<LogOut size={15}/>} label="Login details" test="menu-login-details" onClick={() => setMenu(false)}/>
                <MenuItem href="/settings" icon={<Settings size={15}/>} label="Settings" test="menu-settings" onClick={() => setMenu(false)}/>
                <MenuItem href="/settings" icon={<SlidersHorizontal size={15}/>} label="Theme & language" test="menu-theme" onClick={() => setMenu(false)}/>
                <MenuItem href="/settings" icon={<CircleHelp size={15}/>} label="Help & support" test="menu-help" onClick={() => setMenu(false)}/>
                <button
                  onClick={handleLogout}
                  className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-primary hover:bg-muted"
                  data-testid="button-logout"
                >
                  <LogOut size={15}/>Log out <span className="ml-auto text-[10px] text-muted-foreground">Supabase</span>
                </button>
              </div>
            )}
          </div>
        </header>
        <main className="relative min-h-[calc(100dvh-78px)] overflow-hidden">{children}</main>
      </div>
      <button
        className={`fixed right-0 top-[43%] z-30 flex -translate-y-1/2 items-center gap-2 rounded-l-lg border border-r-0 border-border bg-card px-2 py-3 text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground shadow-sm transition-colors hover:bg-muted ${history ? 'text-primary' : ''}`}
        style={{writingMode:'vertical-rl'}}
        onClick={() => setHistory(!history)}
        data-testid="button-history-panel"
      >
        <History size={14} className="mb-2" />History
      </button>
      {history && <HistoryPanel onClose={() => setHistory(false)} />}
    </div>
  );
}

function MenuItem({href, icon, label, test, onClick}:{href:string;icon:React.ReactNode;label:string;test:string;onClick?:()=>void}) {
  return (
    <Link href={href} onClick={onClick} className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-foreground hover:bg-muted" data-testid={test}>
      {icon}{label}
    </Link>
  );
}

function HistoryPanel({onClose}:{onClose:()=>void}) {
  return (
    <div className="fixed right-3 top-[84px] z-30 w-[min(360px,calc(100vw-24px))] rounded-2xl border border-border bg-card p-4 shadow-2xl animate-rise">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[.16em] text-muted-foreground">Recent history</div>
          <h3 className="mt-1 text-base font-semibold">Latest source documents</h3>
        </div>
        <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted" data-testid="button-close-history">
          <X size={16}/>
        </button>
      </div>
      <div className="mt-4 space-y-1">
        {demoDocuments.slice(0,5).map(doc => (
          <div key={doc.id} className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-muted" data-testid={`history-document-${doc.id}`}>
            <div className="rounded-md bg-[#f5e4dc] p-2 text-primary">
              <FileText size={14}/>
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium">{doc.name}</div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">{doc.type} · {doc.createdAt}</div>
            </div>
            <span className="text-[10px] text-muted-foreground">{doc.size}</span>
          </div>
        ))}
      </div>
      <Link href="/library" onClick={onClose} className="mt-3 flex items-center justify-center gap-2 border-t border-border pt-3 text-xs font-semibold text-primary hover:underline" data-testid="link-full-library-history">
        <BookOpen size={14}/>Open full library
      </Link>
    </div>
  );
}