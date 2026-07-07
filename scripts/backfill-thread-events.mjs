// One-time backfill: populates thread_events from every existing
// chronicle_entries + prayer_items row. Going forward the server mirror-writes
// (server/chronicleApi.ts) keep thread_events in sync automatically; this
// script only needs to run once per environment, right after the
// add_thread_events_and_memory_verses migration is applied.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const entries = await prisma.chronicleEntry.findMany();
  const prayers = await prisma.prayerItem.findMany();

  let written = 0;

  for (const entry of entries) {
    const data = {
      date: entry.date,
      kind: 'entry',
      entryType: entry.type,
      title: entry.title,
      body: entry.body,
      passage: entry.passage,
      sourceId: entry.id,
    };
    await prisma.threadEvent.upsert({
      where: { id: `entry:${entry.id}` },
      create: { id: `entry:${entry.id}`, ...data },
      update: data,
    });
    written += 1;
  }

  for (const item of prayers) {
    const addedData = { date: item.dateAdded, kind: 'prayer-added', title: item.text, sourceId: item.id };
    await prisma.threadEvent.upsert({
      where: { id: `prayer-added:${item.id}` },
      create: { id: `prayer-added:${item.id}`, ...addedData },
      update: addedData,
    });
    written += 1;

    if (item.answered && item.dateAnswered) {
      const answeredData = {
        date: item.dateAnswered,
        kind: 'prayer-answered',
        title: item.text,
        body: item.answerSummary,
        passage: item.answerPassage,
        sourceId: item.id,
      };
      await prisma.threadEvent.upsert({
        where: { id: `prayer-answered:${item.id}` },
        create: { id: `prayer-answered:${item.id}`, ...answeredData },
        update: answeredData,
      });
      written += 1;
    }
  }

  console.log(`[backfill-thread-events] wrote ${written} thread_events rows from ${entries.length} entries + ${prayers.length} prayers.`);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error('[backfill-thread-events] failed:', error);
  await prisma.$disconnect();
  process.exit(1);
});
