-- CreateEnum
CREATE TYPE "TopicStatus" AS ENUM ('AVAILABLE', 'PLANNED');

-- CreateEnum
CREATE TYPE "StoryPhase" AS ENUM ('DISCOVER', 'PRACTICE', 'CONTRAST', 'APPLY');

-- CreateTable
CREATE TABLE "GrammarTopic" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "lessonNumbers" INTEGER[],
    "prerequisites" TEXT[],
    "sortOrder" INTEGER NOT NULL,
    "status" "TopicStatus" NOT NULL DEFAULT 'PLANNED',
    "plannedStories" INTEGER NOT NULL DEFAULT 0,
    "content" JSONB NOT NULL,

    CONSTRAINT "GrammarTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Story" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "phase" "StoryPhase" NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "titleEs" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "keywords" TEXT[],
    "highlight" BOOLEAN NOT NULL DEFAULT true,
    "wordCount" INTEGER NOT NULL,
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    "exercises" JSONB NOT NULL,

    CONSTRAINT "Story_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "comprehensionScore" DOUBLE PRECISION,
    "productionScore" DOUBLE PRECISION,
    "isProbe" BOOLEAN NOT NULL,
    "studyDay" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GrammarTopic_slug_key" ON "GrammarTopic"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Story_topicId_sortOrder_key" ON "Story"("topicId", "sortOrder");

-- CreateIndex
CREATE INDEX "StoryAttempt_userId_storyId_idx" ON "StoryAttempt"("userId", "storyId");

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "GrammarTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryAttempt" ADD CONSTRAINT "StoryAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryAttempt" ADD CONSTRAINT "StoryAttempt_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;
