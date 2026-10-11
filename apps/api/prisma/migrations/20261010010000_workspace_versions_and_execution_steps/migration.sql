-- Add workspace membership and durable workflow/execution history without
-- dropping or rewriting any existing user, workflow, or execution records.

CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED');
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

ALTER TABLE "Organization" ADD COLUMN "slug" TEXT;
UPDATE "Organization"
SET "slug" = COALESCE(
  NULLIF(trim(both '-' from regexp_replace(lower("name"), '[^a-z0-9]+', '-', 'g')), ''),
  'workspace'
) || '-' || substr(md5("id"), 1, 6);
ALTER TABLE "Organization" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

CREATE TABLE "WorkspaceMembership" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
  "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkspaceMembership_pkey" PRIMARY KEY ("id")
);

-- Backfill legacy single-workspace users. Preserve one owner per workspace
-- and map remaining existing accounts to members.
WITH legacy_members AS (
  SELECT "id", "organizationId", "createdAt",
         row_number() OVER (PARTITION BY "organizationId" ORDER BY "createdAt", "id") AS position
  FROM "User"
  WHERE "organizationId" IS NOT NULL
)
INSERT INTO "WorkspaceMembership" ("id", "organizationId", "userId", "role", "status", "createdAt", "updatedAt")
SELECT 'wm_' || md5("id" || ':' || "organizationId"), "organizationId", "id",
       CASE WHEN position = 1 THEN 'OWNER'::"WorkspaceRole" ELSE 'MEMBER'::"WorkspaceRole" END,
       'ACTIVE'::"MembershipStatus", "createdAt", "createdAt"
FROM legacy_members;

CREATE UNIQUE INDEX "WorkspaceMembership_organizationId_userId_key" ON "WorkspaceMembership"("organizationId", "userId");
CREATE INDEX "WorkspaceMembership_userId_status_idx" ON "WorkspaceMembership"("userId", "status");
CREATE INDEX "WorkspaceMembership_organizationId_role_status_idx" ON "WorkspaceMembership"("organizationId", "role", "status");
ALTER TABLE "WorkspaceMembership" ADD CONSTRAINT "WorkspaceMembership_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceMembership" ADD CONSTRAINT "WorkspaceMembership_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "WorkflowVersion" (
  "id" TEXT NOT NULL,
  "workflowId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "snapshot" JSONB NOT NULL,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkflowVersion_pkey" PRIMARY KEY ("id")
);

INSERT INTO "WorkflowVersion" ("id", "workflowId", "version", "snapshot", "createdAt")
SELECT 'wv_' || md5("id" || ':' || "version"), "id", "version", "definition", "updatedAt"
FROM "Workflow";

CREATE UNIQUE INDEX "WorkflowVersion_workflowId_version_key" ON "WorkflowVersion"("workflowId", "version");
CREATE INDEX "WorkflowVersion_createdById_createdAt_idx" ON "WorkflowVersion"("createdById", "createdAt");
ALTER TABLE "WorkflowVersion" ADD CONSTRAINT "WorkflowVersion_workflowId_fkey"
  FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkflowVersion" ADD CONSTRAINT "WorkflowVersion_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WorkflowExecution" ADD COLUMN "workflowVersionId" TEXT;
ALTER TABLE "WorkflowExecution" ADD COLUMN "triggeredById" TEXT;
ALTER TABLE "WorkflowExecution" ADD COLUMN "traceId" TEXT;
UPDATE "WorkflowExecution" AS execution
SET "workflowVersionId" = version.id
FROM "WorkflowVersion" AS version
WHERE version."workflowId" = execution."workflowId"
  AND version."version" = (SELECT workflow."version" FROM "Workflow" AS workflow WHERE workflow.id = execution."workflowId");
CREATE UNIQUE INDEX "WorkflowExecution_traceId_key" ON "WorkflowExecution"("traceId");
CREATE INDEX "WorkflowExecution_workflowId_createdAt_idx" ON "WorkflowExecution"("workflowId", "createdAt");
CREATE INDEX "WorkflowExecution_status_createdAt_idx" ON "WorkflowExecution"("status", "createdAt");
ALTER TABLE "WorkflowExecution" ADD CONSTRAINT "WorkflowExecution_workflowVersionId_fkey"
  FOREIGN KEY ("workflowVersionId") REFERENCES "WorkflowVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkflowExecution" ADD CONSTRAINT "WorkflowExecution_triggeredById_fkey"
  FOREIGN KEY ("triggeredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "WorkflowExecutionStep" (
  "id" TEXT NOT NULL,
  "executionId" TEXT NOT NULL,
  "nodeId" TEXT NOT NULL,
  "nodeType" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "input" JSONB,
  "output" JSONB,
  "error" TEXT,
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "durationMs" INTEGER,
  "usage" JSONB,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkflowExecutionStep_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WorkflowExecutionStep_executionId_nodeId_key" ON "WorkflowExecutionStep"("executionId", "nodeId");
CREATE INDEX "WorkflowExecutionStep_executionId_status_idx" ON "WorkflowExecutionStep"("executionId", "status");
ALTER TABLE "WorkflowExecutionStep" ADD CONSTRAINT "WorkflowExecutionStep_executionId_fkey"
  FOREIGN KEY ("executionId") REFERENCES "WorkflowExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Approval" (
  "id" TEXT NOT NULL,
  "executionId" TEXT NOT NULL,
  "stepId" TEXT,
  "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "approverId" TEXT,
  "comment" TEXT,
  "decision" JSONB,
  CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Approval_executionId_status_idx" ON "Approval"("executionId", "status");
CREATE INDEX "Approval_approverId_status_idx" ON "Approval"("approverId", "status");
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_executionId_fkey"
  FOREIGN KEY ("executionId") REFERENCES "WorkflowExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_stepId_fkey"
  FOREIGN KEY ("stepId") REFERENCES "WorkflowExecutionStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_approverId_fkey"
  FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
