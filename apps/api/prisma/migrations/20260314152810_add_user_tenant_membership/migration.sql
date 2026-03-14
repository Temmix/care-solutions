-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "user_tenant_memberships" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CARER',
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_tenant_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_tenant_memberships_userId_idx" ON "user_tenant_memberships"("userId");

-- CreateIndex
CREATE INDEX "user_tenant_memberships_organizationId_idx" ON "user_tenant_memberships"("organizationId");

-- CreateIndex
CREATE INDEX "user_tenant_memberships_status_idx" ON "user_tenant_memberships"("status");

-- CreateIndex
CREATE UNIQUE INDEX "user_tenant_memberships_userId_organizationId_key" ON "user_tenant_memberships"("userId", "organizationId");

-- AddForeignKey
ALTER TABLE "user_tenant_memberships" ADD CONSTRAINT "user_tenant_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_tenant_memberships" ADD CONSTRAINT "user_tenant_memberships_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
