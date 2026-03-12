-- CreateEnum
CREATE TYPE "HubProjectStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "HubMemberRole" AS ENUM ('ADMIN', 'MEMBER', 'VIEWER');

-- CreateEnum
CREATE TYPE "HubTaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE');

-- CreateEnum
CREATE TYPE "HubTaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateTable
CREATE TABLE "HubProject" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "HubProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "color" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HubProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HubProjectMember" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "HubMemberRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HubProjectMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HubTask" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "HubTaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" "HubTaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "assigneeId" TEXT,
    "creatorId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HubTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HubTaskComment" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HubTaskComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HubLabel" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,

    CONSTRAINT "HubLabel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HubTaskLabel" (
    "taskId" TEXT NOT NULL,
    "labelId" TEXT NOT NULL,

    CONSTRAINT "HubTaskLabel_pkey" PRIMARY KEY ("taskId","labelId")
);

-- CreateIndex
CREATE INDEX "HubProject_organizationId_idx" ON "HubProject"("organizationId");

-- CreateIndex
CREATE INDEX "HubProject_ownerId_idx" ON "HubProject"("ownerId");

-- CreateIndex
CREATE INDEX "HubProjectMember_userId_idx" ON "HubProjectMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "HubProjectMember_projectId_userId_key" ON "HubProjectMember"("projectId", "userId");

-- CreateIndex
CREATE INDEX "HubTask_projectId_status_idx" ON "HubTask"("projectId", "status");

-- CreateIndex
CREATE INDEX "HubTask_assigneeId_idx" ON "HubTask"("assigneeId");

-- CreateIndex
CREATE INDEX "HubTask_creatorId_idx" ON "HubTask"("creatorId");

-- CreateIndex
CREATE INDEX "HubTask_projectId_position_idx" ON "HubTask"("projectId", "position");

-- CreateIndex
CREATE INDEX "HubTaskComment_taskId_idx" ON "HubTaskComment"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "HubLabel_projectId_name_key" ON "HubLabel"("projectId", "name");

-- AddForeignKey
ALTER TABLE "HubProject" ADD CONSTRAINT "HubProject_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubProject" ADD CONSTRAINT "HubProject_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubProjectMember" ADD CONSTRAINT "HubProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "HubProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubProjectMember" ADD CONSTRAINT "HubProjectMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubTask" ADD CONSTRAINT "HubTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "HubProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubTask" ADD CONSTRAINT "HubTask_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubTask" ADD CONSTRAINT "HubTask_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubTaskComment" ADD CONSTRAINT "HubTaskComment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "HubTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubTaskComment" ADD CONSTRAINT "HubTaskComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubLabel" ADD CONSTRAINT "HubLabel_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "HubProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubTaskLabel" ADD CONSTRAINT "HubTaskLabel_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "HubTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubTaskLabel" ADD CONSTRAINT "HubTaskLabel_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "HubLabel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
