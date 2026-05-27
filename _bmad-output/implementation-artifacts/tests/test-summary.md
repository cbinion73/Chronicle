# Test Automation Summary

## Battery

### Automated battery command

```bash
CHRONICLE_BASE_URL=http://127.0.0.1:5175 CHRONICLE_DEV_SERVER=1 npm run qa:e2e:battery -- --reporter=line
```

### Clean-server procedure

1. Start a clean repo-backed Chronicle server:

```bash
npm run dev -- --host 127.0.0.1 --port 5175
```

2. Run the serial Playwright battery:

```bash
CHRONICLE_BASE_URL=http://127.0.0.1:5175 CHRONICLE_DEV_SERVER=1 npm run qa:e2e:battery -- --reporter=line
```

3. Use the always-on LAN instance only for spot checks:

```bash
curl -i http://127.0.0.1:5174/
curl -i http://127.0.0.1:5174/api/study-imports/library
curl -i http://127.0.0.1:5174/api/bible-library/status
```

### Expected results

- `lint` passes
- the clean `5175` server stays reachable throughout the run
- Bible, Study, Discipleship, Prayer, Chronicle, Themes, Plans, Insights, and Settings all render
- import library, workbook QA, sync snapshot, and voice-status endpoints return valid payloads
- destructive library actions are only run against the clean repo server, not the always-on service

## Generated / Maintained Tests

### Existing core suite

- `tests/app-smoke.spec.js`
- `tests/bible-settings.spec.js`
- `tests/bible-modes.spec.js`
- `tests/discipleship-progress.spec.js`
- `tests/launch-readiness.spec.js`

### Added battery coverage

- `tests/full-product-battery.spec.js`
  - search and quick navigation
  - global quick-capture Chronicle entry flow
  - page-shell coverage across all core tabs
  - endpoint coherence checks for sync, study library, workbook audit, and voice status

### Runner

- `npm run qa:e2e:battery`
  - intentionally serial (`--workers=1`) because Chronicle is local-first and the battery mutates shared library/state

## Current Findings

### 1. Phone-width Bible overlay is not reliably openable

**Status:** open product issue

**Evidence**

- `tests/app-smoke.spec.js` phone-width test fails while trying to open the Bible reading layer
- after the mobile control is clicked, `Reading Layer Status` does not become visible consistently

**User-facing impact**

- on a phone-sized viewport, Bible study overlays are not trustworthy enough for regular use
- the control appears present, but the surface it should reveal does not consistently settle into the expected state

**Recommended fix**

- give the phone layout one stable overlay-entry action instead of swapping between unstable button variants
- prefer a dedicated mobile action like `Open Themes` that always opens the same drawer/sheet
- add a small post-open state assertion in the UI code path so the panel cannot silently fail open

### 2. The always-on `5174` service is not in sync with the clean repo runtime

**Status:** open service/environment issue

**Evidence**

- `http://127.0.0.1:5174/api/bible-library/status` still returns `translation` objects where the current repo-backed `5175` service now returns normalized strings
- `http://127.0.0.1:5174/api/study-imports/library` shows stale service data and temp uploads in the service copy
- the repo-backed `5175` instance reflects the latest API fixes, but the LAN service is serving an older runtime/data shape

**User-facing impact**

- the network-served app can drift from the repo app you and I are validating
- Settings / Scripture surfaces can behave differently across local vs always-on service instances

**Recommended fix**

- refresh the launch-agent service copy from the current repo:

```bash
npm run install:launch-agent
```

- then verify the service endpoints again on `5174`
- if needed, clean stale service-library temp uploads under `~/Library/Application Support/ChronicleService/app/data`

### 3. QA against Chronicle must stay serialized

**Status:** harness constraint, not a product bug

**Evidence**

- parallel Playwright workers interfered with shared local library/state
- snapshot creation, temp uploads, and book deletion mutated shared files across workers

**Impact**

- parallel runs create false negatives and misleading runtime drift

**Recommended fix**

- keep the official battery serial
- use targeted parallel runs only for read-only specs

## Passing evidence from this pass

- `tests/bible-settings.spec.js` on clean `5175`: passed after fixing the Bible library translation-shape bug
- clean `5175` endpoint spot-checks returned healthy payloads for:
  - `/api/study-imports/library`
  - `/api/bible-library/status`
- `5174` root is reachable, so the always-on service is up, but it is not yet aligned with the current repo runtime

## Manual extensions still worth running

These are not fully automated yet, but they are part of a real release-grade pass:

1. LAN access from phone/iPad against `5174`
2. voice round-trip:
   - record
   - transcribe
   - speak reply
3. packaged desktop app smoke
4. reset-personal-progress flow on a real user profile
5. delete-book flow on the always-on service copy after the launch-agent refresh
