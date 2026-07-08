// Maps the current route to its visual register (DESIGN.md), so shared
// chrome — the persistent Sidebar and the AI companion panel — can pick
// up the theme of whichever *main section* is active, the way the page
// content itself already does per Design-1 through Design-4. This tracks
// the section (The Daily Office / The Word / The Prayer Room / The
// Thread / Settings), not the sub-page's own register — so /thread/story
// still themes the chrome as Stone Court, since The Thread is the main
// page a person navigated from.
export type RegisterName = 'chapel' | 'manuscript' | 'stonecourt' | 'ledger';

const CHAPEL_PREFIXES = ['/rule', '/prayer', '/questions', '/memory'];
const MANUSCRIPT_PREFIXES = ['/bible', '/study', '/discipleship', '/plans', '/themes', '/explore'];
const STONE_COURT_PREFIXES = ['/thread', '/heritage'];

export function activeRegisterForPath(pathname: string): RegisterName {
  if (pathname === '/') return 'chapel';
  if (STONE_COURT_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return 'stonecourt';
  if (CHAPEL_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return 'chapel';
  if (MANUSCRIPT_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return 'manuscript';
  return 'ledger';
}
