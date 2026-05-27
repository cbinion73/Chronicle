import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'

const inputPath = process.argv[2]

if (!inputPath) {
  console.error('Usage: node scripts/import-masterlife-source.mjs /absolute/path/to/masterlife.txt')
  process.exit(1)
}

const raw = readFileSync(inputPath, 'utf-8')

function normalizeLine(line) {
  return line
    .replace(/\f/g, ' ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[\u00A0]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const lines = raw
  .split('\n')
  .map(normalizeLine)
  .filter(Boolean)

const introCandidates = lines
  .map((line, index) => ({ line, index }))
  .filter(({ line }) => /^Introduction\b/i.test(line))

const introIndex =
  introCandidates.find(({ index }) =>
    lines.slice(index + 1, index + 12).some((line) => /MasterLife is a developmental/i.test(line)),
  )?.index ?? introCandidates[0]?.index ?? -1

const sixIndex = lines.findIndex((line, index) => index > introIndex && /SIX KEY DISCIPLINES/i.test(line))

const introExcerpt = lines
  .slice(introIndex + 1, sixIndex > introIndex ? sixIndex : introIndex + 40)
  .filter((line) => !/^\d+\s*\/\s*/.test(line))
  .slice(0, 18)

const weekTitlesByNumber = new Map([
  [1, 'Spend Time with the Master'],
  [2, 'Live in the Word'],
  [3, 'Pray in Faith'],
  [4, 'Fellowship with Believers'],
  [5, 'Witness to the World'],
  [6, 'Minister to Others'],
])

const weekMatches = []
for (const line of lines) {
  const match = line.match(/^WEEK\s+(\d+)\s+(.+)$/i)
  if (!match) continue
  const week = Number(match[1])
  const rawTitle = match[2]
    .replace(/[.\-–—_]+/g, ' ')
    .replace(/\s+\d+\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim()

  weekMatches.push({
    week,
    title: weekTitlesByNumber.get(week) || rawTitle,
    rawTitle,
  })
}

const uniqueWeeks = Array.from(
  new Map(weekMatches.map((entry) => [entry.week, entry])).values(),
).sort((a, b) => a.week - b.week)

const disciplines = [
  'spend time with the Master',
  'live in the Word',
  'pray in faith',
  'fellowship with believers',
  'witness to the world',
  'minister to others',
]

const output = {
  importedFrom: resolve(inputPath),
  importedAt: new Date().toISOString(),
  sourceTitle: "MasterLife 1: The Disciple's Cross",
  sourceBook: 'Book 1',
  overviewTitle: 'The Disciple’s Cross',
  weekTitles: uniqueWeeks,
  sixDisciplines: disciplines,
  introExcerpt,
}

const dataDir = resolve('data/ocr')
const generatedDir = resolve('src/lib/generated')
mkdirSync(dataDir, { recursive: true })
mkdirSync(generatedDir, { recursive: true })

const jsonPath = resolve(dataDir, 'masterlife-book1-source.json')
writeFileSync(jsonPath, `${JSON.stringify(output, null, 2)}\n`, 'utf-8')

const tsPath = resolve(generatedDir, 'masterlifeBook1Source.ts')
const tsSource = `export const masterlifeBook1Source = ${JSON.stringify(output, null, 2)} as const;\n`
writeFileSync(tsPath, tsSource, 'utf-8')

console.log(`Imported ${basename(inputPath)} -> ${jsonPath}`)
console.log(`Generated ${tsPath}`)
