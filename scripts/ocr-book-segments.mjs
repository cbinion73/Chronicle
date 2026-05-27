import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const inputPdf = process.argv[2]
const outputStemArg = process.argv[3]
const segmentSizeArg = process.argv[4]
const forceOcr = process.argv.slice(4).includes('--force-ocr') || process.argv.slice(5).includes('--force-ocr')

if (!inputPdf) {
  console.error('Usage: node scripts/ocr-book-segments.mjs /absolute/path/to/file.pdf [output-stem] [segment-size] [--force-ocr]')
  process.exit(1)
}

const rootDir = resolve(dirname(new URL(import.meta.url).pathname), '..')
const ocrScriptPath = resolve(rootDir, 'scripts/ocr-study-pdf.sh')
const outputRoot = resolve(rootDir, 'data/ocr/books')
const segmentSize = Math.max(1, Number.parseInt(segmentSizeArg || '20', 10) || 20)

function normalizeStem(value) {
  const base = value || basename(inputPdf, '.pdf')
  return base
    .replace(/\.[^.]+$/, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._/-]+/g, '-')
}

function parsePageCount(pdfinfoOutput) {
  const match = pdfinfoOutput.match(/^Pages:\s+(\d+)/m)
  return match ? Number.parseInt(match[1], 10) : 0
}

function countWords(text) {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

function inferHeading(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && line.length < 120) || null
}

const bookStem = normalizeStem(outputStemArg)
const bookDir = resolve(outputRoot, bookStem)
mkdirSync(bookDir, { recursive: true })

const { stdout: pdfinfoStdout } = await execFileAsync('pdfinfo', [inputPdf], {
  cwd: rootDir,
  maxBuffer: 1024 * 1024,
})

const totalPages = parsePageCount(pdfinfoStdout)
if (!totalPages) {
  console.error('Unable to determine page count for input PDF.')
  process.exit(1)
}

const segments = []
const segmentCount = Math.ceil(totalPages / segmentSize)

for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1) {
  const startPage = segmentIndex * segmentSize + 1
  const endPage = Math.min(totalPages, startPage + segmentSize - 1)
  const pageRange = `${startPage}-${endPage}`
  const segmentStem = `books/${bookStem}/${bookStem}-p${String(startPage).padStart(4, '0')}-${String(endPage).padStart(4, '0')}`

  console.log(`OCR segment ${segmentIndex + 1}/${segmentCount}: pages ${pageRange}`)
  const ocrArgs = [ocrScriptPath, inputPdf, segmentStem, '--pages', pageRange]
  if (forceOcr) ocrArgs.push('--force-ocr')

  await execFileAsync('bash', ocrArgs, {
    cwd: rootDir,
    maxBuffer: 1024 * 1024 * 16,
  })

  const segmentTextPath = resolve(rootDir, 'data/ocr', `${segmentStem}.txt`)
  const segmentMetaPath = resolve(rootDir, 'data/ocr', `${segmentStem}.json`)
  const segmentPdfPath = resolve(rootDir, 'data/ocr', `${segmentStem}.ocr.pdf`)
  const text = readFileSync(segmentTextPath, 'utf8')

  segments.push({
    id: `${bookStem}-segment-${segmentIndex + 1}`,
    order: segmentIndex + 1,
    startPage,
    endPage,
    pageRange,
    textPath: segmentTextPath,
    ocrPdfPath: segmentPdfPath,
    metaPath: segmentMetaPath,
    charCount: text.length,
    wordCount: countWords(text),
    headingGuess: inferHeading(text),
  })
}

const fullTextPath = resolve(bookDir, `${bookStem}.book.txt`)
const manifestPath = resolve(bookDir, `${bookStem}.segments.json`)
const embeddedTextPath = resolve(bookDir, `${bookStem}.embedded.txt`)
const fullText = segments
  .map((segment) => readFileSync(segment.textPath, 'utf8').trim())
  .filter(Boolean)
  .join('\n\n')

let embeddedExtraction = null
if (forceOcr) {
  try {
    await execFileAsync('pdftotext', ['-layout', inputPdf, embeddedTextPath], {
      cwd: rootDir,
      maxBuffer: 1024 * 1024 * 16,
    })
    embeddedExtraction = embeddedTextPath
  } catch (error) {
    console.warn(`Unable to extract embedded source text: ${error instanceof Error ? error.message : String(error)}`)
  }
}

const manifest = {
  sourcePdf: resolve(inputPdf),
  outputStem: bookStem,
  totalPages,
  segmentSize,
  segmentCount,
  forceOcr,
  createdAt: new Date().toISOString(),
  fullTextPath,
  embeddedTextPath: embeddedExtraction,
  segments,
}

writeFileSync(fullTextPath, `${fullText}\n`, 'utf8')
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')

console.log(`Done.`)
console.log(`Full text: ${fullTextPath}`)
console.log(`Manifest:  ${manifestPath}`)
