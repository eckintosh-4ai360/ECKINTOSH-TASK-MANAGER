-- Presence heartbeat for deployments with no push transport.
ALTER TABLE "workspace_members"
  ADD COLUMN "lastSeenAt" TIMESTAMP(3);

CREATE INDEX "workspace_members_workspaceId_lastSeenAt_idx"
  ON "workspace_members"("workspaceId", "lastSeenAt");
