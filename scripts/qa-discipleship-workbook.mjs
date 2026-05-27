import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const catalogPath = resolve(process.cwd(), 'data/library/catalog.json')
const reportPath = resolve(process.cwd(), 'data/library/qa/discipleship-workbook-audit.json')

function normalizeTitle(value = '') {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function splitPages(text) {
  return text.split('\f').map((pageText, index) => ({
    pageNumber: index + 1,
    text: pageText,
    normalized: pageText.toLowerCase(),
  }))
}

function detectResponseCues(page) {
  const cues = []
  const text = page.normalized

  const patterns = [
    { kind: 'decision', label: 'accept Jesus prompt', regex: /if you sense a need to accept jesus/i },
    { kind: 'follow-up', label: 'help / tell someone prompt', regex: /if you need help, call on your minister|tell someone the good news/i },
    { kind: 'activity', label: 'learning activities prompt', regex: /the learning activities are indicated by the symbol/i },
    { kind: 'activity', label: 'written activity prompt', regex: /answer the following questions|complete the following|write the key words or phrases|on a separate sheet of paper|summarize all seven realities|read .*answer the following questions|list the ways|record the reasons|describe the difference|what did you learn/i },
    { kind: 'checkbox', label: 'check your response prompt', regex: /check your response/i },
    { kind: 'yes-no', label: 'yes no response prompt', regex: /\byes\b.*\bno\b/i },
    { kind: 'annotation', label: 'underline instruction', regex: /underline where he was to go and what he was to do/i },
    { kind: 'memory', label: 'write memory verse prompt', regex: /write your memory verse|verse to memoriz/i },
    { kind: 'review', label: 'most meaningful review prompt', regex: /what was the most meaningful state/i },
    { kind: 'review', label: 'prayer reword prompt', regex: /reword the statement or scripture into a prayer/i },
    { kind: 'review', label: 'response action prompt', regex: /what does god want you to do in response to today'?s study/i },
  ]

  for (const pattern of patterns) {
    if (pattern.regex.test(text)) cues.push(pattern)
  }

  return cues
}

function pageSlicesForDay(day) {
  if (day.sourcePageSlices?.length) return day.sourcePageSlices
  const slices = []
  for (let pageNumber = day.sourcePageStart; pageNumber <= day.sourcePageEnd; pageNumber += 1) {
    slices.push({ pageNumber })
  }
  return slices
}

function cueYPosition(cue, page) {
  const before = page.text.slice(0, cue.matchIndex)
  const lineIndex = before.split(/\r?\n/).length - 1
  const lines = page.text.replace(/\r/g, '').split(/\n/).filter(Boolean)
  const ratio = lineIndex / Math.max(1, lines.length - 1)
  return Math.max(8, Math.min(82, Math.round(ratio * 86)))
}

function main() {
  if (!existsSync(catalogPath)) {
    console.log('[qa:discipleship] No library catalog found. Skipping workbook audit.')
    return
  }

  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'))
  const report = {
    generatedAt: new Date().toISOString(),
    audits: [],
    warnings: [],
  }

  for (const record of catalog) {
    if (record.status !== 'structured' || !record.generatedPlan?.days?.length || !record.ocrTextPath || !existsSync(record.ocrTextPath)) {
      continue
    }

    const titleKey = normalizeTitle(record.title)
    const pages = splitPages(readFileSync(record.ocrTextPath, 'utf8'))
    for (const day of record.generatedPlan.days) {
      if (!day.sourcePageStart || !day.sourcePageEnd) continue

      const pageRange = []
      for (let pageNumber = day.sourcePageStart; pageNumber <= day.sourcePageEnd; pageNumber += 1) {
        pageRange.push(pageNumber)
      }

      const cuePages = pageRange
        .map((pageNumber) => {
          const page = pages[pageNumber - 1]
          if (!page) return null
          const cues = detectResponseCues(page).map((cue) => ({
            ...cue,
            matchIndex: page.normalized.search(cue.regex),
          }))
          return cues.length > 0 ? { pageNumber, cues } : null
        })
        .filter(Boolean)

      const slicedCuePages = pageSlicesForDay(day)
        .map((slice) => {
          const page = pages[slice.pageNumber - 1]
          if (!page) return null
          const start = slice.startY ?? 0
          const end = slice.endY ?? 100
          const cues = detectResponseCues(page)
            .map((cue) => ({ ...cue, matchIndex: page.normalized.search(cue.regex) }))
            .filter((cue) => {
              const y = cueYPosition(cue, page)
              return y >= start && y <= end
            })
          return cues.length > 0
            ? {
                pageNumber: slice.pageNumber,
                sliceLabel: slice.label,
                cues,
              }
            : null
        })
        .filter(Boolean)

      const coveredPages = Array.from(new Set((day.workbookOverlays || []).map((overlay) => overlay.pageNumber))).sort((a, b) => a - b)
      const uncoveredCuePages = slicedCuePages
        .filter(({ pageNumber }) => !coveredPages.includes(pageNumber))
        .map(({ pageNumber, sliceLabel, cues }) => ({
          pageNumber,
          sliceLabel,
          cueLabels: cues.map((cue) => cue.label),
        }))

      const audit = {
        bookId: record.id,
        title: record.title,
        day: day.day,
        section: day.title,
        pageRange,
        coveredPages,
        cuePages: slicedCuePages.map(({ pageNumber, sliceLabel, cues }) => ({
          pageNumber,
          sliceLabel,
          cueLabels: cues.map((cue) => cue.label),
        })),
        uncoveredCuePages,
      }

      report.audits.push(audit)

      if (uncoveredCuePages.length > 0) {
        report.warnings.push({
          title: record.title,
          day: day.day,
          section: day.title,
          uncoveredCuePages,
        })
      }
    }
  }

  mkdirSync(resolve(process.cwd(), 'data/library/qa'), { recursive: true })
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')

  if (report.warnings.length > 0) {
    console.log(`[qa:discipleship] Workbook audit found ${report.warnings.length} day(s) with uncovered response cues.`)
    for (const warning of report.warnings.slice(0, 12)) {
      const pages = warning.uncoveredCuePages.map((entry) => `${entry.pageNumber} (${entry.cueLabels.join(', ')})`).join('; ')
      console.log(`- ${warning.title} Day ${warning.day} "${warning.section}": ${pages}`)
    }
    console.log(`[qa:discipleship] Full report saved to ${reportPath}`)
    return
  }

  console.log(`[qa:discipleship] Workbook audit passed. Full report saved to ${reportPath}`)
}

main()
