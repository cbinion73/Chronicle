import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const catalogPath = resolve(process.cwd(), 'data/library/catalog.json')

function compactInline(value = '') {
  return value.replace(/\s+/g, ' ').trim()
}

function splitPages(text) {
  return text.split('\f').map((pageText, index) => ({
    pageNumber: index + 1,
    lines: pageText.replace(/\r/g, '').split(/\n/).map(compactInline).filter(Boolean),
  }))
}

function detectResponseCues(lines) {
  const patterns = [
    { kind: 'decision', regex: /if you sense a need to accept jesus/i },
    { kind: 'follow-up', regex: /if you need help, call on your minister|tell someone the good news/i },
    { kind: 'activity', regex: /the learning activities are indicated by the symbol/i },
    { kind: 'activity-generic', regex: /answer the following questions|complete the following|write the key words or phrases|on a separate sheet of paper|summarize all seven realities|read .*answer the following questions/i },
    { kind: 'checkbox', regex: /check your response/i },
    { kind: 'yes-no', regex: /\byes\b.*\bno\b/i },
    { kind: 'annotation', regex: /underline where he was to go and what he was to do/i },
    { kind: 'memory', regex: /write your memory verse|verse to memoriz/i },
    { kind: 'activity-generic', regex: /list the ways|record the reasons|describe the difference|what did you learn/i },
    { kind: 'review-header', regex: /review today’s lesson\. pray|review today's lesson\. pray/i },
    { kind: 'review-meaningful', regex: /what was the most meaningful stat(e)?ment or scripture you read today/i },
    { kind: 'review-prayer', regex: /reword the statement or scripture into a prayer of response to god/i },
    { kind: 'review-action', regex: /what does god want you to do in response to today'?s study/i },
  ]

  const cues = []
  lines.forEach((line, lineIndex) => {
    for (const pattern of patterns) {
      if (pattern.regex.test(line)) cues.push({ kind: pattern.kind, lineIndex })
    }
  })
  return cues
}

function cueYPosition(lineIndex, totalLines) {
  if (!totalLines) return 16
  const ratio = lineIndex / Math.max(1, totalLines - 1)
  return Math.max(8, Math.min(82, Math.round(ratio * 86)))
}

function sliceBounds(slice = {}) {
  return {
    start: Math.max(0, slice.startY ?? 0),
    end: Math.min(100, slice.endY ?? 100),
  }
}

function fullPageSlicesForDay(day) {
  if (day.sourcePageSlices?.length) return day.sourcePageSlices
  const start = day.sourcePageStart || 1
  const end = day.sourcePageEnd || start
  return Array.from({ length: Math.max(1, end - start + 1) }, (_, index) => ({ pageNumber: start + index }))
}

function cueBelongsToSlice(cue, lines, slice) {
  const y = cueYPosition(cue.lineIndex, lines.length)
  const { start, end } = sliceBounds(slice)
  return y >= start && y <= end
}

function textareaOverlay(key, label, prompt, placeholder, pageNumber, x, y, width, minHeight) {
  return { key, label, prompt, placeholder, pageNumber, x, y, width, minHeight, kind: 'textarea' }
}

function checkboxOverlay(key, label, prompt, pageNumber, x, y, width, minHeight, options) {
  return { key, label, prompt, placeholder: 'Select the response that fits best.', pageNumber, x, y, width, minHeight, kind: 'checkbox-group', options }
}

function buildExperiencingGodManualOverlays(day) {
  if (day.day !== 3) return day.workbookOverlays || []
  return [
    checkboxOverlay('highlight', '1. Should You Be God’s Servant?', 'Based on these Scriptures and others you may know, check your response.', 13, 4, 34, 44, 70, ['Yes', 'No']),
    checkboxOverlay('underline', '2. Frustrated in Service?', 'Have you ever given your best effort to serve God and felt frustrated when nothing lasting resulted?', 13, 52, 34, 40, 70, ['Yes', 'No']),
    textareaOverlay('notes', '3. What Is a Servant?', 'Define servant in your own words.', 'Describe what a servant of God is in your own words.', 13, 4, 52, 58, 94),
    textareaOverlay('scriptureTruth', '4. Servant Questions', 'Answer the questions about what a servant can do and what God must do through a servant.', 'Work through the servant questions from this page.', 14, 4, 14, 58, 112),
    textareaOverlay('truthForMe', '5. Elijah Questions', 'Answer the Elijah questions and capture what this passage shows about God working through His servant.', 'Work through the Elijah questions from this page.', 14, 4, 58, 58, 142),
    textareaOverlay('examination', '6. Service Reflection', 'Respond to the reflection questions about service, church life, and what only God can do.', 'Use this space for the service reflection questions.', 15, 4, 20, 58, 132),
    textareaOverlay('prayerResponse', '7. Personalize Reality 7', 'Write the seventh reality in first person and respond to God about it.', 'Personalize the final reality and turn it into a prayer.', 15, 4, 68, 58, 100),
  ]
}

function dailyReviewOverlays(pageNumber) {
  return [
    textareaOverlay('dailyReviewMeaningful', 'Most Meaningful Truth', 'What was the most meaningful statement or Scripture you read today?', 'Name the statement or Scripture that stayed with you most.', pageNumber, 3, 73, 28, 104),
    textareaOverlay('dailyReviewPrayer', 'Prayer of Response', 'Reword the statement or Scripture into a prayer of response to God.', 'Turn today’s truth into a prayer.', pageNumber, 36, 73, 28, 104),
    textareaOverlay('dailyReviewAction', 'What Will You Do?', 'What does God want you to do in response to today’s study?', 'Name the response or action God is calling for today.', pageNumber, 68, 73, 28, 104),
  ]
}

function addOverlayIfMissing(overlays, overlay) {
  if (!overlays.some((entry) => entry.key === overlay.key && entry.pageNumber === overlay.pageNumber)) {
    overlays.push(overlay)
  }
}

function addCueDrivenOverlays(day, pages) {
  const overlays = [...buildExperiencingGodManualOverlays(day)]
  const hasKeyOnPage = (key, pageNumber) => overlays.some((overlay) => overlay.key === key && overlay.pageNumber === pageNumber)
  const pickKey = (candidates) => candidates.find((candidate) => !overlays.some((overlay) => overlay.key === candidate)) || candidates[0]

  for (const slice of fullPageSlicesForDay(day)) {
    const page = pages.find((entry) => entry.pageNumber === slice.pageNumber)
    if (!page) continue
    const cues = detectResponseCues(page.lines).filter((cue) => cueBelongsToSlice(cue, page.lines, slice))
    if (!cues.length) continue

    if (cues.some((cue) => cue.kind.startsWith('review-')) && !hasKeyOnPage('dailyReviewMeaningful', slice.pageNumber)) {
      for (const overlay of dailyReviewOverlays(slice.pageNumber)) addOverlayIfMissing(overlays, overlay)
    }

    for (const cue of cues) {
      const y = cueYPosition(cue.lineIndex, page.lines.length)
      if (cue.kind === 'review-header' || cue.kind.startsWith('review-')) continue

      if (cue.kind === 'memory') {
        addOverlayIfMissing(
          overlays,
          textareaOverlay('memoryVerseWrite', 'Memory Verse', 'Write the memory verse from this page here.', 'Write the memory verse in your preferred translation.', slice.pageNumber, 8, y, 44, 96),
        )
        continue
      }

      if (cue.kind === 'decision') {
        addOverlayIfMissing(
          overlays,
          checkboxOverlay(
            pickKey(['decisionResponse', 'faithResponseChoice']),
            'Gospel Response',
            'Respond honestly to the invitation on this page.',
            slice.pageNumber,
            8,
            y,
            40,
            82,
            ['I need to receive Christ', 'I want to talk with someone', 'Already settled'],
          ),
        )
        continue
      }

      if (cue.kind === 'follow-up') {
        addOverlayIfMissing(
          overlays,
          textareaOverlay(
            pickKey(['followUpResponse', 'accountabilityResponse']),
            'Follow Up',
            'Capture who you need to tell, contact, or walk with after this prompt.',
            'Name the person or next step this page is asking for.',
            slice.pageNumber,
            52,
            y,
            40,
            88,
          ),
        )
        continue
      }

      if (cue.kind === 'checkbox' || cue.kind === 'yes-no') {
        addOverlayIfMissing(
          overlays,
          checkboxOverlay(
            pickKey(cue.kind === 'yes-no' ? ['yesNoResponse', 'highlight', 'stillness'] : ['faithResponseChoice', 'yesNoResponse', 'highlight']),
            cue.kind === 'checkbox' ? 'Check Your Response' : 'Yes / No Response',
            cue.kind === 'checkbox'
              ? 'Select the response that best fits this workbook question.'
              : 'Mark the yes/no response this page is asking for.',
            slice.pageNumber,
            8,
            y,
            40,
            82,
            cue.kind === 'checkbox'
              ? ['Strongly agree', 'Unsure', 'Need to revisit']
              : ['Yes', 'No'],
          ),
        )
        continue
      }

      if (cue.kind === 'annotation') {
        addOverlayIfMissing(
          overlays,
          textareaOverlay(
            pickKey(['annotationResponse', 'underline']),
            'Underline / Mark',
            'Capture the exact phrases or instructions this page asks you to mark.',
            'Write the words or phrases you would underline here.',
            slice.pageNumber,
            8,
            y,
            40,
            88,
          ),
        )
        continue
      }

      if (cue.kind === 'activity' || cue.kind === 'activity-generic') {
        addOverlayIfMissing(
          overlays,
          textareaOverlay(
            pickKey(['activityResponse', 'notes', 'story', 'scriptureTruth']),
            'Workbook Activity',
            'Complete the written response this page is inviting from you.',
            'Write the response, summary, or questions this activity calls for.',
            slice.pageNumber,
            52,
            y,
            40,
            96,
          ),
        )
      }
    }
  }

  return overlays
}

function main() {
  if (!existsSync(catalogPath)) {
    console.log('[sync:discipleship] No catalog found. Skipping.')
    return
  }

  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'))
  let updatedCount = 0

  const nextCatalog = catalog.map((record) => {
    if (
      record.status !== 'structured'
      || record.workflow !== 'preserve-daily'
      || !record.generatedPlan?.days?.length
      || !record.ocrTextPath
      || !existsSync(record.ocrTextPath)
    ) {
      return record
    }

    const pages = splitPages(readFileSync(record.ocrTextPath, 'utf8'))
    let recordChanged = false
    const nextDays = record.generatedPlan.days.map((day) => {
      if (!day.sourcePageStart || !day.sourcePageEnd) return day
      const nextOverlays = addCueDrivenOverlays(day, pages)
      if (JSON.stringify(nextOverlays) === JSON.stringify(day.workbookOverlays || [])) return day
      recordChanged = true
      return { ...day, workbookOverlays: nextOverlays }
    })

    if (!recordChanged) return record
    updatedCount += 1
    return {
      ...record,
      updatedAt: new Date().toISOString(),
      generatedPlan: {
        ...record.generatedPlan,
        days: nextDays,
      },
    }
  })

  writeFileSync(catalogPath, `${JSON.stringify(nextCatalog, null, 2)}\n`, 'utf8')
  console.log(`[sync:discipleship] Updated ${updatedCount} preserved-daily book record(s).`)
}

main()
