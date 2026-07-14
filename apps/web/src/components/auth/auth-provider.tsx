"use client";

import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { ApiError, getMe, type AuthUser } from "@/lib/api-client";
import { clearStoredSession, getStoredSession, saveSession } from "@/lib/auth";
import { routes } from "@/lib/routes";

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  signOut: () => void;
  refreshCurrentUser: () => Promise<AuthUser | null>;
  handleUnauthorized: (error: unknown) => boolean;
  setAuthenticatedSession: (token: string, user: AuthUser) => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const signOut = useCallback(() => {
    clearStoredSession();
    setUser(null);
    setToken(null);
    router.push(routes.login);
  }, [router]);

  const setAuthenticatedSession = useCallback((nextToken: string, nextUser: AuthUser) => {
    saveSession({ accessToken: nextToken, user: nextUser });
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const handleUnauthorized = useCallback(
    (error: unknown) => {
      if (error instanceof ApiError && error.status === 401) {
        signOut();
        return true;
      }
      return false;
    },
    [signOut],
  );

  const refreshCurrentUser = useCallback(async () => {
    const activeToken = token ?? getStoredSession()?.accessToken ?? null;
    if (!activeToken) {
      signOut();
      return null;
    }

    try {
      const currentUser = await getMe(activeToken);
      setAuthenticatedSession(activeToken, currentUser);
      return currentUser;
    } catch (error) {
      if (!handleUnauthorized(error)) {
        throw error;
      }
      return null;
    }
  }, [handleUnauthorized, setAuthenticatedSession, signOut, token]);

  useEffect(() => {
    const session = getStoredSession();
    if (!session) {
      setLoading(false);
      if (pathname !== routes.login) {
        router.push(routes.login);
      }
      return;
    }

    setToken(session.accessToken);
    setUser(session.user);
    setLoading(false);
    if (!session.user.email_verified && pathname !== routes.verifyEmail && pathname !== routes.login) {
      router.push(routes.verifyEmail);
    }
  }, [pathname, router]);

  useEffect(() => {
    if (!loading && user && !user.email_verified && pathname !== routes.verifyEmail && pathname !== routes.login) {
      router.push(routes.verifyEmail);
    }
  }, [loading, pathname, router, user]);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      signOut,
      refreshCurrentUser,
      handleUnauthorized,
      setAuthenticatedSession,
    }),
    [
      user,
      token,
      loading,
      signOut,
      refreshCurrentUser,
      handleUnauthorized,
      setAuthenticatedSession,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
