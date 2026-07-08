-- ROADMAP M22 "Households" — multi-user schema foundation, additive only.
-- Every existing row is backfilled into one default household so the
-- current keeper's data is untouched. No login flow or per-person data
-- isolation is introduced by this migration.

-- CreateTable
CREATE TABLE "households" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "households_pkey" PRIMARY KEY ("id")
);

-- Seed the default household that every existing row backfills into.
INSERT INTO "households" ("id", "name") VALUES ('household-default', 'My Household');

-- AlterTable: chronicle_entries
ALTER TABLE "chronicle_entries" ADD COLUMN "householdId" TEXT NOT NULL DEFAULT 'household-default';
CREATE INDEX "chronicle_entries_householdId_idx" ON "chronicle_entries"("householdId");
ALTER TABLE "chronicle_entries" ADD CONSTRAINT "chronicle_entries_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: prayer_items
ALTER TABLE "prayer_items" ADD COLUMN "householdId" TEXT NOT NULL DEFAULT 'household-default';
CREATE INDEX "prayer_items_householdId_idx" ON "prayer_items"("householdId");
ALTER TABLE "prayer_items" ADD CONSTRAINT "prayer_items_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: formation_rhythms
ALTER TABLE "formation_rhythms" ADD COLUMN "householdId" TEXT NOT NULL DEFAULT 'household-default';
CREATE INDEX "formation_rhythms_householdId_idx" ON "formation_rhythms"("householdId");
ALTER TABLE "formation_rhythms" ADD CONSTRAINT "formation_rhythms_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: scripture_bookmarks
ALTER TABLE "scripture_bookmarks" ADD COLUMN "householdId" TEXT NOT NULL DEFAULT 'household-default';
CREATE INDEX "scripture_bookmarks_householdId_idx" ON "scripture_bookmarks"("householdId");
ALTER TABLE "scripture_bookmarks" ADD CONSTRAINT "scripture_bookmarks_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: owned_books
ALTER TABLE "owned_books" ADD COLUMN "householdId" TEXT NOT NULL DEFAULT 'household-default';
CREATE INDEX "owned_books_householdId_idx" ON "owned_books"("householdId");
ALTER TABLE "owned_books" ADD CONSTRAINT "owned_books_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: library_catalog_entries
ALTER TABLE "library_catalog_entries" ADD COLUMN "householdId" TEXT NOT NULL DEFAULT 'household-default';
CREATE INDEX "library_catalog_entries_householdId_idx" ON "library_catalog_entries"("householdId");
ALTER TABLE "library_catalog_entries" ADD CONSTRAINT "library_catalog_entries_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: thread_events
ALTER TABLE "thread_events" ADD COLUMN "householdId" TEXT NOT NULL DEFAULT 'household-default';
CREATE INDEX "thread_events_householdId_idx" ON "thread_events"("householdId");
ALTER TABLE "thread_events" ADD CONSTRAINT "thread_events_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: memory_verses
ALTER TABLE "memory_verses" ADD COLUMN "householdId" TEXT NOT NULL DEFAULT 'household-default';
CREATE INDEX "memory_verses_householdId_idx" ON "memory_verses"("householdId");
ALTER TABLE "memory_verses" ADD CONSTRAINT "memory_verses_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
