-- CreateTable
CREATE TABLE "thread_events" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "entryType" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "passage" TEXT,
    "sourceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "thread_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memory_verses" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "translation" TEXT NOT NULL DEFAULT 'NKJV',
    "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "intervalDays" INTEGER NOT NULL DEFAULT 0,
    "repetitions" INTEGER NOT NULL DEFAULT 0,
    "dueDate" TEXT NOT NULL,
    "lastReviewedAt" TEXT,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "totalLapses" INTEGER NOT NULL DEFAULT 0,
    "addedAt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memory_verses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "thread_events_sourceId_idx" ON "thread_events"("sourceId");

-- CreateIndex
CREATE INDEX "thread_events_date_idx" ON "thread_events"("date");

-- CreateIndex
CREATE INDEX "memory_verses_dueDate_idx" ON "memory_verses"("dueDate");
