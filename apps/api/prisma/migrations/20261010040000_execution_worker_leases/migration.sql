CREATE TABLE "ExecutionWorkerLease" (
  "executionId" TEXT NOT NULL,
  "workerId" TEXT NOT NULL,
  "leaseExpiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExecutionWorkerLease_pkey" PRIMARY KEY ("executionId"),
  CONSTRAINT "ExecutionWorkerLease_executionId_fkey"
    FOREIGN KEY ("executionId") REFERENCES "WorkflowExecution"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ExecutionWorkerLease_leaseExpiresAt_idx"
  ON "ExecutionWorkerLease"("leaseExpiresAt");
CREATE INDEX "ExecutionWorkerLease_workerId_leaseExpiresAt_idx"
  ON "ExecutionWorkerLease"("workerId", "leaseExpiresAt");
