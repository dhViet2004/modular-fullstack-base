-- CreateTable
CREATE TABLE "GoogleAccount" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "googleSubject" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleOAuthAttempt" (
    "id" UUID NOT NULL,
    "stateHash" VARCHAR(64) NOT NULL,
    "codeVerifier" VARCHAR(128) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoogleOAuthAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GoogleAccount_userId_key" ON "GoogleAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleAccount_googleSubject_key" ON "GoogleAccount"("googleSubject");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleOAuthAttempt_stateHash_key" ON "GoogleOAuthAttempt"("stateHash");

-- CreateIndex
CREATE INDEX "GoogleOAuthAttempt_expiresAt_idx" ON "GoogleOAuthAttempt"("expiresAt");

-- AddForeignKey
ALTER TABLE "GoogleAccount" ADD CONSTRAINT "GoogleAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
