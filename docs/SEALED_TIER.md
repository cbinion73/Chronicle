# The Sealed Tier — Design Doc (F2)

Standing foundation F2 from [ROADMAP.md](../ROADMAP.md): "every
architecture decision favors local-first and user-owned data. No
analytics on entry content, ever. The sealed-entry tier gets a design doc
during Movement II and ships no later than Movement III." This is that
doc. It describes what Milestone 14 actually shipped, what it
deliberately did not, and the target design for closing the gap.

## What shipped in Milestone 14

Sealed Prayers (`ChronicleEntry.type === 'sealed'`) are withheld at the
**UI layer only**:

- `SealedPrayers.tsx` never renders `entry.body` while
  `sourceContext.sealed.opened` is falsy.
- `Chronicle.tsx`'s Record view (`isSealedAndUnopened`) does the same, and
  additionally hides the edit action (editing would leak the body into a
  plain textarea).
- The Markdown exporter (`sealedPrayersExport.ts`) substitutes a
  `[Still sealed]` placeholder for unopened entries.

**What this does not do**: the prayer text is stored in plain text in
Postgres and travels over the wire in plain JSON, exactly like every
other Chronicle entry. Anyone with direct database access, a server-side
log capture, or a browser devtools session mid-fetch can read a "sealed"
prayer before its unlock date. The seal is a **promise the interface
keeps**, not a promise the storage layer enforces. That gap is real and
worth naming plainly rather than letting the ceremony's language imply
more security than exists.

## Why this is an acceptable interim state

Chronicle is currently a single-keeper, local-first deployment behind
Cloudflare Access — the threat model today is "don't show me my own
sealed prayer by accident," not "defend against a hostile party with
database access." UI-level withholding fully satisfies the former. The
latter is a real target, but building real encryption prematurely — before
the braid (multi-user, Movement IV) exists to even define *who* the
threat model needs to exclude — risks over-engineering a feature no one
can attack yet.

## The target design: client-side encryption

When this graduates from "UI promise" to "cryptographic promise":

1. **Key derivation.** A passphrase the keeper sets once (not their
   Cloudflare Access identity — a separate secret, so a compromised
   session token alone can't unseal anything). Derived via a slow KDF
   (Argon2id or PBKDF2 with a high iteration count) into a symmetric key,
   client-side only.
2. **Encrypt before the network call.** `body` (and `title`, since a
   label like "For Sarah's wedding" can itself be sensitive) is encrypted
   in the browser with AES-GCM before `addChronicleEntry` ever calls the
   API. The server stores ciphertext and never sees the passphrase or the
   derived key.
3. **Decrypt only in-browser, only at open-time.** The unlock action
   (`SealedPrayers.tsx`'s "Open This Prayer") prompts for the passphrase,
   derives the key in-memory, decrypts, renders, and discards the key —
   never persisted, never sent anywhere.
4. **The unlock condition stays server-visible.** `unsealAt` / `eventLabel`
   remain plaintext metadata — the *fact* that something is sealed and
   *when* it opens is not sensitive; the *content* is. This mirrors how a
   sealed letter's addressee and postmark are visible while its contents
   aren't.
5. **Passphrase recovery is a real product decision, not an
   afterthought.** A forgotten passphrase must mean the prayer is
   unrecoverable — that's the honest cost of real encryption — and the
   sealing ceremony's UI must say so plainly before the keeper commits to
   it, the same way a password manager warns before a master password is
   set.

## Migration path

No destructive migration required. Existing plaintext sealed entries stay
readable; the encryption format is additive (a `sourceContext.sealed.enc`
flag distinguishing encrypted-body entries from legacy plaintext ones), so
older sealed prayers keep working exactly as they do today while new ones
opt into the stronger guarantee once the passphrase flow ships.

## Ownership

This design doc satisfies F2's Movement II requirement. The actual
encryption implementation is unscheduled on ROADMAP.md's numbered
milestones — it belongs in Movement IV (the braid) once there's a real
multi-party threat model to design against, or sooner if a keeper's
threat model changes before then.
