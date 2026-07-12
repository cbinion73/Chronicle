---
title: 'Align Sermon Notes Template'
type: 'feature'
created: '2026-07-12'
status: 'done'
route: 'one-shot'
---

# Align Sermon Notes Template

## Intent

**Problem:** The initial Sermon Notes workspace used Personal Response and Prayer instead of Chris's established sermon-note template.

**Approach:** Retain the primary freeform Notes area and replace the supporting structure with Big Idea, Key Points, Takeaways, Applications, and Final Takeaway. Preserve prior entries by mapping Personal Response to Applications and Prayer to Final Takeaway when reopened.

## Suggested Review Order

**Template Contract**

- The draft model and serializer define the exact five-field template and retained Notes area.
  [`SermonNotes.tsx:15`](../../src/pages/SermonNotes.tsx#L15)

- Compatibility mapping preserves values from the previous structured template.
  [`SermonNotes.tsx:75`](../../src/pages/SermonNotes.tsx#L75)

- The writing sheet presents all five fields in the requested order.
  [`SermonNotes.tsx:350`](../../src/pages/SermonNotes.tsx#L350)

**Presentation**

- Final Takeaway receives the existing emphasized closing-field treatment.
  [`SermonNotes.module.css:205`](../../src/pages/SermonNotes.module.css#L205)

**Regression Coverage**

- Current round trips and prior-template migration are both verified end to end.
  [`sermon-notes.spec.js:26`](../../tests/sermon-notes.spec.js#L26)
