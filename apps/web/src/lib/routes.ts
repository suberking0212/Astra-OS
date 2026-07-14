export const routes = {
  home: "/",
  login: "/login",
  verifyEmail: "/verify-email",
  workspace: "/workspace",
  workspaceProject: (projectId: string) => `/workspace/${projectId}`,
  projects: "/projects",
  project: (projectId: string) => `/projects/${projectId}`,
} as const;
