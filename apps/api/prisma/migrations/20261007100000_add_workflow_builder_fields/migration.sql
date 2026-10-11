ALTER TABLE "Workflow"
ADD COLUMN "description" TEXT,
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'DRAFT',
ADD COLUMN "nodes" JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN "edges" JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE "Workflow"
SET
  "nodes" = CASE
    WHEN jsonb_typeof("definition"->'nodes') = 'array' THEN "definition"->'nodes'
    ELSE '[]'::jsonb
  END,
  "edges" = CASE
    WHEN jsonb_typeof("definition"->'edges') = 'array' THEN "definition"->'edges'
    ELSE '[]'::jsonb
  END;

CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

CREATE TABLE "WorkflowExecution" (
  "id" TEXT NOT NULL,
  "workflowId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "input" JSONB,
  "output" JSONB,
  "error" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WorkflowExecution_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "WorkflowExecution"
ADD CONSTRAINT "WorkflowExecution_workflowId_fkey"
FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
