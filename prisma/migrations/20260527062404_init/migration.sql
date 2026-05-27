-- CreateTable
CREATE TABLE "chronicle_entries" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "passage" TEXT,
    "themes" TEXT[],
    "autoCapture" BOOLEAN NOT NULL DEFAULT false,
    "sourceContext" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chronicle_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prayer_items" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "answered" BOOLEAN NOT NULL DEFAULT false,
    "dateAdded" TEXT NOT NULL,
    "dateAnswered" TEXT,
    "answerSummary" TEXT,
    "answerPassage" TEXT,
    "lastPrayedAt" TEXT,
    "timesPrayed" INTEGER NOT NULL DEFAULT 0,
    "nextFollowUpAt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prayer_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "formation_rhythms" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "cadence" TEXT NOT NULL,
    "focus" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "relatedPassage" TEXT,
    "completions" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "formation_rhythms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scripture_bookmarks" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "passage" TEXT NOT NULL,
    "book" TEXT NOT NULL,
    "chapter" INTEGER NOT NULL,
    "verseStart" INTEGER,
    "verseEnd" INTEGER,
    "createdAt" TEXT NOT NULL,
    "insertedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scripture_bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "owned_books" (
    "id" TEXT NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 2,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "recordId" TEXT,
    "sourcePath" TEXT NOT NULL,
    "textPath" TEXT,
    "classification" TEXT NOT NULL,
    "workflow" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "importedAt" TEXT NOT NULL,
    "generatedPlan" JSONB,
    "studyState" JSONB,
    "assets" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "owned_books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "library_catalog_entries" (
    "id" TEXT NOT NULL,
    "record" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "library_catalog_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "experienceMode" TEXT NOT NULL DEFAULT 'fresh',
    "theme" TEXT NOT NULL DEFAULT 'light',
    "translation" TEXT NOT NULL DEFAULT 'NKJV',
    "bibleView" JSONB NOT NULL DEFAULT '{}',
    "streakDays" INTEGER NOT NULL DEFAULT 0,
    "currentPlanName" TEXT NOT NULL DEFAULT 'Daily Walk',
    "currentPlanDay" INTEGER NOT NULL DEFAULT 1,
    "currentPlanTotal" INTEGER NOT NULL DEFAULT 365,
    "activeStudyModuleId" TEXT NOT NULL DEFAULT 'bible-study',
    "studyModuleDayById" JSONB NOT NULL DEFAULT '{}',
    "activeOwnedBookId" TEXT NOT NULL DEFAULT '',
    "syncProfile" JSONB,
    "voiceConfig" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);
