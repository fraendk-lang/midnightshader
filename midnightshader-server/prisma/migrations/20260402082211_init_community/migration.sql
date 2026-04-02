-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityEntry" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "tagline" TEXT,
    "description" TEXT,
    "fragment" TEXT NOT NULL,
    "uniforms" JSONB NOT NULL,
    "layers" JSONB,
    "thumbnailKey" TEXT,
    "thumbnailMime" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntryLike" (
    "userId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntryLike_pkey" PRIMARY KEY ("userId","entryId")
);

-- CreateTable
CREATE TABLE "EntryFavorite" (
    "userId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntryFavorite_pkey" PRIMARY KEY ("userId","entryId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "CommunityEntry_authorId_idx" ON "CommunityEntry"("authorId");

-- CreateIndex
CREATE INDEX "CommunityEntry_publishedAt_idx" ON "CommunityEntry"("publishedAt");

-- CreateIndex
CREATE INDEX "EntryLike_entryId_idx" ON "EntryLike"("entryId");

-- CreateIndex
CREATE INDEX "EntryFavorite_entryId_idx" ON "EntryFavorite"("entryId");

-- AddForeignKey
ALTER TABLE "CommunityEntry" ADD CONSTRAINT "CommunityEntry_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntryLike" ADD CONSTRAINT "EntryLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntryLike" ADD CONSTRAINT "EntryLike_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "CommunityEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntryFavorite" ADD CONSTRAINT "EntryFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntryFavorite" ADD CONSTRAINT "EntryFavorite_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "CommunityEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
