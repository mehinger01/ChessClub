import { createContext, useContext, useEffect, useState } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import {
  accountConfiguration,
  createAccountClient,
  loadAccount,
} from "../lib/accounts";
import type { AccountProfile, ClubMembership } from "../lib/accounts";
import { AccountPage } from "../pages/account";

let client: SupabaseClient | null = null;
let configurationError = false;
try {
  client = createAccountClient(accountConfiguration(import.meta.env));
} catch {
  configurationError = true;
}

interface AccountState {
  client: SupabaseClient | null;
  session: Session | null;
  loading: boolean;
  profile: AccountProfile | null;
  memberships: ClubMembership[];
  error: string | null;
  recovery: boolean;
  finishRecovery: () => void;
  reload: () => void;
}
const Context = createContext<AccountState | null>(null);
export function useAccount() {
  const account = useContext(Context);
  if (!account) throw new Error("Missing account context");
  return account;
}

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(!!client);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [memberships, setMemberships] = useState<ClubMembership[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [recovery, setRecovery] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!client) return;
    let disposed = false;
    let events = 0;
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, next) => {
      if (disposed) return;
      events++;
      setSession(next);
      setLoadingSession(false);
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      if (!next) {
        setRecovery(false);
        setProfile(null);
        setMemberships([]);
      }
    });
    void client.auth
      .getSession()
      .then(({ data, error: failure }) => {
        if (disposed || events) return;
        setSession(data.session);
        setLoadingSession(false);
        if (failure)
          setError("Your session could not be restored. Please sign in again.");
      })
      .catch(() => {
        if (!disposed) {
          setLoadingSession(false);
          setError("Unable to connect. Please try again.");
        }
      });
    return () => {
      disposed = true;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    setProfile(null);
    setMemberships([]);
    if (!client || !session) {
      setLoadingProfile(false);
      return;
    }
    let disposed = false;
    setLoadingProfile(true);
    setError(null);
    void loadAccount(client, session.user)
      .then((result) => {
        if (!disposed) {
          setProfile(result.profile);
          setMemberships(result.memberships);
        }
      })
      .catch(() => {
        if (!disposed)
          setError(
            "Your profile could not be loaded. Please try again or contact your teacher.",
          );
      })
      .finally(() => {
        if (!disposed) setLoadingProfile(false);
      });
    return () => {
      disposed = true;
    };
  }, [session?.user.id, revision]);

  // Never briefly expose a previous account's profile during an account switch.
  const currentProfile = profile?.user_id === session?.user.id ? profile : null;
  const state = {
    client,
    session,
    loading: loadingSession || loadingProfile,
    profile: currentProfile,
    memberships: currentProfile ? memberships : [],
    error,
    recovery,
    finishRecovery: () => setRecovery(false),
    reload: () => setRevision((n) => n + 1),
  };
  return <Context.Provider value={state}>{children}</Context.Provider>;
}

/** This preview slice never exposes the legacy local-admin workspace. */
export function StudentAccounts() {
  if (configurationError)
    return (
      <main className="max-w-md mx-auto p-8">
        <h1 className="text-2xl font-serif">
          Student accounts are unavailable
        </h1>
        <p className="mt-4">
          Please ask your teacher for help getting started.
        </p>
      </main>
    );
  return (
    <AccountProvider>
      <AccountPage />
    </AccountProvider>
  );
}
