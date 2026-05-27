#!/usr/bin/env node
/**
 * One-time migration: import Chronicle JSON snapshots into PostgreSQL.
 * Run: node scripts/migrate-snapshots-to-db.mjs
 */

import { PrismaClient } from '@prisma/client'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { homedir } from 'node:os'

const prisma = new PrismaClient()

// Find snapshot directory
const SNAPSHOT_DIRS = [
  // Docker / VPS path
  '/chronicle-snapshots',
  // Mac Postgres.app path
  `${homedir()}/Library/Application Support/ChronicleService/app/data/sync-snapshots`,
  // Local dev fallback
  resolve(process.cwd(), 'data/sync-snapshots'),
]

const snapshotDir = SNAPSHOT_DIRS.find(d => existsSync(d))
if (!snapshotDir) {
  console.error('❌ Could not find snapshot directory. Tried:', SNAPSHOT_DIRS)
  process.exit(1)
}

console.log(`📂 Reading snapshots from: ${snapshotDir}`)

// Load all snapshot files
const files = readdirSync(snapshotDir)
  .filter(f => f.startsWith('snapshot-20') && f.endsWith('.json'))
  .sort()
  .reverse() // newest first

if (files.length === 0) {
  console.error('❌ No snapshot files found')
  process.exit(1)
}

console.log(`📦 Found ${files.length} snapshot files`)

// Parse snapshots and find the richest one
const snapshots = []
for (const file of files) {
  try {
    const raw = JSON.parse(readFileSync(resolve(snapshotDir, file), 'utf8'))
    snapshots.push({ file, createdAt: raw.createdAt, appState: raw.appState || {}, libraryCatalog: raw.libraryCatalog || [] })
  } catch (e) {
    console.warn(`⚠️  Skipping ${file}: ${e.message}`)
  }
}

const best = snapshots.find(s =>
  (s.appState.chronicleEntries?.length || 0) +
  (s.appState.prayerItems?.length || 0) +
  (s.appState.ownedBooks?.length || 0) > 0
) || snapshots[0]

console.log(`✅ Using snapshot: ${best.file} (${best.createdAt})`)

const as = best.appState
const counts = { entries: 0, prayers: 0, rhythms: 0, bookmarks: 0, books: 0, library: 0 }

// ── Chronicle Entries ─────────────────────────────────────────────────────────
for (const entry of (as.chronicleEntries || [])) {
  await prisma.chronicleEntry.upsert({
    where: { id: entry.id },
    create: {
      id: entry.id,
      date: entry.date || new Date().toISOString().slice(0, 10),
      type: entry.type || 'note',
      title: entry.title || '',
      body: entry.body || '',
      passage: entry.passage ?? null,
      themes: entry.themes ?? [],
      autoCapture: entry.autoCapture ?? false,
      sourceContext: entry.sourceContext ?? null,
    },
    update: {
      date: entry.date || new Date().toISOString().slice(0, 10),
      type: entry.type || 'note',
      title: entry.title || '',
      body: entry.body || '',
      passage: entry.passage ?? null,
      themes: entry.themes ?? [],
      autoCapture: entry.autoCapture ?? false,
      sourceContext: entry.sourceContext ?? null,
    },
  })
  counts.entries++
}

// ── Prayer Items ──────────────────────────────────────────────────────────────
for (const item of (as.prayerItems || [])) {
  await prisma.prayerItem.upsert({
    where: { id: item.id },
    create: {
      id: item.id,
      text: item.text || '',
      category: item.category || 'needs',
      answered: item.answered ?? false,
      dateAdded: item.dateAdded || new Date().toISOString().slice(0, 10),
      dateAnswered: item.dateAnswered ?? null,
      answerSummary: item.answerSummary ?? null,
      answerPassage: item.answerPassage ?? null,
      lastPrayedAt: item.lastPrayedAt ?? null,
      timesPrayed: item.timesPrayed ?? 0,
      nextFollowUpAt: item.nextFollowUpAt ?? null,
    },
    update: {
      text: item.text || '',
      category: item.category || 'needs',
      answered: item.answered ?? false,
      dateAdded: item.dateAdded || new Date().toISOString().slice(0, 10),
      dateAnswered: item.dateAnswered ?? null,
      answerSummary: item.answerSummary ?? null,
      answerPassage: item.answerPassage ?? null,
      lastPrayedAt: item.lastPrayedAt ?? null,
      timesPrayed: item.timesPrayed ?? 0,
      nextFollowUpAt: item.nextFollowUpAt ?? null,
    },
  })
  counts.prayers++
}

// ── Formation Rhythms ─────────────────────────────────────────────────────────
for (const rhythm of (as.formationRhythms || [])) {
  await prisma.formationRhythm.upsert({
    where: { id: rhythm.id },
    create: {
      id: rhythm.id,
      title: rhythm.title || '',
      cadence: rhythm.cadence || 'daily',
      focus: rhythm.focus || '',
      prompt: rhythm.prompt || '',
      relatedPassage: rhythm.relatedPassage ?? null,
      completions: rhythm.completions ?? [],
    },
    update: {
      title: rhythm.title || '',
      cadence: rhythm.cadence || 'daily',
      focus: rhythm.focus || '',
      prompt: rhythm.prompt || '',
      relatedPassage: rhythm.relatedPassage ?? null,
      completions: rhythm.completions ?? [],
    },
  })
  counts.rhythms++
}

// ── Scripture Bookmarks ───────────────────────────────────────────────────────
for (const bm of (as.scriptureBookmarks || [])) {
  await prisma.scriptureBookmark.upsert({
    where: { id: bm.id },
    create: {
      id: bm.id,
      label: bm.label || '',
      passage: bm.passage || '',
      book: bm.book || '',
      chapter: bm.chapter || 1,
      verseStart: bm.verseStart ?? null,
      verseEnd: bm.verseEnd ?? null,
      createdAt: bm.createdAt || new Date().toISOString(),
    },
    update: {
      label: bm.label || '',
      passage: bm.passage || '',
      book: bm.book || '',
      chapter: bm.chapter || 1,
      verseStart: bm.verseStart ?? null,
      verseEnd: bm.verseEnd ?? null,
    },
  })
  counts.bookmarks++
}

// ── Owned Books ───────────────────────────────────────────────────────────────
for (const book of (as.ownedBooks || [])) {
  await prisma.ownedBook.upsert({
    where: { id: book.id },
    create: {
      id: book.id,
      schemaVersion: book.schemaVersion ?? 2,
      title: book.title || '',
      author: book.author ?? null,
      recordId: book.recordId ?? null,
      sourcePath: book.sourcePath || '',
      textPath: book.textPath ?? null,
      classification: book.classification || 'general-book',
      workflow: book.workflow || 'preserve-daily',
      status: book.status || 'ready',
      summary: book.summary || '',
      importedAt: book.importedAt || new Date().toISOString(),
      generatedPlan: book.generatedPlan ?? null,
      studyState: book.studyState ?? null,
      assets: book.assets ?? null,
    },
    update: {
      schemaVersion: book.schemaVersion ?? 2,
      title: book.title || '',
      author: book.author ?? null,
      recordId: book.recordId ?? null,
      sourcePath: book.sourcePath || '',
      textPath: book.textPath ?? null,
      classification: book.classification || 'general-book',
      workflow: book.workflow || 'preserve-daily',
      status: book.status || 'ready',
      summary: book.summary || '',
      importedAt: book.importedAt || new Date().toISOString(),
      generatedPlan: book.generatedPlan ?? null,
      studyState: book.studyState ?? null,
      assets: book.assets ?? null,
    },
  })
  counts.books++
}

// ── Library Catalog ───────────────────────────────────────────────────────────
for (const record of (best.libraryCatalog || [])) {
  if (!record.id) continue
  await prisma.libraryCatalogEntry.upsert({
    where: { id: record.id },
    create: { id: record.id, record },
    update: { record },
  })
  counts.library++
}

// ── App Settings ──────────────────────────────────────────────────────────────
await prisma.appSettings.upsert({
  where: { id: 'singleton' },
  create: {
    id: 'singleton',
    experienceMode: as.experienceMode ?? 'fresh',
    theme: as.theme ?? 'light',
    translation: as.translation ?? 'NKJV',
    bibleView: as.bibleView ?? {},
    streakDays: as.streakDays ?? 0,
    currentPlanName: as.currentPlanName ?? 'Daily Walk',
    currentPlanDay: as.currentPlanDay ?? 1,
    currentPlanTotal: as.currentPlanTotal ?? 365,
    activeStudyModuleId: as.activeStudyModuleId ?? 'bible-study',
    studyModuleDayById: as.studyModuleDayById ?? {},
    activeOwnedBookId: as.activeOwnedBookId ?? '',
    syncProfile: as.syncProfile ?? null,
    voiceConfig: as.voiceConfig ?? null,
  },
  update: {
    experienceMode: as.experienceMode ?? 'fresh',
    theme: as.theme ?? 'light',
    translation: as.translation ?? 'NKJV',
    bibleView: as.bibleView ?? {},
    streakDays: as.streakDays ?? 0,
    currentPlanName: as.currentPlanName ?? 'Daily Walk',
    currentPlanDay: as.currentPlanDay ?? 1,
    currentPlanTotal: as.currentPlanTotal ?? 365,
    activeStudyModuleId: as.activeStudyModuleId ?? 'bible-study',
    studyModuleDayById: as.studyModuleDayById ?? {},
    activeOwnedBookId: as.activeOwnedBookId ?? '',
    syncProfile: as.syncProfile ?? null,
    voiceConfig: as.voiceConfig ?? null,
  },
})

await prisma.$disconnect()

console.log('\n✅ Migration complete!')
console.log(`   Chronicle entries: ${counts.entries}`)
console.log(`   Prayer items:      ${counts.prayers}`)
console.log(`   Formation rhythms: ${counts.rhythms}`)
console.log(`   Scripture bookmarks: ${counts.bookmarks}`)
console.log(`   Owned books:       ${counts.books}`)
console.log(`   Library entries:   ${counts.library}`)
