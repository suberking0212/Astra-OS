import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const failures = [];

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function filesUnder(path) {
  const absolute = join(root, path);
  return readdirSync(absolute).flatMap((entry) => {
    const candidate = join(absolute, entry);
    return statSync(candidate).isDirectory()
      ? filesUnder(relative(root, candidate))
      : [relative(root, candidate)];
  });
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

const productionWebFiles = filesUnder("apps/web/src").filter(
  (path) =>
    !path.startsWith("apps/web/src/mock/") &&
    !path.includes("-preview/") &&
    !path.endsWith(".test.ts") &&
    !path.endsWith(".test.tsx") &&
    /\.(ts|tsx)$/.test(path),
);

for (const path of productionWebFiles) {
  const source = read(path);
  assert(
    !/(?:from|import\()\s*["'][^"']*(?:\/mock\/|@\/mock\/)/.test(source),
    `${path} imports a mock or preview data source`,
  );
}

const productionSources = [
  ...productionWebFiles,
  ...filesUnder("services/api/app").filter((path) => path.endsWith(".py")),
  ...filesUnder("packages/shared/src").filter((path) => /\.(ts|tsx)$/.test(path)),
];

for (const path of productionSources) {
  const source = read(path);
  assert(!/ASTRAOS_PHASE|phase[-_ ]?0/i.test(source), `${path} contains a code-owned phase marker`);
}

const workspaceDetail = read("apps/web/src/components/workspace/workspace-detail.tsx");
assert(!/task_local_|submitLocalTask|assistantReplyMarkdown/.test(workspaceDetail), "production Workspace contains local task demo state");

const previewPage = read("apps/web/src/app/(workspace)/workspace/phase1-preview/page.tsx");
assert(
  previewPage.includes('export const dynamic = "force-dynamic"') &&
    previewPage.includes('process.env.ENABLE_WORKSPACE_PREVIEWS !== "true"') &&
    previewPage.includes("notFound()"),
  "preview route is not disabled by default",
);

const phase2PreviewPage = read("apps/web/src/app/(workspace)/workspace/phase2-preview/page.tsx");
assert(
  phase2PreviewPage.includes('export const dynamic = "force-dynamic"') &&
    phase2PreviewPage.includes('process.env.ENABLE_WORKSPACE_PREVIEWS !== "true"') &&
    phase2PreviewPage.includes("notFound()"),
  "Phase 2 preview route is not disabled by default",
);

const productionApiFiles = filesUnder("services/api/app").filter(
  (path) =>
    path.endsWith(".py") &&
    !path.startsWith("services/api/app/mock/") &&
    path !== "services/api/app/composition/mock_workspace.py" &&
    !path.startsWith("services/api/app/tests/"),
);
for (const path of productionApiFiles) {
  assert(!/from app\.mock|import app\.mock/.test(read(path)), `${path} imports the isolated mock module`);
}

const startupScript = read("scripts/dev.sh");
assert(!/\/admin\/projects/.test(startupScript), "startup output advertises removed Admin routes");

if (failures.length > 0) {
  console.error("Rebuilt baseline check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Rebuilt baseline boundaries are intact.");
