import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const inputPath = process.argv[2] || 'data/ocr/books/masterlife-book1/masterlife-book1.book.txt';
const outputPath = process.argv[3] || 'src/lib/generated/masterlifeDailyDays.ts';

const raw = readFileSync(inputPath, 'utf8');
const lines = raw.split(/\r?\n/).map((rawLine, index) => ({
  index,
  raw: rawLine,
  text: clean(rawLine),
}));

const BOOKS = [
  { number: 'Book 1', title: "The Disciple's Cross" },
  { number: 'Book 2', title: "The Disciple's Personality" },
  { number: 'Book 3', title: "The Disciple's Victory" },
  { number: 'Book 4', title: "The Disciple's Mission" },
];

const DAY_OVERRIDES = {
  '3-3': { title: 'Enter His Courts with Praise' },
  '3-5': { title: "In God's Presence" },
  '5-5': { title: 'The Price of Bearing Fruit' },
  '7-1': { title: "Who's in Charge?" },
  '7-3': { title: 'Committing Your Personality', dailyReading: 'Exodus 4:1-17' },
  '9-3': { title: 'Giving Thanks in All Things' },
  '9-5': { title: 'The Higher Calling', dailyReading: 'Matthew 26:57-68' },
  '10-3': { title: 'Who Is the Master of Your Body?' },
  '11-2': { title: "Your Spirit and God's Spirit" },
  '14-3': { title: "Encountering Satan's Lies" },
  '19-3': { title: 'Taking the First Steps' },
  '21-3': { title: 'Establishing Young Christians' },
  '22-1': { title: 'Growing Toward Maturity' },
  '22-2': { title: 'The Grace of Giving' },
};

const REFERENCE_PATTERN =
  /\b(?:[1-3]\s*)?(?:Genesis|Gen|Exodus|Ex|Leviticus|Lev|Numbers|Num|Deuteronomy|Deut|Joshua|Josh|Judges|Judg|Ruth|Samuel|Sam|Kings|Chronicles|Chron|Ezra|Nehemiah|Neh|Esther|Esth|Job|Psalm|Psalms|Ps|Proverbs|Prov|Ecclesiastes|Eccl|Isaiah|Isa|Jeremiah|Jer|Lamentations|Lam|Ezekiel|Ezek|Daniel|Dan|Hosea|Hos|Joel|Amos|Obadiah|Obad|Jonah|Micah|Nahum|Habakkuk|Hab|Zephaniah|Zeph|Haggai|Hag|Zechariah|Zech|Malachi|Mal|Matthew|Matt|Mark|Luke|John|Acts|Romans|Rom|Corinthians|Cor|Galatians|Gal|Ephesians|Eph|Philippians|Phil|Colossians|Col|Thessalonians|Thess|Timothy|Tim|Titus|Philemon|Phlm|Hebrews|Heb|James|Jas|Peter|Pet|Jude|Revelation|Rev)\.?\s+\d+(?::\d+)?(?:[-–]\d+)?(?:[-–]\d+)?/gi;

function clean(value) {
  return value
    .replace(/\f/g, ' ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripOcrNoise(value) {
  return clean(value)
    .replace(/^(?:Se|So|Sv|BS|aod|I|t|i|\|)\s+/i, '')
    .replace(/\bDatry\b/gi, 'Daily')
    .replace(/\bDatly\b/gi, 'Daily')
    .replace(/\bAlide\b/gi, 'Abide')
    .replace(/\bFuuth\b/gi, 'Faith')
    .replace(/\bLave\b/gi, 'Live')
    .replace(/\bMimstry\b/gi, 'Ministry')
    .replace(/\bMimster\b/gi, 'Minister')
    .replace(/\bGoa's\b/gi, "God's")
    .replace(/\bGods\b/g, "God's")
    .replace(/\bWhos\b/g, "Who's")
    .replace(/\bFurst\b/g, 'First')
    .replace(/\bGing\b/g, 'Giving')
    .replace(/\btoJesus\b/g, 'to Jesus')
    .replace(/\bColaborers\b/g, 'Co-laborers')
    .replace(/\s+GUIDE$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isNoise(value) {
  if (!value) return true;
  if (/^\d+\s*\/\s*/.test(value)) return true;
  if (/^\d+\s*\/\s*THE DISCIPLE/i.test(value)) return true;
  if (/^\d+$/.test(value)) return true;
  if (/^\./.test(value)) return true;
  if (/^[\W_]{1,5}$/.test(value)) return true;
  if (/^(Se|So|Sv|BS|a|aod|=|_|-|—|Ret|Sr|WC eONANAR)$/i.test(value)) return true;
  if (/^(Daily|Datry) Master/i.test(value)) return true;
  if (/^Communication/i.test(value)) return true;
  if (/^Guide$/i.test(value)) return true;
  if (/^What God said/i.test(value)) return true;
  if (/^What I said/i.test(value)) return true;
  return false;
}

function isLikelyHeading(value) {
  const title = stripOcrNoise(value);
  if (isNoise(title)) return false;
  if (title.length < 5 || title.length > 72) return false;
  if (REFERENCE_PATTERN.test(title)) {
    REFERENCE_PATTERN.lastIndex = 0;
    return false;
  }
  REFERENCE_PATTERN.lastIndex = 0;
  if (/[.?!:]$/.test(title)) return false;
  const words = title.split(/\s+/);
  if (words.length > 8) return false;
  const capitalizedWords = words.filter((word) => /^[A-Z0-9'"(]/.test(word));
  return capitalizedWords.length >= Math.max(1, Math.ceil(words.length * 0.45));
}

function findWeekStarts() {
  const starts = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (/^This Week'?s Goal/i.test(lines[index].text)) {
      starts.push(index);
    }
  }
  return starts;
}

function getWeekTitle(start) {
  const candidates = [];
  for (let index = start - 1; index >= Math.max(0, start - 14); index -= 1) {
    const text = stripOcrNoise(lines[index].text);
    if (!isNoise(text) && !/^WEEK\s+\d+/i.test(text)) {
      candidates.unshift(text);
    }
  }
  return stripOcrNoise(candidates[candidates.length - 1] || 'Weekly Source Material');
}

function getWeekGoal(start, end) {
  const goalLines = [];
  for (let index = start + 1; index < Math.min(end, start + 12); index += 1) {
    const text = lines[index].text;
    if (/^My Walk/i.test(text)) break;
    if (!isNoise(text)) goalLines.push(text);
  }
  return stripOcrNoise(goalLines.join(' '));
}

function getReferences(text) {
  return Array.from(new Set((text.match(REFERENCE_PATTERN) || []).map(normalizeReference)));
}

function normalizeReference(reference) {
  return clean(reference)
    .toLowerCase()
    .replace(/\b([1-3])\s+/g, '$1 ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replace(/\bPhil\./g, 'Phil.')
    .replace(/\bRom\./g, 'Rom.')
    .replace(/\bMatt\./g, 'Matt.')
    .replace(/\bGal\./g, 'Gal.')
    .replace(/\bEph\./g, 'Eph.')
    .replace(/\bCol\./g, 'Col.')
    .replace(/\bThess\./g, 'Thess.')
    .replace(/\bTim\./g, 'Tim.')
    .replace(/\bPet\./g, 'Pet.')
    .replace(/\bCor\./g, 'Cor.')
    .replace(/\bPs\./g, 'Ps.')
    .replace(/\bRev\./g, 'Rev.');
}

function getMemoryReference(text) {
  const refs = getReferences(text);
  return refs[0] || '';
}

function dayMarkerAt(index) {
  const text = lines[index].text;
  const direct = text.match(/\bDAY\s+([1-5])\b/);
  if (direct && text.length < 72) return Number(direct[1]);

  if (/^DAY$/i.test(text)) {
    for (let probe = index + 1; probe < index + 5 && probe < lines.length; probe += 1) {
      const numeric = lines[probe].text.match(/^([1-5])$/);
      if (numeric) return Number(numeric[1]);
    }
  }

  if (/\bDAY\b/.test(text) && text.length < 72) {
    for (let probe = index - 2; probe <= index + 3 && probe < lines.length; probe += 1) {
      if (probe < 0) continue;
      const numeric = lines[probe].text.match(/^([1-5])$/);
      if (numeric) return Number(numeric[1]);
    }
  }

  return null;
}

function getTitleAfter(markerIndex, sectionEnd) {
  const candidates = [];
  for (let index = markerIndex + 1; index < Math.min(sectionEnd, markerIndex + 22); index += 1) {
    const candidate = stripOcrNoise(lines[index].text);
    if (isLikelyHeading(candidate)) {
      candidates.push(candidate);
    }
  }
  return candidates[0] || 'Daily Source Assignment';
}

function getDailyReading(sectionLines, fallbackReference) {
  const lineWindows = sectionLines.map((line, index) => ({
    text: [line.text, sectionLines[index + 1]?.text, sectionLines[index + 2]?.text].filter(Boolean).join(' '),
  }));
  const reverseWindows = [...lineWindows].reverse();

  for (const line of reverseWindows) {
    if (!/(today read|for today|quiet time today|during your quiet time today|in your quiet time today|bible reading use|today during your quiet time)/i.test(line.text)) continue;
    const refs = getReferences(line.text);
    if (refs.length > 0) return refs[0];
  }

  for (const line of reverseWindows) {
    if (!/(today|quiet time|Bible passage|Bible read)/i.test(line.text)) continue;
    const refs = getReferences(line.text);
    if (refs.length > 0) return refs[0];
  }

  for (const line of lineWindows) {
    if (!/\bread\b|\bRead\b|\bScripture-memory\b/i.test(line.text)) continue;
    const refs = getReferences(line.text);
    if (refs.length > 0) return refs[0];
  }

  return fallbackReference;
}

function compactMemoryVerse(weekText) {
  const match = weekText.match(/This Week'?s Scripture-Memory Verses?\s+(.+?)(?=\s+DAY\b|\s+\d+\s*\/\s*THE DISCIPLE|$)/i);
  if (!match?.[1]) return '';
  return stripOcrNoise(match[1])
    .replace(/\s+\d+\s*\/\s*THE DISCIPLE.+$/i, '')
    .replace(/\s+[A-Z][A-Za-z' -]{3,60}\s*\/\s*\d+.*$/i, '')
    .slice(0, 260);
}

const weekStarts = findWeekStarts();
const weeks = weekStarts.map((start, index) => {
  const end = weekStarts[index + 1] || lines.length;
  const book = BOOKS[Math.min(BOOKS.length - 1, Math.floor(index / 6))];
  const weekInBook = (index % 6) + 1;
  const weekText = lines.slice(start, end).map((line) => line.text).join(' ');
  const memoryVerse = compactMemoryVerse(weekText);
  const memoryVerseReference = getMemoryReference(memoryVerse || weekText);
  const markers = [];

  for (let lineIndex = start; lineIndex < end; lineIndex += 1) {
    const dayInWeek = dayMarkerAt(lineIndex);
    if (dayInWeek) markers.push({ dayInWeek, lineIndex });
  }

  return {
    start,
    end,
    book,
    weekInBook,
    absoluteWeek: index + 1,
    title: getWeekTitle(start),
    goal: getWeekGoal(start, end),
    memoryVerse,
    memoryVerseReference,
    markers,
  };
});

const days = [];
for (const week of weeks) {
  const markersByDay = new Map();
  week.markers.forEach((marker) => {
    if (!markersByDay.has(marker.dayInWeek)) markersByDay.set(marker.dayInWeek, marker);
  });

  for (let dayInWeek = 1; dayInWeek <= 5; dayInWeek += 1) {
    const marker = markersByDay.get(dayInWeek);
    const orderedMarkers = week.markers.filter((entry) => entry.lineIndex >= (marker?.lineIndex || week.start));
    const nextMarker = orderedMarkers.find((entry) => entry.lineIndex > (marker?.lineIndex || week.start));
    const sectionStart = marker?.lineIndex || week.start;
    const sectionEnd = nextMarker?.lineIndex || week.end;
    const sectionLines = marker ? lines.slice(sectionStart, sectionEnd).filter((line) => line.text) : [];
    const sectionText = sectionLines.map((line) => line.text).join(' ');
    const fallbackReference = week.memoryVerseReference || getReferences(sectionText)[0] || '';

    const override = DAY_OVERRIDES[`${week.absoluteWeek}-${dayInWeek}`] || {};
    const title = override.title || (marker ? getTitleAfter(marker.lineIndex, sectionEnd) : `${week.title} · Source Day ${dayInWeek}`);
    const dailyReading = override.dailyReading || (marker ? getDailyReading(sectionLines, fallbackReference) : fallbackReference);

    days.push({
      day: days.length + 1,
      bookNumber: week.book.number,
      bookTitle: week.book.title,
      absoluteWeek: week.absoluteWeek,
      weekInBook: week.weekInBook,
      dayInWeek,
      weekTitle: week.title,
      title,
      weekGoal: week.goal,
      memoryVerse: week.memoryVerse,
      memoryVerseReference: week.memoryVerseReference,
      dailyReading,
      sourceFound: Boolean(marker),
    });
  }
}

const source = `export const masterlifeDailyDays = ${JSON.stringify(days, null, 2)} as const;\n`;
mkdirSync(dirname(resolve(outputPath)), { recursive: true });
writeFileSync(outputPath, source, 'utf8');

console.log(`Generated ${days.length} MasterLife daily entries -> ${outputPath}`);
console.log(`Source days found by OCR markers: ${days.filter((day) => day.sourceFound).length}/${days.length}`);
