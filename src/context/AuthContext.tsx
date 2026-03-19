import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { academyRepository } from "@/lib/academy-repository";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { AcademyAccount } from "@/types/academy";

const DEMO_STORAGE_KEY = "course-platform-demo-auth";

type AuthContextValue = {
  session: Session | null;
  account: AcademyAccount | null;
  isAuthenticated: boolean;
  isDemoMode: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<{ error: string | null }>;
  refreshAccount: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readDemoEmail() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(DEMO_STORAGE_KEY);
}

function writeDemoEmail(email: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (email) {
    window.localStorage.setItem(DEMO_STORAGE_KEY, email);
    return;
  }

  window.localStorage.removeItem(DEMO_STORAGE_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [account, setAccount] = useState<AcademyAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadAccountFromIdentity(nextSession: Session | null) {
    if (nextSession?.user.email) {
      const nextAccount = await academyRepository.getCurrentAccount(
        nextSession.user.id,
        nextSession.user.email,
        typeof nextSession.user.user_metadata?.full_name === "string"
          ? nextSession.user.user_metadata.full_name
          : undefined,
      );
      setAccount(nextAccount);
      return;
    }

    const demoEmail = readDemoEmail();

    if (!demoEmail) {
      setAccount(null);
      return;
    }

    const demoAccount = await academyRepository.getCurrentAccount(null, demoEmail);
    setAccount(demoAccount);
  }

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      if (!isSupabaseConfigured || !supabase) {
        if (!mounted) {
          return;
        }

        await loadAccountFromIdentity(null);
        if (mounted) {
          setIsLoading(false);
        }
        return;
      }

      const sessionResult = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      const nextSession = sessionResult.data.session ?? null;
      setSession(nextSession);
      await loadAccountFromIdentity(nextSession);

      if (mounted) {
        setIsLoading(false);
      }
    }

    void bootstrap();

    if (!isSupabaseConfigured || !supabase) {
      return () => {
        mounted = false;
      };
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      void loadAccountFromIdentity(nextSession).finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      return {
        error: error?.message ?? null,
      };
    }

    const demoAccount = await academyRepository.authenticateDemoUser(email.trim(), password);

    if (!demoAccount) {
      return {
        error:
          "Credenciais invalidas. Use admin@academia.local / admin123 ou marina@aluno.local / acesso123.",
      };
    }

    writeDemoEmail(demoAccount.email);
    setAccount(demoAccount);
    return { error: null };
  }

  async function signOut() {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signOut();
      return { error: error?.message ?? null };
    }

    writeDemoEmail(null);
    setAccount(null);
    setSession(null);
    return { error: null };
  }

  async function refreshAccount() {
    await loadAccountFromIdentity(session);
  }

  const value = useMemo(
    () => ({
      session,
      account,
      isAuthenticated: Boolean(session || account),
      isDemoMode: !isSupabaseConfigured,
      isLoading,
      signIn,
      signOut,
      refreshAccount,
    }),
    [session, account, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  }

  return context;
}
