import type { AuthUser } from "@/lib/api-client";

const TOKEN_KEY = "astraos.access_token";
const USER_KEY = "astraos.user";

export type AuthSession = {
  accessToken: string;
  user: AuthUser;
};

export function getStoredSession(): AuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const accessToken = window.localStorage.getItem(TOKEN_KEY);
  const rawUser = window.localStorage.getItem(USER_KEY);
  if (!accessToken || !rawUser) {
    return null;
  }

  try {
    return {
      accessToken,
      user: JSON.parse(rawUser) as AuthUser,
    };
  } catch {
    clearStoredSession();
    return null;
  }
}

export function saveSession(session: AuthSession) {
  window.localStorage.setItem(TOKEN_KEY, session.accessToken);
  window.localStorage.setItem(USER_KEY, JSON.stringify(session.user));
}

export function clearStoredSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}
