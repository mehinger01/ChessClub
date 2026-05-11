import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { Layout } from "./components/layout";
import NotFound from "./pages/not-found";
import Home from "./pages/home";
import Play from "./pages/play";
import Puzzles from "./pages/puzzles";
import Roster from "./pages/roster";
import Admin from "./pages/admin";
import Settings from "./pages/settings";
import { useSettings } from "./hooks/use-settings";

const queryClient = new QueryClient();

/**
 * Applies the user's darkMode preference to <html>. Listens to system changes
 * when "system" is selected. Keeps the document class in sync with settings so
 * Tailwind's `dark:` variants pick it up everywhere instantly.
 */
function DarkModeApplier() {
  const { settings } = useSettings();
  const mode = settings.uiPreferences.darkMode;
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const isDark = mode === "dark"
        || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      root.classList.toggle("dark", isDark);
    };
    apply();
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode]);
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/play" component={Play} />
      <Route path="/puzzles" component={Puzzles} />
      <Route path="/roster" component={Roster} />
      <Route path="/admin" component={Admin} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <DarkModeApplier />
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Layout>
            <Router />
          </Layout>
        </WouterRouter>
        <Toaster position="bottom-right" richColors />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
