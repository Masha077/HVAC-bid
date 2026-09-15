import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';
import { AppShell } from '@/components/app-shell';
import { EquipmentPage, HomePage, LibraryPage, ProfilePage, ProjectPage, RequirementsPage, SettingsPage, ValidationPage, WorkspacePage } from '@/pages/hvac-pages';

const queryClient = new QueryClient();

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/workspace"><AppShell><WorkspacePage /></AppShell></Route>
        <Route path="/projects/:projectId"><AppShell><ProjectPage /></AppShell></Route>
        <Route path="/library"><AppShell><LibraryPage /></AppShell></Route>
        <Route path="/requirements"><AppShell><RequirementsPage /></AppShell></Route>
        <Route path="/validation"><AppShell><ValidationPage /></AppShell></Route>
        <Route path="/equipment"><AppShell><EquipmentPage /></AppShell></Route>
        <Route path="/settings"><AppShell><SettingsPage /></AppShell></Route>
        <Route path="/profile"><AppShell><ProfilePage /></AppShell></Route>
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
