export type HealthDependency = {
  status: "ok" | "unavailable";
  detail?: string;
};

export type HealthResponse = {
  status: "ok";
  service: string;
  dependencies: Record<string, HealthDependency>;
};

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export type AuthUser = {
  id: string;
  email: string;
  email_verified: boolean;
  email_verified_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type AuthResponse = {
  access_token: string;
  token_type: "bearer";
  user: AuthUser;
};

export type Project = {
  id: string;
  name: string;
  description: string | null;
  owner_user_id: string;
  created_at: string;
  updated_at: string;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function apiRequest<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    token?: string | null;
    body?: unknown;
  } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const errorBody = await response.json();
      if (typeof errorBody.detail === "string") {
        message = errorBody.detail;
      }
    } catch {
      // Keep the generic message when the response body is not JSON.
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export function getHealth() {
  return apiRequest<HealthResponse>("/health");
}

export function register(email: string, password: string) {
  return apiRequest<AuthResponse>("/auth/register", {
    method: "POST",
    body: { email, password },
  });
}

export function login(email: string, password: string) {
  return apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export function getMe(token: string) {
  return apiRequest<AuthUser>("/auth/me", { token });
}

export function verifyEmail(email: string, code: string) {
  return apiRequest<AuthResponse>("/auth/email/verify", {
    method: "POST",
    body: { email, code },
  });
}

export function resendEmailVerification(email: string) {
  return apiRequest<{ email: string; email_verified: boolean; detail: string; debug_code?: string | null }>(
    "/auth/email/resend",
    {
      method: "POST",
      body: { email },
    },
  );
}

export function createProject(token: string, payload: { name: string; description?: string | null }) {
  return apiRequest<Project>("/projects", {
    method: "POST",
    token,
    body: payload,
  });
}

export function listProjects(token: string) {
  return apiRequest<Project[]>("/projects", { token });
}

export function getProject(token: string, projectId: string) {
  return apiRequest<Project>(`/projects/${projectId}`, { token });
}
