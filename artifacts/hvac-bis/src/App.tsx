import { useEffect, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  Redirect,
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';
import { AppShell } from '@/components/app-shell';
import {
  EquipmentPage,
  HomePage,
  LibraryPage,
  ProfilePage,
  ProjectPage,
  RequirementsPage,
  SettingsPage,
  ValidationPage,
  WorkspacePage,
} from '@/pages/hvac-pages';
import { AuthProvider, useAuth } from '@/contexts/auth-context';

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      setLocation('/');
    }
  }, [user, loading, setLocation]);

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#1E1E24] text-[#FFF8F0]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D99A79] border-t-transparent" />
          <div className="font-brand text-xs uppercase tracking-[.18em] text-[#FFF8F0]/50">
            Verifying Workspace Session...
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/workspace">
          <ProtectedRoute>
            <AppShell>
              <WorkspacePage />
            </AppShell>
          </ProtectedRoute>
        </Route>
        <Route path="/projects/:projectId">
          <ProtectedRoute>
            <AppShell>
              <ProjectPage />
            </AppShell>
          </ProtectedRoute>
        </Route>
        <Route path="/library">
          <ProtectedRoute>
            <AppShell>
              <LibraryPage />
            </AppShell>
          </ProtectedRoute>
        </Route>
        <Route path="/requirements">
          <ProtectedRoute>
            <AppShell>
              <RequirementsPage />
            </AppShell>
          </ProtectedRoute>
        </Route>
        <Route path="/validation">
          <ProtectedRoute>
            <AppShell>
              <ValidationPage />
            </AppShell>
          </ProtectedRoute>
        </Route>
        <Route path="/equipment">
          <ProtectedRoute>
            <AppShell>
              <EquipmentPage />
            </AppShell>
          </ProtectedRoute>
        </Route>
        <Route path="/suppliers">
          <Redirect to="/equipment" />
        </Route>
        <Route path="/settings">
          <ProtectedRoute>
            <AppShell>
              <SettingsPage />
            </AppShell>
          </ProtectedRoute>
        </Route>
        <Route path="/profile">
          <ProtectedRoute>
            <AppShell>
              <ProfilePage />
            </AppShell>
          </ProtectedRoute>
        </Route>
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
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
