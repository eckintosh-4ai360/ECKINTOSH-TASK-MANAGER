-- Add organization-unit workspaces without changing the existing single-company
-- operating model. Existing records are placed in one Legacy Workspace.

CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');

CREATE TABLE "workspaces" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workspace_members" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "workspaces_slug_key" ON "workspaces"("slug");
CREATE UNIQUE INDEX "workspace_members_workspaceId_userId_key" ON "workspace_members"("workspaceId", "userId");
CREATE INDEX "workspace_members_userId_idx" ON "workspace_members"("userId");
CREATE INDEX "workspaces_createdById_idx" ON "workspaces"("createdById");

-- Existing installations have one shared workspace. Keep every existing record
-- available while making the new boundary explicit and queryable.
INSERT INTO "workspaces" ("id", "name", "slug", "description", "createdById", "updatedAt")
SELECT 'legacy-workspace', 'Legacy Workspace', 'legacy-workspace',
       'Workspace created during the workspace migration.', "id", CURRENT_TIMESTAMP
FROM "users"
ORDER BY "createdAt" ASC
LIMIT 1;

INSERT INTO "workspace_members" ("id", "workspaceId", "userId", "role", "updatedAt")
SELECT 'legacy-member-' || "id", 'legacy-workspace', "id",
       CASE WHEN "role" = 'ADMIN' THEN 'OWNER'::"WorkspaceRole" ELSE 'MEMBER'::"WorkspaceRole" END,
       CURRENT_TIMESTAMP
FROM "users"
WHERE EXISTS (SELECT 1 FROM "workspaces" WHERE "id" = 'legacy-workspace');

ALTER TABLE "projects" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "standups" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "teams" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "calendar_events" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "notes" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "whiteboards" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "notifications" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "messages" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "internal_emails" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "invitations" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "support_tickets" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "invitations" ADD COLUMN "workspaceRole" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER';

UPDATE "projects" SET "workspaceId" = 'legacy-workspace';
UPDATE "standups" SET "workspaceId" = 'legacy-workspace';
UPDATE "teams" SET "workspaceId" = 'legacy-workspace';
UPDATE "calendar_events" SET "workspaceId" = 'legacy-workspace';
UPDATE "notes" SET "workspaceId" = 'legacy-workspace';
UPDATE "whiteboards" SET "workspaceId" = 'legacy-workspace';
UPDATE "notifications" SET "workspaceId" = 'legacy-workspace';
UPDATE "messages" SET "workspaceId" = 'legacy-workspace';
UPDATE "internal_emails" SET "workspaceId" = 'legacy-workspace';
UPDATE "invitations" SET "workspaceId" = 'legacy-workspace';
UPDATE "support_tickets" SET "workspaceId" = 'legacy-workspace';

ALTER TABLE "projects" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "standups" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "teams" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "calendar_events" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "notes" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "whiteboards" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "notifications" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "messages" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "internal_emails" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "invitations" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "support_tickets" ALTER COLUMN "workspaceId" SET NOT NULL;

CREATE INDEX "projects_workspaceId_createdAt_idx" ON "projects"("workspaceId", "createdAt");
CREATE INDEX "standups_workspaceId_createdAt_idx" ON "standups"("workspaceId", "createdAt");
CREATE INDEX "teams_workspaceId_idx" ON "teams"("workspaceId");
CREATE INDEX "calendar_events_workspaceId_startTime_idx" ON "calendar_events"("workspaceId", "startTime");
CREATE INDEX "notes_workspaceId_ownerId_idx" ON "notes"("workspaceId", "ownerId");
CREATE INDEX "whiteboards_workspaceId_ownerId_idx" ON "whiteboards"("workspaceId", "ownerId");
CREATE INDEX "notifications_workspaceId_userId_read_idx" ON "notifications"("workspaceId", "userId", "read");
CREATE INDEX "messages_workspaceId_senderId_receiverId_createdAt_idx" ON "messages"("workspaceId", "senderId", "receiverId", "createdAt");
CREATE INDEX "internal_emails_workspaceId_toId_createdAt_idx" ON "internal_emails"("workspaceId", "toId", "createdAt");
CREATE INDEX "invitations_workspaceId_email_idx" ON "invitations"("workspaceId", "email");
CREATE INDEX "support_tickets_workspaceId_createdAt_idx" ON "support_tickets"("workspaceId", "createdAt");

ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "standups" ADD CONSTRAINT "standups_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "teams" ADD CONSTRAINT "teams_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notes" ADD CONSTRAINT "notes_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whiteboards" ADD CONSTRAINT "whiteboards_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "internal_emails" ADD CONSTRAINT "internal_emails_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
