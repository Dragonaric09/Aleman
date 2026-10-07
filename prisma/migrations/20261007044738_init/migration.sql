-- CreateEnum
CREATE TYPE "WordType" AS ENUM ('NOUN', 'VERB', 'ADJECTIVE', 'ADVERB', 'PREPOSITION', 'PRONOUN', 'EXPRESSION', 'OTHER');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('DER', 'DIE', 'DAS');

-- CreateEnum
CREATE TYPE "Level" AS ENUM ('A', 'B', 'C');

-- CreateEnum
CREATE TYPE "GoetheLevel" AS ENUM ('A1', 'A2', 'B1');

-- CreateEnum
CREATE TYPE "Auxiliary" AS ENUM ('HABEN', 'SEIN');

-- CreateEnum
CREATE TYPE "CardKind" AS ENUM ('ES_TO_DE', 'DE_TO_ES', 'PLURAL', 'VERB_FORMS', 'SEPARABLE_ORDER', 'CLOZE');

-- CreateEnum
CREATE TYPE "CardState" AS ENUM ('NEW', 'LEARNING', 'REVIEW', 'RELEARNING');

-- CreateEnum
CREATE TYPE "Rating" AS ENUM ('AGAIN', 'HARD', 'GOOD', 'EASY');

-- CreateEnum
CREATE TYPE "AnswerVerdict" AS ENUM ('CORRECT', 'ALMOST', 'WRONG', 'SELF_GRADED');

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
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "userId" TEXT NOT NULL,
    "newCardsPerDay" INTEGER NOT NULL DEFAULT 12,
    "maxReviewsPerDay" INTEGER NOT NULL DEFAULT 200,
    "reviewBacklogCap" INTEGER NOT NULL DEFAULT 120,
    "desiredRetention" DOUBLE PRECISION NOT NULL DEFAULT 0.9,
    "maximumIntervalDays" INTEGER NOT NULL DEFAULT 365,
    "dayStartsAtHour" INTEGER NOT NULL DEFAULT 4,
    "timezone" TEXT NOT NULL DEFAULT 'America/La_Paz',
    "enabledCardKinds" "CardKind"[] DEFAULT ARRAY['ES_TO_DE', 'DE_TO_ES', 'PLURAL', 'VERB_FORMS', 'SEPARABLE_ORDER', 'CLOZE']::"CardKind"[],
    "ttsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "ttsAutoplay" BOOLEAN NOT NULL DEFAULT false,
    "ttsRate" DOUBLE PRECISION NOT NULL DEFAULT 0.9,
    "ttsVoice" TEXT,
    "strictCapitalization" BOOLEAN NOT NULL DEFAULT false,
    "leechThreshold" INTEGER NOT NULL DEFAULT 6,
    "leechAutoSuspend" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Lesson" (
    "id" SERIAL NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "topic" TEXT,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Word" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'global',
    "lemma" TEXT NOT NULL,
    "type" "WordType" NOT NULL,
    "gender" "Gender",
    "pluralSuffix" TEXT,
    "pluralForm" TEXT,
    "noPlural" BOOLEAN NOT NULL DEFAULT false,
    "translationEs" TEXT NOT NULL,
    "exampleDe" TEXT,
    "exampleEs" TEXT,
    "clozeText" TEXT,
    "level" "Level" NOT NULL,
    "starred" BOOLEAN NOT NULL DEFAULT false,
    "goetheLevel" "GoetheLevel",
    "frequencyRank" INTEGER,
    "isCognate" BOOLEAN NOT NULL DEFAULT false,
    "isFalseFriend" BOOLEAN NOT NULL DEFAULT false,
    "falseFriendNote" TEXT,
    "separablePrefix" TEXT,
    "thirdPerson" TEXT,
    "perfekt" TEXT,
    "auxiliary" "Auxiliary",
    "isIrregular" BOOLEAN NOT NULL DEFAULT false,
    "governsCase" TEXT,
    "lessonId" INTEGER,
    "sources" TEXT[],
    "tags" TEXT[],
    "priority" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Word_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "kind" "CardKind" NOT NULL,
    "state" "CardState" NOT NULL DEFAULT 'NEW',
    "due" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stability" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "difficulty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "elapsedDays" INTEGER NOT NULL DEFAULT 0,
    "scheduledDays" INTEGER NOT NULL DEFAULT 0,
    "learningSteps" INTEGER NOT NULL DEFAULT 0,
    "reps" INTEGER NOT NULL DEFAULT 0,
    "lapses" INTEGER NOT NULL DEFAULT 0,
    "lastReview" TIMESTAMP(3),
    "introducedAt" TIMESTAMP(3),
    "suspended" BOOLEAN NOT NULL DEFAULT false,
    "isLeech" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "rating" "Rating" NOT NULL,
    "verdict" "AnswerVerdict" NOT NULL,
    "typedAnswer" TEXT,
    "durationMs" INTEGER NOT NULL,
    "stateBefore" "CardState" NOT NULL,
    "cardBefore" JSONB NOT NULL,
    "scheduledDays" INTEGER NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "studyDay" TEXT NOT NULL,
    "isNewCard" BOOLEAN NOT NULL,

    CONSTRAINT "ReviewLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WordNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "mnemonic" TEXT,
    "ownSentence" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WordNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Lesson_number_key" ON "Lesson"("number");

-- CreateIndex
CREATE INDEX "Word_scope_level_priority_idx" ON "Word"("scope", "level", "priority");

-- CreateIndex
CREATE INDEX "Word_lessonId_idx" ON "Word"("lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "Word_scope_lemma_type_key" ON "Word"("scope", "lemma", "type");

-- CreateIndex
CREATE INDEX "Card_userId_suspended_state_due_idx" ON "Card"("userId", "suspended", "state", "due");

-- CreateIndex
CREATE UNIQUE INDEX "Card_userId_wordId_kind_key" ON "Card"("userId", "wordId", "kind");

-- CreateIndex
CREATE INDEX "ReviewLog_userId_reviewedAt_idx" ON "ReviewLog"("userId", "reviewedAt");

-- CreateIndex
CREATE INDEX "ReviewLog_userId_studyDay_idx" ON "ReviewLog"("userId", "studyDay");

-- CreateIndex
CREATE UNIQUE INDEX "WordNote_userId_wordId_key" ON "WordNote"("userId", "wordId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Word" ADD CONSTRAINT "Word_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewLog" ADD CONSTRAINT "ReviewLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewLog" ADD CONSTRAINT "ReviewLog_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordNote" ADD CONSTRAINT "WordNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordNote" ADD CONSTRAINT "WordNote_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;
