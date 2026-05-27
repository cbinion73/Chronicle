import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { readdir, stat } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { tmpdir } from 'node:os'
import { basename, dirname, extname, join, relative, resolve } from 'node:path'
import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { AccessToken } from 'livekit-server-sdk'
import {
  CHRONICLE_PERSONAS,
  DEFAULT_CHRONICLE_PERSONA,
  getChroniclePersona,
  type ChroniclePersonaId,
} from './src/lib/chroniclePersonas'
import {
  analyzeChapterThemes,
  type StudyChapterEvidence,
  type ThemeAnalysisCacheRecord,
} from './src/lib/bibleThemes'
import {
  CHRONICLE_APP_STATE_VERSION,
  CHRONICLE_LIBRARY_RECORD_SCHEMA_VERSION,
  CHRONICLE_SNAPSHOT_SCHEMA_VERSION,
  migratePortableAppState,
} from './src/lib/chronicleVersioning'
import {
  CHRONICLE_BIBLE_LIBRARY_MANIFEST_SCHEMA_VERSION,
  CHRONICLE_LIBRARY_MANIFEST_SCHEMA_VERSION,
  CHRONICLE_OWNED_BOOK_SCHEMA_VERSION,
  makeManagedAssetRef,
  makeSourceAssetRef,
  normalizeOwnedBookDay,
} from './src/lib/chronicleDataModel'
import { CHRONICLE_SYNC_MODEL_VERSION, createDefaultSyncProfile } from './src/lib/chronicleSync'
import { normalizeVoiceConfig } from './src/lib/voiceConfig'
import type { Chapter } from './src/lib/scripture'
import type {
  ChronicleBookAssetMap,
  ChronicleSyncProfile,
  ChronicleVoiceConfig,
  OwnedBookDailyPlan,
  OwnedBookDaySourceDiagnostics,
  OwnedBookPageSlice,
  OwnedBookPlanDay,
  OwnedBookSourceDiagnostics,
  OwnedBookSourceStructure,
  OwnedBookStudyBlock,
  OwnedBookStudyLayout,
  OwnedBookWorkbookOverlay,
} from './src/types'

const API_BIBLE_BASE_URL = 'https://rest.api.bible/v1'
const execFileAsync = promisify(execFile)

type StudyImportJobKind = 'ocr' | 'segmented' | 'import'
type StudyImportJobStatus = 'running' | 'completed' | 'failed'

interface StudyImportJob {
  id: string
  kind: StudyImportJobKind
  label: string
  status: StudyImportJobStatus
  progress: number
  message: string
  stdout: string
  stderr: string
  startedAt: string
  finishedAt?: string
  result?: Record<string, unknown>
  error?: string
}

interface LibraryBookRecord {
  schemaVersion?: number
  id: string
  title: string
  originalFileName: string
  sourcePath: string
  storedPath: string
  assets?: ChronicleBookAssetMap
  status: 'uploaded' | 'ocr_complete' | 'structured'
  uploadedAt: string
  updatedAt: string
  ocrTextPath?: string | null
  ocrPdfPath?: string | null
  ocrManifestPath?: string | null
  ocrQuality?: OcrQualitySummary | null
  workflow?: 'auto-detect' | 'preserve-daily' | 'ai-daily-study'
  classification?: 'daily-study' | 'general-book'
  summary?: string
  generatedPlan?: OwnedBookDailyPlan
  importDiagnostics?: OwnedBookSourceDiagnostics | null
}

interface ChronicleLibraryManifestRecord {
  schemaVersion: number
  generatedAt: string
  catalogPath: string
  uploadsDir: string
  ocrBooksDir: string
  workbookAuditPath: string
  bibleLibraryManifestPath: string
  libraryRecordSchemaVersion: number
  ownedBookSchemaVersion: number
  recordCount: number
  structuredCount: number
}

interface OcrQualitySummary {
  confidence: 'high' | 'medium' | 'low'
  pageCount: number
  averageCharsPerPage: number
  sparsePageCount: number
  verySparsePageCount: number
  manifestPageCount?: number | null
  warnings: string[]
}

interface ChronicleSyncSnapshotRecord {
  id: string
  createdAt: string
  path: string
  byteSize: number
  schemaVersion: number
  appStateVersion: number
  chronicleEntryCount: number
  prayerItemCount: number
  ownedBookCount: number
  scriptureBookmarkCount: number
  formationRhythmCount: number
  deviceLabel?: string
  platform?: ChronicleSyncProfile['platform']
}

interface ChronicleSyncModelDescriptor {
  version: number
  mode: 'portable-private-sync'
  transport: 'snapshot-exchange'
  mergePolicy: 'field-aware-local-first'
}

interface ChronicleSyncSnapshotPayload {
  id: string
  createdAt: string
  schemaVersion?: number
  appStateVersion?: number
  summary?: {
    chronicleEntryCount?: number
    prayerItemCount?: number
    ownedBookCount?: number
    scriptureBookmarkCount?: number
    structuredLibraryCount?: number
    uploadedLibraryCount?: number
    themeCacheFileCount?: number
    themeCacheVersion?: string | null
    installedTranslationCount?: number
    formationRhythmCount?: number
  }
  syncModel?: ChronicleSyncModelDescriptor
  origin?: ChronicleSyncProfile & { exportedAt?: string }
  appState?: Record<string, unknown>
  libraryCatalog?: LibraryBookRecord[]
  libraryManifest?: ChronicleLibraryManifestRecord
  bibleLibrary?: Record<string, unknown>
  importedAt?: string
  importSourceId?: string | null
}

function migrateLibraryBookRecord(record: Partial<LibraryBookRecord>): LibraryBookRecord {
  const nextId = typeof record.id === 'string' ? record.id : slugifyFileStem(record.title || record.originalFileName || 'book')
  const generatedPlan = record.generatedPlan
    ? {
        ...record.generatedPlan,
        generationStrategy:
          record.generatedPlan.generationStrategy
          || (record.workflow === 'preserve-daily' ? 'preserved-daily' : 'paragraph-chunks'),
        sourceDiagnostics: record.generatedPlan.sourceDiagnostics || record.importDiagnostics || undefined,
        days: (record.generatedPlan.days || []).map((day) => normalizeOwnedBookDay(nextId, day)),
      }
    : undefined
  const assets = buildLibraryAssets({ ...record, id: nextId })

  return {
    schemaVersion: CHRONICLE_LIBRARY_RECORD_SCHEMA_VERSION,
    id: nextId,
    title: typeof record.title === 'string' ? record.title : 'Imported Study',
    originalFileName: typeof record.originalFileName === 'string' ? record.originalFileName : `${typeof record.title === 'string' ? record.title : 'imported-study'}.pdf`,
    sourcePath: typeof record.sourcePath === 'string' ? record.sourcePath : typeof record.storedPath === 'string' ? record.storedPath : '',
    storedPath: typeof record.storedPath === 'string' ? record.storedPath : typeof record.sourcePath === 'string' ? record.sourcePath : '',
    assets,
    status: record.status === 'ocr_complete' || record.status === 'structured' ? record.status : 'uploaded',
    uploadedAt: typeof record.uploadedAt === 'string' ? record.uploadedAt : new Date().toISOString(),
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : new Date().toISOString(),
    ocrTextPath: typeof record.ocrTextPath === 'string' ? record.ocrTextPath : null,
    ocrPdfPath: typeof record.ocrPdfPath === 'string' ? record.ocrPdfPath : null,
    ocrManifestPath: typeof record.ocrManifestPath === 'string' ? record.ocrManifestPath : null,
    ocrQuality: record.ocrQuality
      ? {
          ...record.ocrQuality,
          manifestPageCount: typeof record.ocrQuality.manifestPageCount === 'number' ? record.ocrQuality.manifestPageCount : null,
          warnings: Array.isArray(record.ocrQuality.warnings) ? record.ocrQuality.warnings : [],
        }
      : null,
    workflow: record.workflow === 'preserve-daily' || record.workflow === 'ai-daily-study' ? record.workflow : 'auto-detect',
    classification: record.classification === 'daily-study' || record.classification === 'general-book' ? record.classification : undefined,
    summary: typeof record.summary === 'string' ? record.summary : undefined,
    generatedPlan,
    importDiagnostics: generatedPlan?.sourceDiagnostics || record.importDiagnostics || null,
  }
}

function migrateLibraryCatalog(records: unknown) {
  if (!Array.isArray(records)) return { records: [] as LibraryBookRecord[], changed: false }
  let changed = false
  const nextRecords = records.map((entry) => {
    const migrated = migrateLibraryBookRecord((entry || {}) as Partial<LibraryBookRecord>)
    if (JSON.stringify(entry) !== JSON.stringify(migrated)) changed = true
    return migrated
  })
  return { records: nextRecords, changed }
}

function migrateChronicleSyncSnapshotPayload(snapshotPayload: Partial<ChronicleSyncSnapshotPayload>) {
  const id = typeof snapshotPayload.id === 'string' && snapshotPayload.id.trim().length > 0
    ? normalizeChronicleSnapshotId(snapshotPayload.id)
    : `snapshot-recovered-${new Date().toISOString().replace(/[:.]/g, '-')}`
  const createdAt = typeof snapshotPayload.createdAt === 'string' && snapshotPayload.createdAt.trim().length > 0
    ? snapshotPayload.createdAt
    : new Date().toISOString()
  const migratedAppState = migratePortableAppState(
    snapshotPayload.appState && typeof snapshotPayload.appState === 'object'
      ? snapshotPayload.appState
      : {},
    typeof snapshotPayload.appStateVersion === 'number' ? snapshotPayload.appStateVersion : 0,
  )
  const migratedCatalog = migrateLibraryCatalog(snapshotPayload.libraryCatalog).records
  const originProfile = snapshotPayload.origin && typeof snapshotPayload.origin === 'object'
    ? snapshotPayload.origin as ChronicleSyncProfile & { exportedAt?: string }
    : createDefaultSyncProfile()
  return {
    ...snapshotPayload,
    id,
    createdAt,
    schemaVersion:
      typeof snapshotPayload.schemaVersion === 'number'
        ? Math.max(snapshotPayload.schemaVersion, CHRONICLE_SNAPSHOT_SCHEMA_VERSION)
        : CHRONICLE_SNAPSHOT_SCHEMA_VERSION,
    appStateVersion:
      typeof snapshotPayload.appStateVersion === 'number'
        ? Math.max(snapshotPayload.appStateVersion, CHRONICLE_APP_STATE_VERSION)
        : CHRONICLE_APP_STATE_VERSION,
    appState: migratedAppState,
    libraryCatalog: migratedCatalog,
    syncModel: {
      version: CHRONICLE_SYNC_MODEL_VERSION,
      mode: 'portable-private-sync',
      transport: 'snapshot-exchange',
      mergePolicy: 'field-aware-local-first',
    },
    origin: {
      ...createDefaultSyncProfile(),
      ...originProfile,
      cachePolicy: {
        ...createDefaultSyncProfile().cachePolicy,
        ...(originProfile.cachePolicy || {}),
      },
    },
  }
}

const MANUAL_DAY_SOURCE_OVERRIDES: Record<string, Record<number, { sourcePageStart: number; sourcePageEnd: number; title?: string; sourcePageSlices?: OwnedBookPageSlice[] }>> = {
  'experiencing god': {
    1: { sourcePageStart: 4, sourcePageEnd: 9, title: 'Jesus Is Your Way' },
    2: { sourcePageStart: 10, sourcePageEnd: 12, title: 'Jesus Is Your Model' },
    3: { sourcePageStart: 13, sourcePageEnd: 16, title: 'Learning to Be a Servant of God' },
    4: {
      sourcePageStart: 17,
      sourcePageEnd: 24,
      title: 'God Works Through His Servants, Part 2',
      sourcePageSlices: [
        { pageNumber: 17 },
        { pageNumber: 18 },
        { pageNumber: 19 },
        { pageNumber: 20 },
        { pageNumber: 21 },
        { pageNumber: 22 },
        { pageNumber: 23 },
        { pageNumber: 24, startY: 0, endY: 52, label: 'Page 24 · upper portion' },
      ],
    },
    5: {
      sourcePageStart: 24,
      sourcePageEnd: 27,
      title: 'God-Centered Living',
      sourcePageSlices: [
        { pageNumber: 24, startY: 48, endY: 100, label: 'Page 24 · lower portion' },
        { pageNumber: 25 },
        { pageNumber: 26 },
        { pageNumber: 27 },
      ],
    },
  },
}

const studyImportJobs = new Map<string, StudyImportJob>()

function getChronicleAppRoot() {
  return resolve(process.env.CHRONICLE_APP_ROOT || process.cwd())
}

function getChronicleDataRoot() {
  return resolve(process.env.CHRONICLE_DATA_ROOT || join(getChronicleAppRoot(), 'data'))
}

function resolveChronicleAppPath(...segments: string[]) {
  return resolve(getChronicleAppRoot(), ...segments)
}

function resolveChronicleDataPath(...segments: string[]) {
  return resolve(getChronicleDataRoot(), ...segments)
}

type ChronicleMiddlewareHost = {
  use: {
    (handler: (request: IncomingMessage, response: ServerResponse, next?: () => void) => void | Promise<void>): unknown
    (route: string, handler: (request: IncomingMessage, response: ServerResponse, next?: () => void) => void | Promise<void>): unknown
  }
}

function withChronicleMiddlewares(
  name: string,
  register: (middlewares: ChronicleMiddlewareHost) => void,
): Plugin {
  return {
    name,
    configureServer(server) {
      register(server.middlewares as unknown as ChronicleMiddlewareHost)
    },
    configurePreviewServer(server) {
      register(server.middlewares as unknown as ChronicleMiddlewareHost)
    },
  }
}

function sendJson(response: ServerResponse, statusCode: number, payload: unknown) {
  response.statusCode = statusCode
  response.setHeader('Content-Type', 'application/json')
  response.end(JSON.stringify(payload))
}

function getChronicleInterfaceManifestPath() {
  return resolveChronicleAppPath('src', 'lib', 'manifests', 'chronicle.capabilities.json')
}

function loadChronicleInterfaceManifest() {
  return JSON.parse(readFileSync(getChronicleInterfaceManifestPath(), 'utf8'))
}

function getChronicleInterfaceStoreDir() {
  const dir = resolveChronicleDataPath('jarvis-router')
  mkdirSync(dir, { recursive: true })
  return dir
}

function getChronicleInterfaceSessionsPath() {
  return join(getChronicleInterfaceStoreDir(), 'sessions.json')
}

function getChronicleInterfaceResultsPath() {
  return join(getChronicleInterfaceStoreDir(), 'results.json')
}

function readChronicleInterfaceMap(path: string) {
  if (!existsSync(path)) return {}
  try {
    const payload = JSON.parse(readFileSync(path, 'utf8'))
    return payload && typeof payload === 'object' && !Array.isArray(payload) ? payload as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

function writeChronicleInterfaceMap(path: string, payload: Record<string, unknown>) {
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
}

function saveChronicleInterfaceSession(session: Record<string, unknown>) {
  const requestId = typeof session.request_id === 'string' ? session.request_id : ''
  if (!requestId) {
    throw new Error('request_id is required')
  }
  const records = readChronicleInterfaceMap(getChronicleInterfaceSessionsPath())
  records[requestId] = session
  writeChronicleInterfaceMap(getChronicleInterfaceSessionsPath(), records)
  return session
}

function getChronicleInterfaceSession(requestId: string) {
  const records = readChronicleInterfaceMap(getChronicleInterfaceSessionsPath())
  return (records[requestId] as Record<string, unknown> | undefined) || null
}

function saveChronicleInterfaceResult(result: Record<string, unknown>) {
  const requestId = typeof result.request_id === 'string' ? result.request_id : ''
  if (!requestId) {
    throw new Error('request_id is required')
  }
  const records = readChronicleInterfaceMap(getChronicleInterfaceResultsPath())
  records[requestId] = result
  writeChronicleInterfaceMap(getChronicleInterfaceResultsPath(), records)
  return result
}

function getChronicleInterfaceResult(requestId: string) {
  const records = readChronicleInterfaceMap(getChronicleInterfaceResultsPath())
  return (records[requestId] as Record<string, unknown> | undefined) || null
}

function buildChronicleDeepLink(capability: string, context: Record<string, unknown>) {
  const params = new URLSearchParams()
  if (capability === 'study_passage' && typeof context.passage === 'string' && context.passage) {
    params.set('passage', context.passage)
    return `chronicle://study?${params.toString()}`
  }
  if (capability === 'trace_theme' && typeof context.theme === 'string' && context.theme) {
    params.set('theme', context.theme)
    return `chronicle://themes/trace?${params.toString()}`
  }
  if (capability === 'prayer_session' && typeof context.prompt === 'string' && context.prompt) {
    params.set('prompt', context.prompt)
    return `chronicle://prayer/session?${params.toString()}`
  }
  if (capability === 'formation_memory_lookup') {
    const query = typeof context.prompt === 'string' && context.prompt
      ? context.prompt
      : typeof context.theme === 'string'
        ? context.theme
        : ''
    if (query) {
      params.set('query', query)
      return `chronicle://memory?${params.toString()}`
    }
  }
  if (capability === 'record_spiritual_event' && typeof context.theme === 'string' && context.theme) {
    params.set('theme', context.theme)
    return `chronicle://capture?${params.toString()}`
  }
  if (capability === 'spiritual_timeline') {
    params.set('range', typeof context.range === 'string' && context.range ? context.range : '90d')
    return `chronicle://formation/timeline?${params.toString()}`
  }
  return 'chronicle://home'
}

function chronicleIntegrationDevApi(): Plugin {
  return withChronicleMiddlewares('chronicle-integration-dev-api', (middlewares) => {
    middlewares.use('/api/chronicle/capabilities', async (_request, response) => {
      try {
        sendJson(response, 200, loadChronicleInterfaceManifest())
      } catch (error) {
        sendJson(response, 500, { error: { errmsg: error instanceof Error ? error.message : 'Unable to load Chronicle capability manifest.' } })
      }
    })

    middlewares.use('/api/chronicle/handoff', async (request, response) => {
      if (request.method !== 'POST') {
        sendJson(response, 405, { error: { errmsg: 'Method not allowed.' } })
        return
      }

      try {
        const manifest = loadChronicleInterfaceManifest() as { capabilities?: Record<string, unknown> }
        const body = await readJsonBody(request) as Record<string, unknown>
        const capability = typeof body.capability === 'string' ? body.capability : ''
        if (!capability) {
          sendJson(response, 400, { error: { errmsg: 'capability is required.' } })
          return
        }
        if (!manifest.capabilities || !(capability in manifest.capabilities)) {
          sendJson(response, 400, { error: { errmsg: `Unknown Chronicle capability: ${capability}` } })
          return
        }
        const requestId = typeof body.request_id === 'string' && body.request_id ? body.request_id : `chr-${Date.now()}`
        const context = body.context && typeof body.context === 'object' ? body.context as Record<string, unknown> : {}
        const actor = body.actor && typeof body.actor === 'object' ? body.actor as Record<string, unknown> : {}
        const summary = capability === 'study_passage'
          ? `Chronicle is ready to study ${typeof context.passage === 'string' && context.passage ? context.passage : 'the requested passage'}.`
          : capability === 'prayer_session'
            ? 'Chronicle is ready to continue a prayer session.'
            : capability === 'record_spiritual_event'
              ? 'Chronicle is ready to record this spiritual event.'
              : `Chronicle accepted ${capability}.`
        const session = saveChronicleInterfaceSession({
          request_id: requestId,
          target_system: 'chronicle',
          intent_family: typeof body.intent_family === 'string' ? body.intent_family : 'faith.study',
          intent_subtype: typeof body.intent_subtype === 'string' ? body.intent_subtype : '',
          capability,
          mode: typeof body.mode === 'string' ? body.mode : 'launch',
          actor: {
            actor_id: typeof actor.actor_id === 'string' && actor.actor_id ? actor.actor_id : 'Chris',
            role: typeof actor.role === 'string' && actor.role ? actor.role : 'primary_user',
          },
          context,
          return_contract: body.return_contract && typeof body.return_contract === 'object' ? body.return_contract : {},
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          stub: true,
          summary,
          deep_link: buildChronicleDeepLink(capability, context),
        })
        saveChronicleInterfaceResult({
          request_id: requestId,
          source_system: 'chronicle',
          status: 'completed',
          summary,
          session_id: requestId,
          record_ids: [],
          memory_updates: [],
          deep_link: session.deep_link,
          stub: true,
          received_at: new Date().toISOString(),
        })
        sendJson(response, 202, session)
      } catch (error) {
        sendJson(response, 500, { error: { errmsg: error instanceof Error ? error.message : 'Chronicle handoff failed.' } })
      }
    })

    middlewares.use('/api/chronicle/session', async (request, response) => {
      if (request.method !== 'GET') {
        sendJson(response, 405, { error: { errmsg: 'Method not allowed.' } })
        return
      }
      const requestId = (request.url || '').split('/').filter(Boolean).pop() || ''
      if (!requestId) {
        sendJson(response, 400, { error: { errmsg: 'request_id is required.' } })
        return
      }
      const session = getChronicleInterfaceSession(requestId)
      if (!session) {
        sendJson(response, 404, { error: { errmsg: `Session ${requestId} was not found.` } })
        return
      }
      sendJson(response, 200, { session, result: getChronicleInterfaceResult(requestId) })
    })

    middlewares.use('/api/chronicle/result', async (request, response) => {
      if (request.method !== 'GET') {
        sendJson(response, 405, { error: { errmsg: 'Method not allowed.' } })
        return
      }
      const requestId = (request.url || '').split('/').filter(Boolean).pop() || ''
      if (!requestId) {
        sendJson(response, 400, { error: { errmsg: 'request_id is required.' } })
        return
      }
      const result = getChronicleInterfaceResult(requestId)
      if (!result) {
        sendJson(response, 404, { error: { errmsg: `Result ${requestId} was not found.` } })
        return
      }
      sendJson(response, 200, result)
    })
  })
}

function appendOutput(existing: string, chunk: string) {
  const next = `${existing}${chunk}`
  return next.length > 12000 ? next.slice(-12000) : next
}

function slugifyFileStem(value: string) {
  return value
    .toLowerCase()
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'book'
}

function toChronicleRelativePath(pathValue: string) {
  if (!pathValue) return ''
  const next = relative(getChronicleAppRoot(), pathValue)
  return next && !next.startsWith('..') ? next : pathValue
}

function resolveChroniclePath(pathValue?: string | null) {
  if (!pathValue) return null
  if (pathValue.startsWith('/')) return pathValue
  return resolveChronicleAppPath(pathValue)
}

function buildLibraryAssets(record: Partial<LibraryBookRecord>) {
  const managed = [
    typeof record.storedPath === 'string' && record.storedPath
      ? makeManagedAssetRef(record.id || 'book', 'imported-pdf', toChronicleRelativePath(record.storedPath))
      : null,
    typeof record.ocrTextPath === 'string' && record.ocrTextPath
      ? makeManagedAssetRef(record.id || 'book', 'ocr-text', toChronicleRelativePath(record.ocrTextPath))
      : null,
    typeof record.ocrManifestPath === 'string' && record.ocrManifestPath
      ? makeManagedAssetRef(record.id || 'book', 'ocr-manifest', toChronicleRelativePath(record.ocrManifestPath))
      : null,
    typeof record.ocrPdfPath === 'string' && record.ocrPdfPath
      ? makeManagedAssetRef(record.id || 'book', 'ocr-pdf', toChronicleRelativePath(record.ocrPdfPath))
      : null,
  ].filter(Boolean) as NonNullable<ChronicleBookAssetMap['managed']>

  const sourceKind = typeof record.sourcePath === 'string' && record.storedPath && record.sourcePath === record.storedPath
    ? 'uploaded-pdf'
    : 'external-pdf'

  return {
    source: typeof record.sourcePath === 'string' && record.sourcePath
      ? makeSourceAssetRef(
          record.id || 'book',
          typeof record.originalFileName === 'string' ? record.originalFileName : basename(record.sourcePath),
          record.sourcePath,
          sourceKind,
        )
      : undefined,
    managed,
  } satisfies ChronicleBookAssetMap
}

function getManagedAssetPath(record: Partial<LibraryBookRecord>, kind: NonNullable<ChronicleBookAssetMap['managed']>[number]['kind']) {
  const assetPath = record.assets?.managed?.find((asset) => asset.kind === kind)?.relativePath
  const resolved = resolveChroniclePath(assetPath)
  if (resolved) return resolved
  if (kind === 'imported-pdf') return resolveChroniclePath(record.storedPath) || resolveChroniclePath(record.sourcePath)
  if (kind === 'ocr-text') return resolveChroniclePath(record.ocrTextPath)
  if (kind === 'ocr-manifest') return resolveChroniclePath(record.ocrManifestPath)
  if (kind === 'ocr-pdf') return resolveChroniclePath(record.ocrPdfPath)
  return null
}

function getLibraryCatalogPath() {
  return resolveChronicleDataPath('library', 'catalog.json')
}

function getChronicleLibraryManifestPath() {
  return resolveChronicleDataPath('library', 'manifest.json')
}

function buildChronicleLibraryManifest(records: LibraryBookRecord[]): ChronicleLibraryManifestRecord {
  return {
    schemaVersion: CHRONICLE_LIBRARY_MANIFEST_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    catalogPath: toChronicleRelativePath(getLibraryCatalogPath()),
    uploadsDir: toChronicleRelativePath(resolveChronicleDataPath('library', 'uploads')),
    ocrBooksDir: toChronicleRelativePath(resolveChronicleDataPath('ocr', 'books')),
    workbookAuditPath: toChronicleRelativePath(getDiscipleshipWorkbookAuditPath()),
    bibleLibraryManifestPath: toChronicleRelativePath(getBibleLibraryManifestPath()),
    libraryRecordSchemaVersion: CHRONICLE_LIBRARY_RECORD_SCHEMA_VERSION,
    ownedBookSchemaVersion: CHRONICLE_OWNED_BOOK_SCHEMA_VERSION,
    recordCount: records.length,
    structuredCount: records.filter((record) => record.status === 'structured').length,
  }
}

function saveChronicleLibraryManifest(records: LibraryBookRecord[]) {
  const manifestPath = getChronicleLibraryManifestPath()
  mkdirSync(resolveChronicleDataPath('library'), { recursive: true })
  writeFileSync(manifestPath, `${JSON.stringify(buildChronicleLibraryManifest(records), null, 2)}\n`, 'utf8')
}

function loadLibraryCatalog(): LibraryBookRecord[] {
  const catalogPath = getLibraryCatalogPath()
  if (!existsSync(catalogPath)) return []
  try {
    const raw = readFileSync(catalogPath, 'utf8')
    const parsed = JSON.parse(raw) as unknown
    const migrated = migrateLibraryCatalog(parsed)
    if (migrated.changed) {
      saveLibraryCatalog(migrated.records)
    } else if (!existsSync(getChronicleLibraryManifestPath())) {
      saveChronicleLibraryManifest(migrated.records)
    }
    return migrated.records
  } catch {
    return []
  }
}

function saveLibraryCatalog(records: LibraryBookRecord[]) {
  const catalogPath = getLibraryCatalogPath()
  mkdirSync(resolveChronicleDataPath('library'), { recursive: true })
  const migrated = records.map((record) => migrateLibraryBookRecord(record))
  writeFileSync(catalogPath, `${JSON.stringify(migrated, null, 2)}\n`, 'utf8')
  saveChronicleLibraryManifest(migrated)
}

function isWithinChronicleManagedData(pathValue: string) {
  const resolvedPath = resolve(pathValue)
  const managedRoot = getChronicleDataRoot()
  return resolvedPath === managedRoot || resolvedPath.startsWith(`${managedRoot}/`)
}

function removeManagedPath(pathValue: string, removedPaths: string[]) {
  if (!pathValue || !existsSync(pathValue) || !isWithinChronicleManagedData(pathValue)) return
  rmSync(pathValue, { recursive: true, force: true })
  removedPaths.push(toChronicleRelativePath(pathValue))
}

function removeManagedFilesByPrefix(dirPath: string, prefix: string, removedPaths: string[]) {
  if (!existsSync(dirPath) || !isWithinChronicleManagedData(dirPath)) return
  for (const fileName of readdirSync(dirPath)) {
    if (!fileName.startsWith(prefix)) continue
    removeManagedPath(resolve(dirPath, fileName), removedPaths)
  }
}

function removeWorkbookAuditEntries(bookId: string) {
  const auditPath = getDiscipleshipWorkbookAuditPath()
  if (!existsSync(auditPath)) return false
  try {
    const payload = readJsonFile<{ generatedAt?: string; audits?: Array<Record<string, unknown>>; warnings?: string[] }>(auditPath)
    const audits = Array.isArray(payload.audits) ? payload.audits : []
    const filteredAudits = audits.filter((entry) => entry?.bookId !== bookId)
    if (filteredAudits.length === audits.length) return false
    writeFileSync(auditPath, `${JSON.stringify({
      ...payload,
      audits: filteredAudits,
    }, null, 2)}\n`, 'utf8')
    return true
  } catch {
    return false
  }
}

function deleteLibraryRecord(recordId: string) {
  const records = loadLibraryCatalog()
  const record = records.find((entry) => entry.id === recordId)
  if (!record) return null

  const removedPaths: string[] = []
  for (const kind of ['imported-pdf', 'ocr-text', 'ocr-manifest', 'ocr-pdf'] as const) {
    const managedPath = getManagedAssetPath(record, kind)
    if (managedPath) removeManagedPath(managedPath, removedPaths)
  }

  if (record.sourcePath && record.storedPath && resolve(record.sourcePath) === resolve(record.storedPath)) {
    removeManagedPath(record.sourcePath, removedPaths)
  }

  if (record.ocrTextPath) removeManagedPath(dirname(resolveChroniclePath(record.ocrTextPath) || record.ocrTextPath), removedPaths)
  if (record.ocrManifestPath) removeManagedPath(dirname(resolveChroniclePath(record.ocrManifestPath) || record.ocrManifestPath), removedPaths)
  if (record.ocrPdfPath) removeManagedPath(dirname(resolveChroniclePath(record.ocrPdfPath) || record.ocrPdfPath), removedPaths)

  const slugStem = slugifyFileStem(record.title || basename(record.storedPath || record.sourcePath, extname(record.storedPath || record.sourcePath)))
  removeManagedFilesByPrefix(resolveChronicleDataPath('library', 'page-slices'), `${slugStem}-`, removedPaths)
  removeManagedFilesByPrefix(resolveChronicleDataPath('library', 'page-images'), `${slugStem}-page-`, removedPaths)

  const nextRecords = records.filter((entry) => entry.id !== recordId)
  saveLibraryCatalog(nextRecords)
  const workbookAuditUpdated = removeWorkbookAuditEntries(recordId)

  return {
    record,
    removedPaths,
    workbookAuditUpdated,
  }
}

function getChronicleSyncSnapshotDir() {
  return resolveChronicleDataPath('sync-snapshots')
}

function getDiscipleshipWorkbookAuditPath() {
  return resolveChronicleDataPath('library', 'qa', 'discipleship-workbook-audit.json')
}

function normalizeChronicleSnapshotId(value: string) {
  return value.trim().replace(/^"+|"+$/g, '')
}

function listChronicleSyncSnapshots(): ChronicleSyncSnapshotRecord[] {
  const dir = getChronicleSyncSnapshotDir()
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((fileName) => fileName.endsWith('.json'))
    .map((fileName) => {
      const path = resolve(dir, fileName)
      const payload = migrateChronicleSyncSnapshotPayload(readJsonFile<ChronicleSyncSnapshotPayload>(path))
      const fileStats = statSyncSafe(path)
      const normalizedId = normalizeChronicleSnapshotId(payload.id)
      return {
        id: normalizedId,
        createdAt: payload.createdAt,
        path,
        byteSize: fileStats?.size || 0,
        schemaVersion: typeof payload.schemaVersion === 'number' ? payload.schemaVersion : 0,
        appStateVersion: typeof payload.appStateVersion === 'number' ? payload.appStateVersion : 0,
        chronicleEntryCount: payload.summary?.chronicleEntryCount || 0,
        prayerItemCount: payload.summary?.prayerItemCount || 0,
        ownedBookCount: payload.summary?.ownedBookCount || 0,
        scriptureBookmarkCount: payload.summary?.scriptureBookmarkCount || 0,
        formationRhythmCount: payload.summary?.formationRhythmCount || 0,
        deviceLabel: payload.origin?.deviceLabel,
        platform: payload.origin?.platform,
      }
    })
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
}

function loadChronicleSyncSnapshotById(snapshotId: string) {
  const normalizedId = normalizeChronicleSnapshotId(snapshotId)
  const snapshot = listChronicleSyncSnapshots().find((entry) => normalizeChronicleSnapshotId(entry.id) === normalizedId)
  if (!snapshot) return null
  const payload = migrateChronicleSyncSnapshotPayload(readJsonFile<ChronicleSyncSnapshotPayload>(snapshot.path))
  return {
    snapshot,
    appState: payload.appState || {},
  }
}

function sendJsonFile(response: ServerResponse, path: string, downloadName: string) {
  const payload = readFileSync(path, 'utf8')
  response.statusCode = 200
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`)
  response.end(payload)
}

function statSyncSafe(path: string) {
  try {
    return statSync(path)
  } catch {
    return null
  }
}

function createChronicleSyncSnapshot(appState: Record<string, unknown>) {
  const id = `snapshot-${new Date().toISOString().replace(/[:.]/g, '-')}`
  const createdAt = new Date().toISOString()
  const snapshotsDir = getChronicleSyncSnapshotDir()
  mkdirSync(snapshotsDir, { recursive: true })

  const catalog = loadLibraryCatalog()
  const libraryManifest = buildChronicleLibraryManifest(catalog)
  const themeCacheStatus = getThemeCacheStatus()
  const bibleManifest = readBibleLibraryManifest()

  const chronicleEntries = Array.isArray(appState.chronicleEntries) ? appState.chronicleEntries : []
  const prayerItems = Array.isArray(appState.prayerItems) ? appState.prayerItems : []
  const formationRhythms = Array.isArray(appState.formationRhythms) ? appState.formationRhythms : []
  const ownedBooks = Array.isArray(appState.ownedBooks) ? appState.ownedBooks : []
  const scriptureBookmarks = Array.isArray(appState.scriptureBookmarks) ? appState.scriptureBookmarks : []
  const syncProfile = appState.syncProfile && typeof appState.syncProfile === 'object'
    ? appState.syncProfile as ChronicleSyncProfile
    : createDefaultSyncProfile()

  const snapshotPayload = migrateChronicleSyncSnapshotPayload({
    id,
    createdAt,
    schemaVersion: CHRONICLE_SNAPSHOT_SCHEMA_VERSION,
    appStateVersion: CHRONICLE_APP_STATE_VERSION,
    summary: {
      chronicleEntryCount: chronicleEntries.length,
      prayerItemCount: prayerItems.length,
      formationRhythmCount: formationRhythms.length,
      ownedBookCount: ownedBooks.length,
      scriptureBookmarkCount: scriptureBookmarks.length,
      structuredLibraryCount: catalog.filter((record) => record.status === 'structured').length,
      uploadedLibraryCount: catalog.length,
      themeCacheFileCount: themeCacheStatus.totalCacheFiles,
      themeCacheVersion: themeCacheStatus.latestVersion,
      installedTranslationCount: (bibleManifest.translations || []).length,
    },
    origin: {
      ...createDefaultSyncProfile(),
      ...syncProfile,
      exportedAt: createdAt,
      cachePolicy: {
        ...createDefaultSyncProfile().cachePolicy,
        ...(syncProfile.cachePolicy || {}),
      },
    },
    appState,
    libraryCatalog: catalog,
    libraryManifest,
    bibleLibrary: {
      manifest: bibleManifest,
      themeCacheStatus,
    },
  })

  const outputPath = resolve(snapshotsDir, `${id}.json`)
  writeFileSync(outputPath, `${JSON.stringify(snapshotPayload, null, 2)}\n`, 'utf8')
  const written = statSyncSafe(outputPath)

  return {
    id,
    createdAt,
    path: outputPath,
    byteSize: written?.size || 0,
    schemaVersion: CHRONICLE_SNAPSHOT_SCHEMA_VERSION,
    appStateVersion: CHRONICLE_APP_STATE_VERSION,
    summary: snapshotPayload.summary,
  }
}

function importChronicleSyncSnapshot(snapshotPayload: Partial<ChronicleSyncSnapshotPayload>) {
  if (!snapshotPayload.appState || typeof snapshotPayload.appState !== 'object') {
    throw new Error('Imported Chronicle snapshot is missing an appState payload.')
  }

  const baseId = typeof snapshotPayload.id === 'string' && snapshotPayload.id.trim().length > 0
    ? normalizeChronicleSnapshotId(snapshotPayload.id)
    : `snapshot-imported-${new Date().toISOString().replace(/[:.]/g, '-')}`
  const createdAt = typeof snapshotPayload.createdAt === 'string' && snapshotPayload.createdAt.trim().length > 0
    ? snapshotPayload.createdAt
    : new Date().toISOString()

  const snapshotsDir = getChronicleSyncSnapshotDir()
  mkdirSync(snapshotsDir, { recursive: true })

  let nextId = baseId
  let suffix = 1
  let outputPath = resolve(snapshotsDir, `${nextId}.json`)
  while (existsSync(outputPath)) {
    nextId = `${baseId}-import-${suffix}`
    suffix += 1
    outputPath = resolve(snapshotsDir, `${nextId}.json`)
  }

  const catalog = loadLibraryCatalog()
  const libraryManifest = buildChronicleLibraryManifest(catalog)
  const themeCacheStatus = getThemeCacheStatus()
  const bibleManifest = readBibleLibraryManifest()

  const chronicleEntries = Array.isArray(snapshotPayload.appState.chronicleEntries) ? snapshotPayload.appState.chronicleEntries : []
  const prayerItems = Array.isArray(snapshotPayload.appState.prayerItems) ? snapshotPayload.appState.prayerItems : []
  const formationRhythms = Array.isArray(snapshotPayload.appState.formationRhythms) ? snapshotPayload.appState.formationRhythms : []
  const ownedBooks = Array.isArray(snapshotPayload.appState.ownedBooks) ? snapshotPayload.appState.ownedBooks : []
  const scriptureBookmarks = Array.isArray(snapshotPayload.appState.scriptureBookmarks) ? snapshotPayload.appState.scriptureBookmarks : []

  const normalizedPayload = migrateChronicleSyncSnapshotPayload({
    id: nextId,
    createdAt,
    schemaVersion: typeof snapshotPayload.schemaVersion === 'number' ? snapshotPayload.schemaVersion : CHRONICLE_SNAPSHOT_SCHEMA_VERSION,
    appStateVersion: typeof snapshotPayload.appStateVersion === 'number' ? snapshotPayload.appStateVersion : CHRONICLE_APP_STATE_VERSION,
    summary: {
      chronicleEntryCount: chronicleEntries.length,
      prayerItemCount: prayerItems.length,
      formationRhythmCount: formationRhythms.length,
      ownedBookCount: ownedBooks.length,
      scriptureBookmarkCount: scriptureBookmarks.length,
      structuredLibraryCount: catalog.filter((record) => record.status === 'structured').length,
      uploadedLibraryCount: catalog.length,
      themeCacheFileCount: themeCacheStatus.totalCacheFiles,
      themeCacheVersion: themeCacheStatus.latestVersion,
      installedTranslationCount: (bibleManifest.translations || []).length,
    },
    origin: snapshotPayload.origin,
    appState: snapshotPayload.appState,
    libraryCatalog: catalog,
    libraryManifest,
    bibleLibrary: {
      manifest: bibleManifest,
      themeCacheStatus,
    },
    importedAt: new Date().toISOString(),
    importSourceId: snapshotPayload.id || null,
  })

  writeFileSync(outputPath, `${JSON.stringify(normalizedPayload, null, 2)}\n`, 'utf8')

  const written = statSyncSafe(outputPath)
  return {
    id: nextId,
    createdAt,
    path: outputPath,
    byteSize: written?.size || 0,
    schemaVersion: normalizedPayload.schemaVersion,
    appStateVersion: normalizedPayload.appStateVersion,
    appState: normalizedPayload.appState,
    chronicleEntryCount: chronicleEntries.length,
    prayerItemCount: prayerItems.length,
    formationRhythmCount: formationRhythms.length,
    ownedBookCount: ownedBooks.length,
    scriptureBookmarkCount: scriptureBookmarks.length,
  }
}

function getThemeAnalysisCacheDir() {
  return resolve(process.cwd(), 'data/library/theme-analysis')
}

function getThemeAnalysisCachePath(book: string, chapter: number, translation: string) {
  const safeBook = book.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  const safeTranslation = translation.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return resolve(getThemeAnalysisCacheDir(), `${safeTranslation}__${safeBook}__${chapter}.json`)
}

function getBibleLibraryManifestPath() {
  return resolve(process.cwd(), 'public', 'bibles', 'library', 'manifest.json')
}

function readBibleLibraryManifest() {
  const manifestPath = getBibleLibraryManifestPath()
  const manifest = existsSync(manifestPath)
    ? readJsonFile<{ schemaVersion?: number; kind?: string; installedAt?: string; translations?: Array<{ id: string; label: string; providerId?: string; basePath?: string; sourceLabel?: string }> }>(manifestPath)
    : { translations: [] }
  return {
    schemaVersion: typeof manifest.schemaVersion === 'number' ? manifest.schemaVersion : CHRONICLE_BIBLE_LIBRARY_MANIFEST_SCHEMA_VERSION,
    kind: manifest.kind || 'chronicle-bible-library',
    installedAt: manifest.installedAt || null,
    translations: Array.isArray(manifest.translations) ? manifest.translations : [],
  }
}

function getTranslationManifestPath(basePath: string, id: string) {
  return basePath
    ? resolve(process.cwd(), 'public', basePath.replace(/^\//, ''), 'manifest.json')
    : resolve(process.cwd(), 'public', 'bibles', 'library', id, 'manifest.json')
}

function getThemeCacheStatus() {
  const cacheDir = getThemeAnalysisCacheDir()
  const fileNames = existsSync(cacheDir)
    ? readdirSync(cacheDir).filter((fileName) => fileName.endsWith('.json'))
    : []

  const byTranslation = fileNames.reduce<Record<string, number>>((acc, fileName) => {
    const [translation] = fileName.split('__')
    if (!translation) return acc
    acc[translation] = (acc[translation] || 0) + 1
    return acc
  }, {})

  let latestVersion: string | null = null
  if (fileNames.length > 0) {
    try {
      const sample = readJsonFile<ThemeAnalysisCacheRecord>(resolve(cacheDir, fileNames[0]))
      latestVersion = sample.version || null
    } catch {
      latestVersion = null
    }
  }

  return {
    totalCacheFiles: fileNames.length,
    byTranslation,
    latestVersion,
  }
}

function getLocalCacheSummary(
  records: LibraryBookRecord[],
  bibleManifest: ReturnType<typeof readBibleLibraryManifest>,
  themeCacheStatus: ReturnType<typeof getThemeCacheStatus>,
) {
  return {
    importedPdfCount: records.filter((record) => Boolean(record.assets?.managed?.some((asset) => asset.kind === 'imported-pdf'))).length,
    ocrTextCount: records.filter((record) => Boolean(record.assets?.managed?.some((asset) => asset.kind === 'ocr-text'))).length,
    installedTranslationCount: bibleManifest.translations.length,
    themeCacheFileCount: themeCacheStatus.totalCacheFiles,
  }
}

interface StudyLibraryManifestEntry {
  bookId: string
  path: string
}

interface CrossReferenceBookPayload {
  entries: Record<string, { sourceLabel: string; references: Array<{ targetKey: string; targetLabel: string; note: string }> }>
}

interface VerseCommentaryBookPayload {
  entries: Record<string, { referenceLabel: string; analysis: string; historical: string; questions: string[] }>
}

interface HistoricalCommentaryBookPayload {
  entries: Record<string, Array<{
    id: string
    referenceKey: string
    referenceLabel: string
    author: string
    year?: number
    sourceTitle?: string
    sourceUrl?: string
    quote: string
  }>>
}

interface StrongsChapterPayload {
  verses: Record<string, Array<{
    position: number
    surface: string
    transliteration: string
    strongs: string
    gloss: string
    morphology: string
    definition: string
  }>>
}

const themeStudyManifestCache = new Map<string, Record<string, string>>()

function readJsonFile<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T
}

function getStudyManifestMap(manifestPath: string) {
  if (!themeStudyManifestCache.has(manifestPath)) {
    const manifest = readJsonFile<{ books: StudyLibraryManifestEntry[] }>(resolve(process.cwd(), 'public', manifestPath.replace(/^\//, '')))
    themeStudyManifestCache.set(
      manifestPath,
      Object.fromEntries((manifest.books || []).map((entry) => [entry.bookId, entry.path])),
    )
  }
  return themeStudyManifestCache.get(manifestPath)!
}

function readStudyBookPayload<T>(manifestPath: string, bookId: string) {
  const manifest = getStudyManifestMap(manifestPath)
  const relativePath = manifest[bookId]
  if (!relativePath) return null
  return readJsonFile<T>(resolve(process.cwd(), 'public', relativePath.replace(/^\//, '')))
}

function parseThemeReferenceKey(referenceKey: string) {
  const match = referenceKey.match(/^(?<bookId>[A-Z0-9]+)\.(?<chapter>\d+)(?:\.(?<verseStart>\d+)(?:-(?<verseEnd>\d+))?)?$/)
  if (!match?.groups) return null
  return {
    bookId: match.groups.bookId,
    chapter: Number.parseInt(match.groups.chapter, 10),
    verseStart: match.groups.verseStart ? Number.parseInt(match.groups.verseStart, 10) : null,
    verseEnd: match.groups.verseEnd ? Number.parseInt(match.groups.verseEnd, 10) : null,
  }
}

function resolveThemeHistoricalEntries(
  payload: HistoricalCommentaryBookPayload | null,
  bookId: string,
  chapter: number,
  verse: number,
) {
  if (!payload?.entries) return []
  const results: HistoricalCommentaryBookPayload['entries'][string] = []
  for (const [referenceKey, entries] of Object.entries(payload.entries)) {
    const parsed = parseThemeReferenceKey(referenceKey)
    if (!parsed) continue
    if (parsed.bookId !== bookId || parsed.chapter !== chapter) continue
    if (parsed.verseStart === null) continue
    const end = parsed.verseEnd ?? parsed.verseStart
    if (verse >= parsed.verseStart && verse <= end) results.push(...entries)
  }
  return results
}

function buildStudyEvidenceFromFiles(bookId: string, chapter: number): StudyChapterEvidence | null {
  const strongsPath = resolve(process.cwd(), 'public', 'study-library', 'strongs', 'kjvstudy', 'chapters', `${bookId}.${chapter}.json`)
  const strongs = existsSync(strongsPath) ? readJsonFile<StrongsChapterPayload>(strongsPath) : null
  const crossRefs = readStudyBookPayload<CrossReferenceBookPayload>('/study-library/cross-references/kjvstudy/manifest.json', bookId)
  const kjvCommentary = readStudyBookPayload<VerseCommentaryBookPayload>('/study-library/commentaries/kjvstudy/manifest.json', bookId)
  const historicalCommentary = readStudyBookPayload<HistoricalCommentaryBookPayload>('/study-library/commentaries/commentaries-database/manifest.json', bookId)

  const verses: StudyChapterEvidence['verses'] = {}

  for (let verse = 1; verse <= 200; verse += 1) {
    const verseKey = `${bookId}.${chapter}.${verse}`
    const historicalEntries = resolveThemeHistoricalEntries(historicalCommentary, bookId, chapter, verse)
    const commentaryEntry = kjvCommentary?.entries?.[verseKey]
    const crossRefEntry = crossRefs?.entries?.[verseKey]
    const strongsEntry = strongs?.verses?.[verseKey]

    if (!historicalEntries.length && !commentaryEntry && !crossRefEntry && !strongsEntry) continue

    verses[verse] = {
      strongsLines: (strongsEntry || []).map((token) => `${token.surface}: ${token.gloss}${token.definition ? ` - ${token.definition}` : ''}`),
      commentarySegments: commentaryEntry
        ? [commentaryEntry.analysis || '', commentaryEntry.historical || '', ...(commentaryEntry.questions || [])].filter(Boolean)
        : [],
      crossReferenceNotes: crossRefEntry ? crossRefEntry.references.map((entry) => entry.note).filter(Boolean) : [],
      crossReferenceTargets: crossRefEntry ? crossRefEntry.references.map((entry) => entry.targetLabel).filter(Boolean) : [],
      crossReferenceDetails: crossRefEntry
        ? crossRefEntry.references.map((entry) => ({ note: entry.note || '', targetLabel: entry.targetLabel || '' }))
        : [],
      historicalSegments: historicalEntries.map((entry) => `${entry.author}${entry.sourceTitle ? ` on ${entry.sourceTitle}` : ''}: ${entry.quote}`),
      strongs: (strongsEntry || []).map((token) => `${token.surface} ${token.gloss} ${token.definition} ${token.strongs}`).join(' '),
      commentary: commentaryEntry
        ? `${commentaryEntry.analysis} ${commentaryEntry.historical} ${(commentaryEntry.questions || []).join(' ')}`
        : '',
      crossReferences: crossRefEntry
        ? crossRefEntry.references.map((entry) => `${entry.note} ${entry.targetLabel}`).join(' ')
        : '',
      historicalCommentary: historicalEntries.map((entry) => `${entry.author} ${entry.sourceTitle || ''} ${entry.quote}`).join(' '),
    }
  }

  return {
    verses,
    availableSources: {
      strongs: Boolean(strongs),
      commentary: Boolean(kjvCommentary),
      crossReferences: Boolean(crossRefs),
      historicalCommentary: Boolean(historicalCommentary),
    },
  }
}

function loadChapterFromLocalLibrary(translation: string, bookId: string, chapterNumber: number, basePath?: string): Chapter {
  const chapterPayload = readJsonFile<{
    translation: { shortName?: string }
    book: { id: string; commonName?: string; name: string }
    chapter: { number: number; content: Array<{ type: string; number?: number; content?: string[] }> }
  }>(
    resolve(process.cwd(), 'public', (basePath || `/bibles/library/${translation}`).replace(/^\//, ''), 'chapters', `${bookId}.${chapterNumber}.json`),
  )

  return {
    book: chapterPayload.book.commonName || chapterPayload.book.name,
    bookAbbrev: chapterPayload.book.id,
    chapter: chapterPayload.chapter.number,
    translation: chapterPayload.translation.shortName || translation.toUpperCase(),
    verses: (chapterPayload.chapter.content || [])
      .filter((entry) => entry.type === 'verse' && typeof entry.number === 'number')
      .map((entry) => ({
        number: entry.number as number,
        text: (entry.content || []).join(' ').replace(/\s+/g, ' ').trim(),
      })),
  }
}

function upsertLibraryRecord(record: LibraryBookRecord) {
  const records = loadLibraryCatalog()
  const nextRecords = records.some((entry) => entry.id === record.id)
    ? records.map((entry) => (entry.id === record.id ? { ...entry, ...record } : entry))
    : [record, ...records]
  saveLibraryCatalog(nextRecords)
  return record
}

async function getPdfPageCount(pdfPath: string): Promise<number> {
  const pdfinfoBinary = existsSync('/opt/homebrew/bin/pdfinfo') ? '/opt/homebrew/bin/pdfinfo' : 'pdfinfo'
  const { stdout } = await execFileAsync(pdfinfoBinary, [pdfPath], {
    cwd: process.cwd(),
    maxBuffer: 1024 * 1024,
  })
  const pagesMatch = stdout.match(/Pages:\s+(\d+)/i)
  const pageCount = Number.parseInt(pagesMatch?.[1] || '', 10)

  if (!Number.isFinite(pageCount) || pageCount <= 0) {
    throw new Error('Unable to determine page count for this PDF.')
  }

  return pageCount
}

function recommendOcrChunking(pageCount: number, workflow?: string) {
  const normalizedWorkflow = workflow || 'auto-detect'
  const segmented = pageCount > 24
  let recommendedSegmentSize = pageCount <= 24
    ? Math.max(6, pageCount)
    : pageCount <= 60
      ? 10
      : pageCount <= 140
        ? 14
        : pageCount <= 240
          ? 18
          : pageCount <= 360
            ? 22
            : 26

  if (normalizedWorkflow === 'preserve-daily') {
    recommendedSegmentSize = Math.max(8, recommendedSegmentSize - 2)
  }

  if (normalizedWorkflow === 'ai-daily-study' && pageCount >= 180) {
    recommendedSegmentSize += 2
  }

  const estimatedSegments = segmented ? Math.ceil(pageCount / recommendedSegmentSize) : 1
  const mode = segmented ? 'segmented' : 'single-pass'
  const reasonParts = [
    `${pageCount} pages is ${segmented ? 'large enough to benefit from segmented OCR' : 'small enough for a single OCR pass'}.`,
  ]

  if (normalizedWorkflow === 'preserve-daily') {
    reasonParts.push('I biased toward slightly smaller chunks to make existing daily/session boundaries easier to review.')
  } else if (normalizedWorkflow === 'ai-daily-study' && segmented) {
    reasonParts.push('Slightly broader chunks give the AI more context when turning the book into daily studies.')
  }

  return {
    pageCount,
    mode,
    recommendedSegmentSize,
    estimatedSegments,
    reason: reasonParts.join(' '),
  }
}

function createStudyImportJob(kind: StudyImportJobKind, label: string): StudyImportJob {
  const job: StudyImportJob = {
    id: `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    label,
    status: 'running',
    progress: 0,
    message: 'Queued…',
    stdout: '',
    stderr: '',
    startedAt: new Date().toISOString(),
  }
  studyImportJobs.set(job.id, job)
  return job
}

function updateStudyImportJob(job: StudyImportJob, patch: Partial<StudyImportJob>) {
  Object.assign(job, patch)
  studyImportJobs.set(job.id, job)
}

function parseOcrProgress(job: StudyImportJob, text: string) {
  if (text.includes('Slicing pages')) {
    updateStudyImportJob(job, { progress: 0.15, message: 'Slicing selected pages…' })
  }
  if (text.includes('OCRing PDF')) {
    updateStudyImportJob(job, { progress: 0.55, message: 'Running OCR on the PDF…' })
  }
  if (text.includes('Extracting text')) {
    updateStudyImportJob(job, { progress: 0.85, message: 'Extracting searchable text…' })
  }
  if (text.includes('Done.')) {
    updateStudyImportJob(job, { progress: 0.98, message: 'Finalizing OCR files…' })
  }
}

function parseSegmentedProgress(job: StudyImportJob, text: string) {
  const matches = Array.from(text.matchAll(/OCR segment (\d+)\/(\d+): pages ([\d-]+)/g))
  if (matches.length > 0) {
    const last = matches[matches.length - 1]
    const current = Number.parseInt(last[1], 10)
    const total = Number.parseInt(last[2], 10)
    const pageRange = last[3]
    const progress = total > 0 ? Math.min(0.96, current / total) : 0
    updateStudyImportJob(job, {
      progress,
      message: `OCR segment ${current} of ${total} (${pageRange})…`,
    })
  }
  if (text.includes('Done.')) {
    updateStudyImportJob(job, { progress: 0.98, message: 'Stitching the book text and manifest…' })
  }
}

function parseImportProgress(job: StudyImportJob, text: string) {
  if (text.trim()) {
    updateStudyImportJob(job, { progress: 0.7, message: 'Parsing and structuring imported source…' })
  }
}

function finalizeStudyImportResult(kind: StudyImportJobKind, stdout: string) {
  if (kind === 'segmented') {
    const fullTextMatch = stdout.match(/Full text:\s+(.+)/)
    const manifestMatch = stdout.match(/Manifest:\s+(.+)/)
    return {
      fullTextPath: fullTextMatch?.[1]?.trim() || null,
      manifestPath: manifestMatch?.[1]?.trim() || null,
    }
  }

  if (kind === 'ocr') {
    const ocrPdfMatch = stdout.match(/OCR PDF:\s+(.+)/)
    const textMatch = stdout.match(/Text:\s+(.+)/)
    const metaMatch = stdout.match(/Meta:\s+(.+)/)
    return {
      ocrPdfPath: ocrPdfMatch?.[1]?.trim() || null,
      textPath: textMatch?.[1]?.trim() || null,
      metaPath: metaMatch?.[1]?.trim() || null,
    }
  }

  if (kind === 'import') {
    const jsonMatch = stdout.match(/->\s+(.+)/)
    const generatedMatch = stdout.match(/Generated\s+(.+)/)
    return {
      sourceJsonPath: jsonMatch?.[1]?.trim() || null,
      generatedModulePath: generatedMatch?.[1]?.trim() || null,
    }
  }

  return {}
}

function runStudyImportJob(
  kind: StudyImportJobKind,
  label: string,
  command: string,
  args: string[],
  parser: (job: StudyImportJob, text: string) => void,
  onComplete?: (result: Record<string, unknown>) => Record<string, unknown> | void,
) {
  const job = createStudyImportJob(kind, label)
  const child = spawn(command, args, {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  child.stdout.on('data', (chunk) => {
    const text = String(chunk)
    job.stdout = appendOutput(job.stdout, text)
    parser(job, text)
  })

  child.stderr.on('data', (chunk) => {
    const text = String(chunk)
    job.stderr = appendOutput(job.stderr, text)
  })

  child.on('error', (error) => {
    updateStudyImportJob(job, {
      status: 'failed',
      progress: 1,
      message: 'Job failed to start.',
      error: error.message,
      finishedAt: new Date().toISOString(),
    })
  })

  child.on('close', (code) => {
    if (code === 0) {
      const finalizedResult = finalizeStudyImportResult(kind, job.stdout)
      const enrichedResult = onComplete?.(finalizedResult) || finalizedResult
      updateStudyImportJob(job, {
        status: 'completed',
        progress: 1,
        message: 'Done.',
        finishedAt: new Date().toISOString(),
        result: enrichedResult,
      })
    } else {
      updateStudyImportJob(job, {
        status: 'failed',
        progress: 1,
        message: 'Job failed.',
        error: job.stderr.trim() || `Process exited with code ${code}.`,
        finishedAt: new Date().toISOString(),
      })
    }
  })

  return job
}

async function listFilesRecursive(dir: string, prefix = ''): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name
    const absolutePath = resolve(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await listFilesRecursive(absolutePath, relativePath))
    } else {
      files.push(relativePath)
    }
  }

  return files.sort()
}

const BOOK_REFERENCE_PATTERN =
  /\b(?:[1-3]\s*)?(?:Genesis|Gen|Exodus|Ex|Leviticus|Lev|Numbers|Num|Deuteronomy|Deut|Joshua|Josh|Judges|Judg|Ruth|Samuel|Sam|Kings|Chronicles|Chron|Ezra|Nehemiah|Neh|Esther|Esth|Job|Psalm|Psalms|Ps|Proverbs|Prov|Ecclesiastes|Eccl|Isaiah|Isa|Jeremiah|Jer|Lamentations|Lam|Ezekiel|Ezek|Daniel|Dan|Hosea|Hos|Joel|Amos|Obadiah|Obad|Jonah|Micah|Nahum|Habakkuk|Hab|Zephaniah|Zeph|Haggai|Hag|Zechariah|Zech|Malachi|Mal|Matthew|Matt|Mark|Luke|John|Acts|Romans|Rom|Corinthians|Cor|Galatians|Gal|Ephesians|Eph|Philippians|Phil|Colossians|Col|Thessalonians|Thess|Timothy|Tim|Titus|Philemon|Phlm|Hebrews|Heb|James|Jas|Peter|Pet|Jude|Revelation|Rev)\.?\s+\d+\s*(?::\s*\d+)?(?:\s*[-–—]\s*\d+)?(?:\s*[-–—]\s*\d+)?/gi

const SUPPORTING_PASSAGES = [
  'John 15:1-11',
  'Romans 12:1-2',
  'Psalm 119:9-16',
  'Matthew 6:25-34',
  'James 1:22-25',
  'Galatians 5:16-25',
  'Luke 9:23-24',
  'Ephesians 2:8-10',
]

const GENERIC_STUDY_QUESTION_SETS = [
  [
    'What truth in today’s reading feels clearest and most weight-bearing?',
    'Where does this day’s material expose resistance, fear, or distraction in you?',
    'What response would make today’s reading visible in real life before bedtime?',
  ],
  [
    'What does this day reveal about God’s character, ways, or priorities?',
    'What sentence or idea from the reading deserves a second, slower pass?',
    'What act of obedience, confession, or trust is coming into focus?',
  ],
  [
    'What is the author trying to press into the reader today?',
    'Where does this reading connect with the Scripture references attached to the day?',
    'What would faithfulness look like if you took today’s reading seriously?',
  ],
]

function normalizeBookText(rawText: string) {
  return rawText
    .replace(/(\w)-\s*\r?\n\s*(\w)/g, '$1$2')
    .replace(/\f/g, '\n')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[ﬁ]/g, 'fi')
    .replace(/[ﬂ]/g, 'fl')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+$/gm, '')
    .replace(/\bD\s*a\s*y\b/gi, 'Day')
    .replace(/\bU\s*N\s*I\s*T\b/gi, 'Unit')
    .replace(/\bG\s*O\s*D\b/g, 'God')
    .replace(/\bG\s*o\s*d\b/g, 'God')
    .replace(/\bJesu s\b/gi, 'Jesus')
    .replace(/\bG o d'?s\b/gi, "God's")
    .replace(/\bGod'\s*Centered\b/gi, 'God-Centered')
    .replace(/\bGods\b/g, "God's")
    .replace(/K\s*o\s*i\s*n\s*o\s*n\s*i\s*a/gi, 'Koinonia')
    .replace(/\bContinuingto\b/gi, 'Continuing to')
    .replace(/\bLrod\b/gi, 'God')
    .replace(/\bChildrens\b/gi, "Children's")
    .replace(/^\s*(Page\s+\d+|Copyright\s+©.*|All rights reserved\.?)\s*$/gim, '')
}

function compactInline(value: string) {
  return value
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:?!])/g, '$1')
    .replace(/([("])\s+/g, '$1')
    .replace(/\s+([)")])/g, '$1')
    .trim()
}

function normalizeReference(reference: string) {
  return compactInline(reference)
    .replace(/\s*[-–—]\s*/g, '-')
    .replace(/\s*:\s*/g, ':')
    .replace(/\b([1-3])\s+/g, '$1 ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function getBookReferences(text: string) {
  const references = Array.from(text.matchAll(BOOK_REFERENCE_PATTERN))
    .map((match) => normalizeReference(match[0]))
    .filter((reference) => !/^Day\s+/i.test(reference))
  BOOK_REFERENCE_PATTERN.lastIndex = 0
  return Array.from(new Set(references))
}

function parseDayNumber(value: string | undefined) {
  if (!value) return null
  const normalized = value.trim().toLowerCase()
  if (/^\d+$/.test(normalized)) return Number.parseInt(normalized, 10)
  if (normalized === 'i' || normalized === 'l') return 1
  const romanMap: Record<string, number> = { ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7 }
  return romanMap[normalized] || null
}

function normalizeMarkerLine(line: string) {
  return compactInline(line)
    .replace(/\bD\s*a\s*y\b/gi, 'Day')
    .replace(/\bI\b/g, '1')
}

function findDailyMarkers(lines: string[]) {
  const markers: Array<{ lineIndex: number; sourceDay: number }> = []

  for (let index = 0; index < lines.length; index += 1) {
    const current = normalizeMarkerLine(lines[index])
    if (/^D$/i.test(current)) {
      for (let probe = index + 1; probe < Math.min(lines.length, index + 6); probe += 1) {
        const sourceDay = parseDayNumber(compactInline(lines[probe]).replace(/\bI\b/g, '1'))
        const hasAy = lines
          .slice(probe + 1, Math.min(lines.length, probe + 4))
          .some((line) => /^a\s*y$/i.test(compactInline(line)))
        if (sourceDay && hasAy) {
          markers.push({ lineIndex: index, sourceDay })
          break
        }
      }
    }

    const direct = current.match(/^Day\s+(\d+|i|l|ii|iii|iv|v|vi|vii)$/i)
    if (direct) {
      const sourceDay = parseDayNumber(direct[1])
      if (sourceDay) markers.push({ lineIndex: index, sourceDay })
      continue
    }

    if (/^Day\s+\D.{3,80}$/i.test(current) && !isNoisyTitleLine(removeInlineDayMarker(current))) {
      markers.push({ lineIndex: index, sourceDay: 1 })
      continue
    }

    const isStandaloneDay = /^Day$/i.test(current)
    const isTrailingDay = current.length < 70 && /\bDay$/i.test(current)
    if (isStandaloneDay || isTrailingDay) {
      for (let probe = index + 1; probe < Math.min(lines.length, index + 5); probe += 1) {
        const nextLine = compactInline(lines[probe]).replace(/\bI\b/g, '1')
        const trailingDayNumber = nextLine.match(/(\d+|i|l|ii|iii|iv|v|vi|vii)$/i)?.[1]
        const sourceDay = parseDayNumber(trailingDayNumber || nextLine)
        if (sourceDay) {
          markers.push({ lineIndex: index, sourceDay })
          break
        }
      }
      const nextTitleLine = lines
        .slice(index + 1, Math.min(lines.length, index + 5))
        .map(compactInline)
        .find(Boolean)
      if (isStandaloneDay && !markers.some((marker) => marker.lineIndex === index) && nextTitleLine && !isNoisyTitleLine(nextTitleLine)) {
        markers.push({ lineIndex: index, sourceDay: 1 })
      }
    }
  }

  return markers.filter((marker, index) => {
    const previous = markers[index - 1]
    return !previous || marker.lineIndex - previous.lineIndex > 18
  })
}

function isNoisyTitleLine(line: string) {
  if (!line || line.length < 5 || line.length > 90) return true
  if (/^\d+$/.test(line)) return true
  if (/^[-_•□*]+/.test(line)) return true
  if (/^(experiencing god|summary statements?|scripture memory|review today|what was|reword|source reading|unit\s+\d+)$/i.test(line)) return true
  if (/^(to know|as you follow|real christianity|the holy spirit|the scriptures|the goal is|today's source)/i.test(line)) return true
  if (getBookReferences(line).length > 0) return true
  if (/^[A-Z0-9\s'.,:;!?-]+$/.test(line) && line.split(/\s+/).length > 3) return true
  return false
}

function titleScore(line: string) {
  const words = line.split(/\s+/).filter(Boolean)
  const titleCase = words.filter((word) => /^[A-Z0-9][A-Za-z0-9'-]*/.test(word)).length
  let score = titleCase * 2
  if (words.length >= 3 && words.length <= 7) score += 5
  if (/[a-z]/.test(line)) score += 2
  if (/\b(God|Jesus|Christ|Spirit|Prayer|Faith|Life|Plans|Purpose|Centered|Obedience|Love)\b/i.test(line)) score += 2
  if (/[.!,;:]$/.test(line)) score -= 4
  return score
}

function cleanImportedTitle(line: string, fallback: string) {
  const cleaned = compactInline(line)
    .replace(/\bVERSE\s+TO\s+MEMORI[Zz!7]*\b/gi, '')
    .replace(/\bEXPERIENCING\s+GOD\b/gi, '')
    .replace(/\bD\s*a\s*y\b/gi, 'Day')
    .replace(/\bGod'\s*Centered\b/gi, 'God-Centered')
    .replace(/\bGod-\s*Centered\b/gi, 'God-Centered')
    .replace(/\bGods\b/g, "God's")
    .replace(/\bJesu s\b/gi, 'Jesus')
    .replace(/\bThrow:?gh\b/gi, 'Through')
    .replace(/\bIne\b/g, 'The')
    .replace(/\bite\b/g, 'The')
    .replace(/Part\]?\s*I\b/g, 'Part I')
    .replace(/K\s*o\s*i\s*n\s*o\s*n\s*i\s*a/gi, 'Koinonia')
    .replace(/\bContinuingto\b/gi, 'Continuing to')
    .replace(/\bLrod\b/gi, 'God')
    .replace(/\s+Day\s+\d+$/i, '')
    .replace(/\.$/, '')
    .trim()

  return cleaned || fallback
}

function looksLikeDayNumber(line: string) {
  return Boolean(parseDayNumber(line.replace(/\bI\b/g, '1')))
}

function removeInlineDayMarker(line: string) {
  const dayless = cleanImportedTitle(line, '')
    .replace(/\bDay\b\s*(\d+|i|l|ii|iii|iv|v|vi|vii)?\b/gi, '')
    .trim()
  return dayless.replace(/\s+\d+$/g, (match, offset, fullValue) => {
    const preceding = fullValue.slice(0, offset)
    return /\bPart\s*$/i.test(preceding) ? match : ''
  })
}

function inferTitleFromMarker(sectionLines: string[]) {
  const firstLines = sectionLines.slice(0, 8).map((line) => cleanImportedTitle(line, '')).filter(Boolean)
  if (firstLines.length === 0) return ''

  const first = firstLines[0]
  if (/^Day$/i.test(first)) {
    const fragments: string[] = []
    for (const line of firstLines.slice(1, 6)) {
      if (looksLikeDayNumber(line)) continue
      const cleaned = removeInlineDayMarker(line)
      if (fragments.length > 0 && (cleaned.length > 60 || /^[a-z]/.test(cleaned) || /[.?!]$/.test(cleaned))) break
      if (!cleaned || isNoisyTitleLine(cleaned)) break
      fragments.push(cleaned)
      if (fragments.join(' ').split(/\s+/).length >= 5) break
    }
    return compactInline(fragments.join(' '))
  }

  if (/\bDay\b/i.test(first)) {
    const fragments = [removeInlineDayMarker(first)]
    for (const line of firstLines.slice(1, 4)) {
      const cleaned = removeInlineDayMarker(line)
      if (fragments.length > 0 && (cleaned.length > 60 || /[.?!]$/.test(cleaned))) break
      if (!cleaned || looksLikeDayNumber(cleaned) || isNoisyTitleLine(cleaned)) break
      fragments.push(cleaned)
      if (fragments.length >= 2 || fragments.join(' ').split(/\s+/).length >= 5) break
    }
    return compactInline(fragments.join(' '))
  }

  return ''
}

function inferSectionTitle(sectionLines: string[], fallback: string) {
  const markerTitle = inferTitleFromMarker(sectionLines)
  if (markerTitle && !isNoisyTitleLine(markerTitle)) return markerTitle

  const candidates = sectionLines
    .slice(0, 70)
    .map((line) => cleanImportedTitle(line, ''))
    .filter((line) => !isNoisyTitleLine(line))
    .map((line) => ({ line, score: titleScore(line) }))
    .sort((left, right) => right.score - left.score)

  return candidates[0]?.line || fallback
}

function polishImportedDayTitle(title: string, sourceExcerpt: string) {
  let polished = cleanImportedTitle(title, title)
    .replace(/\bPart I\b/g, 'Part 1')
    .replace(/\bPart II\b/g, 'Part 2')

  if (polished === 'Learning to Be') polished = 'Learning to Be a Servant of God'
  if ((polished === 'Part I' || polished === 'Part 1') && /Koinonia with God/i.test(sourceExcerpt)) {
    polished = 'Essentials of Koinonia, Part 1'
  }
  if (/until his people could have the m/i.test(polished)) polished = 'Encounters with God Require Faith'
  if (/A L L T H E M O R E/i.test(polished)) polished = 'Experiencing God in Your Daily Life'
  if (/^Experiencing God Day$/i.test(polished) && /Marketplace/i.test(sourceExcerpt)) {
    polished = 'Experiencing God in the Marketplace'
  }

  return polished
}

function inferSectionPhase(lines: string[], markerLineIndex: number) {
  for (let index = markerLineIndex; index >= Math.max(0, markerLineIndex - 120); index -= 1) {
    const line = compactInline(lines[index]).replace(/\bU\s*N\s*I\s*T\b/gi, 'Unit')
    const unitMatch = line.match(/^Unit\s+([0-9IVXLCDM]+)$/i)
    if (unitMatch) return `Unit ${unitMatch[1].toUpperCase()}`
  }
  return 'Daily Sessions'
}

function excerptFromSection(sectionText: string, title: string) {
  const withoutTitle = sectionText.replace(title, ' ')
  return compactInline(withoutTitle)
    .replace(/\bDay\s+\d+\b/i, '')
    .slice(0, 620)
    .replace(/\s+\S*$/, '')
}

function splitOcrTextIntoPages(sourceText: string) {
  const rawPages = sourceText
    .split('\f')
    .map((page) => page.replace(/\r/g, ''))
    .filter((page) => page.trim().length > 0)

  let cursor = 0
  return rawPages.map((pageText, index) => {
    const normalizedLines = normalizeBookText(pageText)
      .split(/\r?\n/)
      .map(compactInline)
    const startLine = cursor
    const endLine = cursor + normalizedLines.length - 1
    cursor += normalizedLines.length
    return {
      pageNumber: index + 1,
      rawText: pageText,
      lines: normalizedLines,
      startLine,
      endLine,
    }
  })
}

function inferSliceLabel(pageNumber: number, startY: number, endY: number) {
  if (startY <= 4 && endY >= 96) return `Page ${pageNumber}`
  if (startY <= 10 && endY <= 60) return `Page ${pageNumber} · upper portion`
  if (startY >= 40 && endY >= 90) return `Page ${pageNumber} · lower portion`
  return `Page ${pageNumber} · focused slice`
}

function deriveSourcePageSlicesFromLineRange(
  pages: Array<{ pageNumber: number; startLine: number; endLine: number }>,
  startLine: number,
  endLine: number,
): OwnedBookPageSlice[] {
  const safeEndLine = Math.max(startLine, endLine)
  const slices: OwnedBookPageSlice[] = []

  for (const page of pages) {
    if (safeEndLine < page.startLine || startLine > page.endLine) continue
    const overlapStart = Math.max(startLine, page.startLine)
    const overlapEnd = Math.min(safeEndLine, page.endLine)
    const pageLineCount = Math.max(1, page.endLine - page.startLine + 1)
    const startY = Math.max(0, Math.min(100, Math.round(((overlapStart - page.startLine) / pageLineCount) * 100)))
    const endY = Math.max(startY, Math.min(100, Math.round(((overlapEnd - page.startLine + 1) / pageLineCount) * 100)))

    if (startY <= 2 && endY >= 98) {
      slices.push({ pageNumber: page.pageNumber })
      continue
    }

    slices.push({
      pageNumber: page.pageNumber,
      startY,
      endY,
      label: inferSliceLabel(page.pageNumber, startY, endY),
    })
  }

  return slices
}

function summarizeOcrQuality(record: LibraryBookRecord): OcrQualitySummary | null {
  const ocrTextPath = getManagedAssetPath(record, 'ocr-text')
  if (!ocrTextPath || !existsSync(ocrTextPath)) return null

  const sourceText = readFileSync(ocrTextPath, 'utf8')
  const pages = splitOcrTextIntoPages(sourceText)
  if (pages.length === 0) return null

  const charCounts = pages.map((page) => page.rawText.replace(/\s+/g, '').length)
  const averageCharsPerPage = Math.round(charCounts.reduce((sum, count) => sum + count, 0) / Math.max(1, charCounts.length))
  const sparsePageCount = charCounts.filter((count) => count < 350).length
  const verySparsePageCount = charCounts.filter((count) => count < 120).length

  let manifestPageCount: number | null = null
  const manifestPath = getManagedAssetPath(record, 'ocr-manifest')
  if (manifestPath && existsSync(manifestPath)) {
    try {
      const manifest = readJsonFile<{ page_count?: number; totalPages?: number }>(manifestPath)
      manifestPageCount = typeof manifest.page_count === 'number'
        ? manifest.page_count
        : typeof manifest.totalPages === 'number'
          ? manifest.totalPages
          : null
    } catch {
      manifestPageCount = null
    }
  }

  const warnings: string[] = []
  if (manifestPageCount && manifestPageCount !== pages.length) {
    warnings.push(`Manifest says ${manifestPageCount} pages, but OCR text contains ${pages.length} page breaks.`)
  }
  if (verySparsePageCount > 0) {
    warnings.push(`${verySparsePageCount} page${verySparsePageCount === 1 ? '' : 's'} look nearly empty after OCR.`)
  }
  if (sparsePageCount > Math.max(1, Math.floor(pages.length * 0.2))) {
    warnings.push(`A large share of pages look sparse, which can hurt day-boundary and workbook detection.`)
  }
  if (averageCharsPerPage < 320) {
    warnings.push('Average extracted text per page is low, so this OCR likely needs cleanup review.')
  }

  const confidence: OcrQualitySummary['confidence'] =
    warnings.length >= 2 || verySparsePageCount >= Math.max(1, Math.floor(pages.length * 0.15))
      ? 'low'
      : warnings.length === 1 || sparsePageCount > 0 || averageCharsPerPage < 700
        ? 'medium'
        : 'high'

  return {
    confidence,
    pageCount: pages.length,
    averageCharsPerPage,
    sparsePageCount,
    verySparsePageCount,
    manifestPageCount,
    warnings,
  }
}

function summarizePlanSourceDiagnostics(
  plan: OwnedBookDailyPlan,
  ocrQuality?: OcrQualitySummary | null,
): OwnedBookSourceDiagnostics {
  const days = plan.days || []
  const mappedDayCount = days.filter((day) => Boolean(day.sourceText && day.sourcePageStart && day.sourcePageEnd)).length
  const mappedSliceCount = days.reduce((total, day) => total + (day.sourcePageSlices?.length || 0), 0)
  const lowFidelityDayCount = days.filter((day) => day.sourceDiagnostics?.sourceHealth === 'low').length
  const mediumFidelityDayCount = days.filter((day) => day.sourceDiagnostics?.sourceHealth === 'medium').length
  const warnings: string[] = []

  if (plan.generationStrategy === 'paragraph-chunks') {
    warnings.push('This study path was generated from paragraph chunks, so source boundaries may need manual review.')
  }
  if (mappedDayCount < days.length) {
    warnings.push(`${days.length - mappedDayCount} generated day(s) are still missing complete source-page mapping.`)
  }
  if (ocrQuality?.confidence === 'low') {
    warnings.push('OCR confidence is low, so day boundaries and workbook cues may still need repair.')
  } else if (ocrQuality?.confidence === 'medium') {
    warnings.push('OCR confidence is moderate, so some sections may need spot-checking.')
  }
  if (lowFidelityDayCount > 0) {
    warnings.push(`${lowFidelityDayCount} generated day(s) still have low source fidelity and should be reviewed in the reader.`)
  } else if (mediumFidelityDayCount > 0) {
    warnings.push(`${mediumFidelityDayCount} generated day(s) have medium source fidelity and may benefit from a spot-check.`)
  }

  const sourceHealth: OwnedBookSourceDiagnostics['sourceHealth'] =
    warnings.length >= 2
      ? 'low'
      : warnings.length === 1
        ? 'medium'
        : 'high'

  return {
    sourceHealth,
    totalDays: days.length,
    mappedDayCount,
    mappedSliceCount,
    warningCount: warnings.length,
    warnings,
  }
}

function detectChecklistOptionCount(lines: string[]) {
  let count = 0
  for (const rawLine of lines) {
    const line = compactInline(rawLine)
    if (!line) continue
    if (/^(?:[a-z]\.|[0-9]+\.)\s+/i.test(line)) count += 1
    else if (/^(?:yes|no|true|false|other)\b/i.test(line)) count += 1
    else if (/^[□☐■•-]\s+/.test(line)) count += 1
  }
  return count
}

function inferSourceStructure(
  text: string,
  cueCount: number,
  questionCount: number,
  scriptureReferenceCount: number,
  checklistOptionCount: number,
): OwnedBookSourceStructure {
  const normalized = compactInline(text).toLowerCase()
  const devotionalSignals =
    Number(scriptureReferenceCount >= 2)
    + Number(/pray|prayer|obey|obedience|respond|application|worship|confess|surrender/i.test(text))
  const teachingSignals =
    Number(/truth|doctrine|teaches|means|therefore|because|understand|principle|lesson/i.test(text))
    + Number(questionCount <= 2 && checklistOptionCount <= 1)
  const narrativeSignals =
    Number(/story|journey|scene|encounter|walked|went|came|saw|heard|told/i.test(text))
    + Number(/ he | she | they | them | him /i.test(` ${normalized} `))

  if (cueCount >= 3 || (cueCount >= 1 && checklistOptionCount >= 2)) return 'workbook'
  if (questionCount >= 3 || checklistOptionCount >= 4) return 'question-driven'
  if (devotionalSignals >= 2 && teachingSignals >= 1) return 'mixed'
  if (devotionalSignals >= 2) return 'devotional'
  if (teachingSignals >= 2) return 'teaching'
  if (narrativeSignals >= 2) return 'narrative'
  if (questionCount >= 1 && scriptureReferenceCount >= 1) return 'mixed'
  return 'teaching'
}

function buildDaySourceDiagnostics(
  value: string,
  options?: {
    hasMappedPages?: boolean
    hasSlices?: boolean
    usedParagraphChunks?: boolean
  },
): OwnedBookDaySourceDiagnostics {
  const text = compactInline(value)
  const lines = value.split(/\r?\n/).map(compactInline).filter(Boolean)
  const cueCount = detectWorkbookResponseCues(lines).length
  const questionCount = Math.max(
    (text.match(/\?/g) || []).length,
    lines.filter((line) => /\?$/.test(line)).length,
  )
  const scriptureReferenceCount = getBookReferences(value).length
  const checklistOptionCount = detectChecklistOptionCount(lines)
  const warnings: string[] = []

  if (text.length < 120) warnings.push('This day has a thin source excerpt and may need manual review.')
  if (!options?.hasMappedPages) warnings.push('Chronicle could not fully map this day back to its source pages yet.')
  if (options?.hasMappedPages && !options?.hasSlices) warnings.push('This day is mapped to full pages but not to tighter source slices yet.')
  if (options?.usedParagraphChunks) warnings.push('This day was generated from paragraph chunks rather than detected source sections.')
  if (scriptureReferenceCount === 0) warnings.push('No explicit Scripture references were detected in this day’s source text.')

  const sourceHealth: OwnedBookDaySourceDiagnostics['sourceHealth'] =
    warnings.length >= 3
      ? 'low'
      : warnings.length >= 1
        ? 'medium'
        : 'high'

  return {
    sourceHealth,
    structure: inferSourceStructure(text, cueCount, questionCount, scriptureReferenceCount, checklistOptionCount),
    cueCount,
    questionCount,
    scriptureReferenceCount,
    checklistOptionCount,
    warnings,
  }
}

function getImportReadinessFailure(rawText: string, ocrQuality?: OcrQualitySummary | null) {
  const normalized = normalizeBookText(rawText).trim()
  const paragraphs = normalized.split(/\n{2,}/).map(compactInline).filter((entry) => entry.length > 40)
  if (normalized.length < 600 || paragraphs.length < 2) {
    return 'OCR output is too sparse to build a trustworthy study plan yet. Re-run OCR or repair the source before importing.'
  }
  if (ocrQuality?.verySparsePageCount && ocrQuality.pageCount > 0) {
    const sparseRatio = ocrQuality.verySparsePageCount / ocrQuality.pageCount
    if (sparseRatio >= 0.35) {
      return 'Too many pages came through nearly empty after OCR. Repair the OCR source before importing this book into Discipleship.'
    }
  }
  return null
}

type WorkbookResponseCueKind =
  | 'decision'
  | 'follow-up'
  | 'activity'
  | 'activity-generic'
  | 'checkbox'
  | 'yes-no'
  | 'annotation'
  | 'memory'
  | 'review-header'
  | 'review-meaningful'
  | 'review-prayer'
  | 'review-action'

interface WorkbookResponseCue {
  kind: WorkbookResponseCueKind
  label: string
  lineIndex: number
}

function detectWorkbookResponseCues(lines: string[]): WorkbookResponseCue[] {
  const cues: WorkbookResponseCue[] = []
  const patterns: Array<{ kind: WorkbookResponseCueKind; label: string; regex: RegExp }> = [
    { kind: 'decision', label: 'accept Jesus prompt', regex: /if you sense a need to accept jesus/i },
    { kind: 'follow-up', label: 'help / tell someone prompt', regex: /if you need help, call on your minister|tell someone the good news/i },
    { kind: 'activity', label: 'learning activities prompt', regex: /the learning activities are indicated by the symbol/i },
    { kind: 'activity-generic', label: 'written activity prompt', regex: /answer the following questions|complete the following|write the key words or phrases|on a separate sheet of paper|summarize all seven realities|read .*answer the following questions/i },
    { kind: 'checkbox', label: 'check your response prompt', regex: /check your response/i },
    { kind: 'yes-no', label: 'yes no response prompt', regex: /\byes\b.*\bno\b/i },
    { kind: 'annotation', label: 'underline instruction', regex: /underline where he was to go and what he was to do/i },
    { kind: 'memory', label: 'write memory verse prompt', regex: /write your memory verse/i },
    { kind: 'review-header', label: 'daily review header', regex: /review today’s lesson\. pray|review today's lesson\. pray/i },
    { kind: 'review-meaningful', label: 'most meaningful review prompt', regex: /what was the most meaningful stat(e)?ment or scripture you read today/i },
    { kind: 'review-prayer', label: 'prayer reword prompt', regex: /reword the statement or scripture into a prayer of response to god/i },
    { kind: 'review-action', label: 'response action prompt', regex: /what does god want you to do in response to today'?s study/i },
  ]

  lines.forEach((line, lineIndex) => {
    for (const pattern of patterns) {
      if (pattern.regex.test(line)) {
        cues.push({ kind: pattern.kind, label: pattern.label, lineIndex })
      }
    }
  })

  return cues
}

function pickAvailableWorkbookKey(
  overlays: OwnedBookWorkbookOverlay[],
  candidates: Array<OwnedBookWorkbookOverlay['key']>,
) {
  return candidates.find((candidate) => !overlays.some((overlay) => overlay.key === candidate)) || candidates[0]
}

function extractChecklistOptions(lines: string[], startIndex: number) {
  const options: string[] = []
  for (let index = startIndex + 1; index < Math.min(lines.length, startIndex + 20); index += 1) {
    const line = compactInline(lines[index])
    if (!line) continue
    if (/^(daily review|unit\s+\d+|week\s+\d+|day\s+\d+)\b/i.test(line)) break
    if (
      /^(?:[a-z]\.|[0-9]+\.)/i.test(line)
      || /^(?:yes|no|true|false|other)\b/i.test(line)
    ) {
      options.push(line)
      continue
    }
    if (options.length > 0 && line.length < 140 && !/[.?!]$/.test(line)) {
      options[options.length - 1] = `${options[options.length - 1]} ${line}`
      continue
    }
    if (options.length > 0) break
  }

  return options.slice(0, 6)
}

function cueYPosition(lineIndex: number, totalLines: number) {
  if (totalLines <= 0) return 16
  const ratio = lineIndex / Math.max(1, totalLines - 1)
  return Math.max(8, Math.min(82, Math.round(ratio * 86)))
}

function looksLikeSidebarNoise(line: string) {
  const cleaned = compactInline(line)
  if (!cleaned) return true
  if (/^\d+$/.test(cleaned)) return true
  if (/^page\s+\d+$/i.test(cleaned)) return true
  if (/^verse to memori/i.test(cleaned)) return true
  if (/^experiencing god$/i.test(cleaned)) return true
  if (/^masterlife/i.test(cleaned)) return true
  if (/^unit\s+[0-9ivxlcdm]+$/i.test(cleaned)) return true

  const lettersOnly = cleaned.replace(/[^A-Za-z]/g, '')
  if (lettersOnly.length >= 8) {
    const uppercaseRatio = lettersOnly.replace(/[^A-Z]/g, '').length / lettersOnly.length
    if (uppercaseRatio > 0.82 && cleaned.split(/\s+/).length <= 10) return true
  }

  return false
}

function cleanDailySourceText(sectionLines: string[], title: string) {
  const stopPatterns = [
    /review today’s lesson/i,
    /review today's lesson/i,
    /what was the most meaningful/i,
    /reword the statement/i,
    /into a prayer of response/i,
    /what does god want you to do/i,
    /respond to the following/i,
  ]

  const cleanedLines: string[] = []
  let seenTitle = false

  for (const line of sectionLines.map(compactInline)) {
    if (!line) continue
    if (!seenTitle && compactInline(line) === compactInline(title)) {
      seenTitle = true
      continue
    }
    if (stopPatterns.some((pattern) => pattern.test(line))) break
    if (looksLikeSidebarNoise(line)) continue
    cleanedLines.push(line)
  }

  return cleanedLines
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function firstSentence(value: string) {
  const cleaned = compactInline(value)
  const match = cleaned.match(/(.+?[.?!])(?:\s|$)/)
  return match?.[1]?.trim() || cleaned
}

function firstMeaningfulParagraph(value: string) {
  const paragraphs = value
    .split(/\n{2,}/)
    .map((paragraph) => compactInline(paragraph))
    .filter((paragraph) => paragraph.length > 60)
  return paragraphs[0] || compactInline(value).slice(0, 360)
}

function supportingPassagesForDay(day: OwnedBookPlanDay) {
  const sourceReferences = [
    ...getBookReferences(day.sourceText || ''),
    ...getBookReferences(day.sourceExcerpt || ''),
    ...getBookReferences(day.dailyReading || ''),
  ]
  const base = [day.scripture, day.dailyReading, ...sourceReferences]
    .map((entry) => compactInline(entry || ''))
    .filter(Boolean)
  return Array.from(new Set(base)).slice(0, 3)
}

function studyQuestionSetForDay(day: OwnedBookPlanDay) {
  const index = ((day.day || 1) - 1) % GENERIC_STUDY_QUESTION_SETS.length
  return GENERIC_STUDY_QUESTION_SETS[index]
}

function readingSummaryForDay(day: OwnedBookPlanDay) {
  const excerpt = firstMeaningfulParagraph(day.sourceText || day.sourceExcerpt || day.focus || day.title)
  return excerpt.length > 320 ? `${excerpt.slice(0, 317)}...` : excerpt
}

function buildDynamicStudyLayout(day: OwnedBookPlanDay, bookTitle: string, workflow: 'preserve-daily' | 'ai-daily-study') : OwnedBookStudyLayout {
  const supportingPassages = supportingPassagesForDay(day)
  const primaryPassage = supportingPassages[0] || day.scripture || 'Read today’s assigned Scripture'
  const readingSummary = readingSummaryForDay(day)
  const sourceLabel = day.sourceSection || day.title
  const structure = day.sourceDiagnostics?.structure || 'teaching'
  const prayerFocus = workflow === 'preserve-daily'
    ? `Ask God to make today’s source lesson in ${bookTitle} concrete, honest, and fruitful.`
    : 'Ask God to turn today’s reading into understanding, prayer, and obedience.'
  const practiceFocus = workflow === 'preserve-daily'
    ? `Finish today’s assignment for “${sourceLabel}” and name one visible act of obedience it calls for.`
    : 'Translate today’s reading into one specific action, conversation, or habit.'
  const quote = firstSentence(day.sourceText || day.sourceExcerpt || '')
  const questionSet = studyQuestionSetForDay(day)
  const questionTitle =
    structure === 'workbook'
      ? 'Workbook Questions'
      : structure === 'question-driven'
        ? 'Guided Questions'
        : structure === 'narrative'
          ? 'Story Questions'
          : 'Study Questions'
  const journalItems =
    structure === 'workbook'
      ? [
          `Complete the written response “${sourceLabel}” is asking from you.`,
          'Name the one response you need to carry into the rest of today.',
          'Record anything you still need to revisit in workbook mode.',
        ]
      : structure === 'narrative'
        ? [
            `Retell the movement of “${sourceLabel}” in your own words.`,
            'Name the moment in the story that most exposed your heart.',
            'Write one sentence you need to remember tomorrow.',
          ]
        : [
            `Write the main burden of “${sourceLabel}” in your own words.`,
            'Record one sentence you need to remember tomorrow.',
            'Name one place this truth is meeting your actual life today.',
          ]
  const practiceItems =
    structure === 'question-driven' || structure === 'workbook'
      ? [
          'Complete the concrete response the source is calling for.',
          'Decide when you will follow through.',
          'Capture the result in Chronicle after you do it.',
        ]
      : [
          'Choose one concrete action.',
          'Decide when it will happen.',
          'Capture the result in Chronicle after you do it.',
        ]

  const blocks: OwnedBookStudyBlock[] = [
    {
      id: `overview-${day.day}`,
      type: 'overview',
      title: 'Today’s Aim',
      body: day.focus,
      emphasis: day.phase || 'Daily Study',
      span: 'full',
    },
    {
      id: `scripture-${day.day}`,
      type: 'scripture',
      title: 'Bible Reading',
      body: `Read ${primaryPassage}${supportingPassages.length > 1 ? `, then trace how it supports today’s section.` : '.'}`,
      items: supportingPassages.slice(1),
      reference: primaryPassage,
      span: 'half',
    },
    {
      id: `reading-${day.day}`,
      type: 'reading',
      title: workflow === 'preserve-daily' ? 'Source Reading' : 'Today’s Portion',
      body: readingSummary,
      reference: sourceLabel,
      span: 'half',
    },
    {
      id: `questions-${day.day}`,
      type: 'questions',
      title: questionTitle,
      items: questionSet,
      span: 'full',
    },
    {
      id: `journal-${day.day}`,
      type: 'journal',
      title: 'Journal & Reflection',
      items: journalItems,
      span: 'half',
    },
    {
      id: `prayer-${day.day}`,
      type: 'prayer',
      title: 'Prayer Response',
      body: prayerFocus,
      items: [
        'Adoration: praise God for what this day reveals about Him.',
        'Confession: name resistance, distraction, or neglect honestly.',
        'Supplication: ask for strength to live this out before the day ends.',
      ],
      span: 'half',
    },
    {
      id: `practice-${day.day}`,
      type: 'practice',
      title: 'Obedience Step',
      body: practiceFocus,
      items: practiceItems,
      span: 'full',
    },
  ]

  if (quote && quote.length >= 40) {
    blocks.splice(3, 0, {
      id: `quote-${day.day}`,
      type: 'quote',
      title: 'Carry This Line',
      body: quote,
      span: 'full',
    })
  }

  return {
    title: day.title,
    summary: readingSummary,
    supportingPassages,
    prayerFocus,
    practiceFocus,
    blocks,
  }
}

function textareaOverlay(
  key: OwnedBookWorkbookOverlay['key'],
  label: string,
  prompt: string,
  placeholder: string,
  pageNumber: number,
  x: number,
  y: number,
  width: number,
  minHeight: number,
): OwnedBookWorkbookOverlay {
  return { key, label, prompt, placeholder, pageNumber, x, y, width, minHeight, kind: 'textarea' }
}

function checkboxOverlay(
  key: OwnedBookWorkbookOverlay['key'],
  label: string,
  prompt: string,
  pageNumber: number,
  x: number,
  y: number,
  width: number,
  minHeight: number,
  options: string[],
): OwnedBookWorkbookOverlay {
  return { key, label, prompt, placeholder: '', pageNumber, x, y, width, minHeight, kind: 'checkbox-group', options }
}

function dailyReviewOverlays(pageNumber: number): OwnedBookWorkbookOverlay[] {
  return [
    textareaOverlay(
      'dailyReviewMeaningful',
      'Most Meaningful Truth',
      'What was the most meaningful statement or Scripture you read today?',
      'Name the statement or Scripture that stayed with you most.',
      pageNumber,
      3,
      73,
      28,
      104,
    ),
    textareaOverlay(
      'dailyReviewPrayer',
      'Prayer of Response',
      'Reword the statement or Scripture into a prayer of response to God.',
      'Turn today’s truth into a prayer.',
      pageNumber,
      36,
      73,
      28,
      104,
    ),
    textareaOverlay(
      'dailyReviewAction',
      'What Will You Do?',
      'What does God want you to do in response to today’s study?',
      'Name the response or action God is calling for today.',
      pageNumber,
      68,
      73,
      28,
      104,
    ),
  ]
}

function buildExperiencingGodWorkbookOverlays(day: OwnedBookPlanDay): OwnedBookWorkbookOverlay[] {
  switch (day.day) {
    case 1:
      return [
        checkboxOverlay(
          'highlight',
          '1. Accept Jesus',
          'Check the Scriptures you have read as you settle this matter with God.',
          4,
          28,
          64,
          44,
          170,
          ['Romans 3:23', 'Romans 6:23', 'Romans 5:8', 'Romans 10:9-10', 'Romans 10:13'],
        ),
        textareaOverlay('underline', '2. Ask for Help', 'Capture who you should contact or what follow-up you need here.', 'Who will you tell or ask for help?', 4, 28, 90, 44, 110),
        textareaOverlay('notes', '3. Learning Activities', 'Write your response to the workbook instruction here.', 'Use this space for your written response to the learning activity.', 6, 27, 41, 47, 140),
        checkboxOverlay(
          'stillness',
          '4. Which Request Sounds Like You?',
          'Check the response that most closely matches how you generally ask the Lord.',
          7,
          8,
          10,
          64,
          145,
          [
            'a. Lord, what do You want me to do? When? How? Where? With whom? And what outcome?',
            'b. Lord, as You go with me, tell me what to do one step at a time. I will do it.',
          ],
        ),
        checkboxOverlay(
          'story',
          '5. One Day at a Time',
          'Check the response that fits your conviction here.',
          7,
          8,
          53,
          64,
          175,
          [
            'No, Jesus does not guide people specifically.',
            'No, by seeking to follow Jesus, I could end up going the wrong way.',
            'It is wiser to wait until God tells me all the details before I begin.',
            'Yes, if I follow Jesus one day at a time, I will be right in the center of God’s will.',
          ],
        ),
        textareaOverlay('abramObservation', '6. Abram’s Call', 'Mark what Abram was told to do and capture what stands out from Genesis 12:1-5.', 'What did God ask Abram to do, and what do you notice here?', 8, 8, 8, 64, 118),
        checkboxOverlay(
          'faithResponseChoice',
          '7. Follow by Faith',
          'Check the response that best reflects where you are right now.',
          8,
          8,
          48,
          64,
          124,
          [
            'No, I don’t think God will ask me to go anywhere without showing me ahead of time where I am going.',
            'I’m not sure.',
            'Yes, I am willing to follow Him by faith and not by sight.',
            'Other',
          ],
        ),
        textareaOverlay('memoryVerseWrite', '8. Memory Verse', 'Write your memory verse for this unit and begin practicing it.', 'Write John 15:5 here in your preferred translation.', 9, 8, 30, 64, 88),
        ...dailyReviewOverlays(9),
      ]
    case 2:
      return [
        checkboxOverlay(
          'highlight',
          '1. True or False',
          'Mark the following statements T (true) or F (false).',
          10,
          4,
          60,
          58,
          112,
          [
            'a. I can trust my experiences as an effective way to know and follow God.',
            'b. I should always evaluate my experiences based on the truths I find in God’s Word.',
            'c. I may get a distorted understanding of God if I do not check my experiences against the truths of Scripture.',
            'd. I can trust God to work in my life similarly to ways I see Him working throughout the Scriptures.',
          ],
        ),
        textareaOverlay('underline', '2. Follow Me', 'Write what Jesus told these people to do in each Scripture.', 'Capture what Jesus told these people to do.', 11, 4, 24, 56, 118),
        textareaOverlay('notes', '3. John 5 Questions', 'Answer the questions from John 5:17, 19-20.', 'Work through the questions about how Jesus knew and did the Father’s will.', 11, 4, 63, 58, 126),
        textareaOverlay('stillness', '4. Personalize Reality 1', 'Personalize the first statement and write it below.', 'Rewrite the first reality using “me” instead of “you.”', 12, 4, 54, 52, 96),
        ...dailyReviewOverlays(12),
      ]
    case 3:
      return [
        checkboxOverlay(
          'highlight',
          '1. Should You Be God’s Servant?',
          'Based on these Scriptures and others you may know, check your response.',
          13,
          4,
          34,
          44,
          70,
          ['Yes', 'No'],
        ),
        checkboxOverlay(
          'underline',
          '2. Frustrated in Service?',
          'Have you ever given your best effort to serve God and felt frustrated when nothing lasting resulted?',
          13,
          52,
          34,
          40,
          70,
          ['Yes', 'No'],
        ),
        textareaOverlay('notes', '3. What Is a Servant?', 'Define servant in your own words.', 'Describe what a servant of God is in your own words.', 13, 4, 52, 58, 94),
        textareaOverlay(
          'scriptureTruth',
          '4. Servant Questions',
          'Answer the questions about what a servant can do and what God must do through a servant.',
          'Work through the servant questions from this page.',
          14,
          4,
          14,
          58,
          112,
        ),
        textareaOverlay(
          'truthForMe',
          '5. Elijah Questions',
          'Answer the Elijah questions and capture what this passage shows about God working through His servant.',
          'Work through the Elijah questions from this page.',
          14,
          4,
          58,
          58,
          142,
        ),
        textareaOverlay(
          'examination',
          '6. Service Reflection',
          'Respond to the reflection questions about service, church life, and what only God can do.',
          'Use this space for the service reflection questions.',
          15,
          4,
          20,
          58,
          132,
        ),
        textareaOverlay(
          'prayerResponse',
          '7. Personalize Reality 7',
          'Write the seventh reality in first person and respond to God about it.',
          'Personalize the final reality and turn it into a prayer.',
          15,
          4,
          68,
          58,
          100,
        ),
        ...dailyReviewOverlays(16),
      ]
    case 4:
      return [
        textareaOverlay(
          'notes',
          '1. Seven Realities Activity',
          'Capture the key words, questions, or summary work from the seven realities exercise.',
          'Record your key words, questions, or summary from this page.',
          18,
          6,
          12,
          58,
          120,
        ),
        ...dailyReviewOverlays(23),
      ]
    case 5:
      return [
        textareaOverlay(
          'notes',
          '1. Looking to God',
          'Capture what stands out from the college-campus Bible study example and how it connects to today’s theme.',
          'What is God showing you through this story?',
          25,
          6,
          18,
          58,
          120,
        ),
        textareaOverlay(
          'scriptureTruth',
          '2. Define the Terms',
          'Write your own definitions for self-centered and God-centered.',
          'Define self-centered and God-centered in your own words.',
          26,
          6,
          38,
          58,
          118,
        ),
        textareaOverlay(
          'truthForMe',
          '3. Biblical Examples',
          'Work through the examples and mark which ones show God-centeredness or self-centeredness.',
          'Respond to the biblical examples on this page.',
          27,
          6,
          18,
          58,
          120,
        ),
        textareaOverlay(
          'examination',
          '4. God’s Purposes, Not Our Plans',
          'Answer the questions about what God was about to do when He came to Noah, Abraham, Gideon, and Saul.',
          'Work through the “God’s purposes” questions here.',
          27,
          6,
          62,
          58,
          132,
        ),
      ]
    default:
      return []
  }
}

function buildWorkbookOverlays(
  day: OwnedBookPlanDay,
  bookTitle: string,
  workflow: 'preserve-daily' | 'ai-daily-study',
): OwnedBookWorkbookOverlay[] {
  if (workflow !== 'preserve-daily') return []
  if (/experiencing god/i.test(bookTitle)) return buildExperiencingGodWorkbookOverlays(day)
  return []
}

function augmentWorkbookOverlaysFromOcr(
  day: OwnedBookPlanDay,
  overlays: OwnedBookWorkbookOverlay[],
  pages: Array<{ pageNumber: number; rawText: string; lines: string[] }>,
) {
  if (!day.sourcePageStart || !day.sourcePageEnd) return overlays

  const next = [...overlays]
  const hasKeyOnPage = (key: string, pageNumber: number) =>
    next.some((overlay) => overlay.key === key && overlay.pageNumber === pageNumber)
  const hasAnyOverlayOnPage = (pageNumber: number) =>
    next.some((overlay) => overlay.pageNumber === pageNumber)

  for (const page of pages) {
    if (page.pageNumber < day.sourcePageStart || page.pageNumber > day.sourcePageEnd) continue
    const cues = detectWorkbookResponseCues(page.lines)
    if (cues.length === 0) continue

    const lineCount = page.lines.length || 1
    const genericCues = cues.filter((cue) => !cue.kind.startsWith('review-'))
    for (const cue of genericCues) {
      const y = cueYPosition(cue.lineIndex, lineCount)
      if (cue.kind === 'memory' && !hasKeyOnPage('memoryVerseWrite', page.pageNumber)) {
        next.push(
          textareaOverlay(
            'memoryVerseWrite',
            'Memory Verse',
            'Write the memory verse from this page here.',
            'Write the memory verse in your preferred translation.',
            page.pageNumber,
            6,
            y,
            58,
            96,
          ),
        )
      } else if ((cue.kind === 'annotation' || cue.kind === 'activity' || cue.kind === 'activity-generic' || cue.kind === 'follow-up') && !hasAnyOverlayOnPage(page.pageNumber)) {
        const key = pickAvailableWorkbookKey(next, ['notes', 'underline', 'stillness', 'story', 'scriptureTruth'])
        next.push(
          textareaOverlay(
            key,
            cue.kind === 'follow-up' ? 'Follow Up' : cue.kind === 'annotation' ? 'Underline & Observe' : 'Learning Activity',
            cue.kind === 'follow-up'
              ? 'Capture the specific follow-up or person to contact from this page.'
              : cue.kind === 'annotation'
                ? 'Record the words, phrases, or observations this page asked you to mark.'
                : 'Use this space for the written response this page is asking for.',
            cue.kind === 'follow-up'
              ? 'Who do you need to contact or what follow-up step do you need?'
              : cue.kind === 'annotation'
                ? 'What did you underline or observe here?'
                : 'Write your response for this workbook activity.',
            page.pageNumber,
            6,
            y,
            58,
            104,
          ),
        )
      } else if ((cue.kind === 'checkbox' || cue.kind === 'decision' || cue.kind === 'yes-no') && !hasAnyOverlayOnPage(page.pageNumber)) {
        const key = pickAvailableWorkbookKey(next, ['highlight', 'stillness', 'story', 'scriptureTruth', 'truthForMe'])
        const options = extractChecklistOptions(page.lines, cue.lineIndex)
        if (options.length >= 2 || cue.kind === 'yes-no') {
          next.push(
            checkboxOverlay(
              key,
              cue.kind === 'decision' ? 'Response Check' : cue.kind === 'yes-no' ? 'Yes / No Response' : 'Check Your Response',
              'Select the response that matches this workbook page.',
              page.pageNumber,
              6,
              y,
              58,
              Math.max(90, Math.min(180, 26 + (cue.kind === 'yes-no' ? 2 : options.length) * 24)),
              cue.kind === 'yes-no' ? ['Yes', 'No'] : options,
            ),
          )
        } else {
          next.push(
            textareaOverlay(
              'notes',
              cue.kind === 'decision' ? 'Faith Response' : 'Response Check',
              'Capture your response to this page here.',
              'Write the response this page is asking you to make.',
              page.pageNumber,
              6,
              y,
              58,
              92,
            ),
          )
        }
      }
    }

    const hasReviewCue = cues.some((cue) => cue.kind.startsWith('review-'))
    if (hasReviewCue && !hasKeyOnPage('dailyReviewMeaningful', page.pageNumber)) {
      next.push(...dailyReviewOverlays(page.pageNumber))
    }
  }

  return next
}

function attachDynamicStudyLayouts(
  plan: OwnedBookDailyPlan,
  bookTitle: string,
  workflow: 'preserve-daily' | 'ai-daily-study',
  sourceText?: string,
): OwnedBookDailyPlan {
  if (!plan.days?.length) return plan
  const ocrPages = sourceText ? splitOcrTextIntoPages(sourceText) : []
  const days = plan.days.map((day) => ({
    ...day,
    studyLayout: buildDynamicStudyLayout(day, bookTitle, workflow),
    workbookOverlays: augmentWorkbookOverlaysFromOcr(
      day,
      buildWorkbookOverlays(day, bookTitle, workflow),
      ocrPages,
    ),
  }))

  return {
    ...plan,
    sourceDiagnostics: summarizePlanSourceDiagnostics({ ...plan, days }),
    days,
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getManualDaySourceOverride(bookTitle: string, dayNumber: number) {
  const overrides = MANUAL_DAY_SOURCE_OVERRIDES[bookTitle.trim().toLowerCase()]
  return overrides?.[dayNumber] || null
}

function buildDailyStudyDays(text: string): OwnedBookPlanDay[] {
  const lines = normalizeBookText(text).split(/\r?\n/)
  const markers = findDailyMarkers(lines)
  if (markers.length < 5) return []

  return markers.map((marker, index) => {
    const nextMarker = markers[index + 1]
    const sectionLines = lines.slice(marker.lineIndex, nextMarker?.lineIndex || lines.length).map(compactInline).filter(Boolean)
    const sectionText = sectionLines.join('\n')
    const references = getBookReferences(sectionText)
    const inferredTitle = inferSectionTitle(sectionLines, `Daily Study ${index + 1}`)
    const scripture = references.slice(0, 2).join('; ') || SUPPORTING_PASSAGES[index % SUPPORTING_PASSAGES.length]
    const phase = inferSectionPhase(lines, marker.lineIndex)
    const sourceExcerpt = excerptFromSection(sectionText, inferredTitle)
    const title = polishImportedDayTitle(inferredTitle, sourceExcerpt)

    return {
      sourceDiagnostics: buildDaySourceDiagnostics(sectionText, {
        hasMappedPages: false,
        hasSlices: false,
      }),
      day: index + 1,
      week: Math.ceil((index + 1) / 5),
      title,
      scripture,
      dailyReading: scripture,
      focus: `Move through the source one day at a time, pairing “${title}” with ${scripture}.`,
      phase,
      sourceSection: title,
      sourceExcerpt,
    }
  })
}

function isLikelyGeneratedSectionHeading(line: string) {
  const cleaned = cleanImportedTitle(line, '')
  if (!cleaned || isNoisyTitleLine(cleaned)) return false
  if (cleaned.length < 8 || cleaned.length > 72) return false
  if (/[.?!:]$/.test(cleaned)) return false
  const words = cleaned.split(/\s+/).filter(Boolean)
  if (words.length < 2 || words.length > 8) return false
  if (getBookReferences(cleaned).length > 0) return false
  return titleScore(cleaned) >= 9
}

function extractGeneratedSections(text: string) {
  const lines = normalizeBookText(text)
    .replace(/\f/g, '\n')
    .split(/\r?\n/)

  const sections: Array<{ title: string; text: string }> = []
  let activeTitle = ''
  let activeLines: string[] = []

  const pushSection = () => {
    if (!activeTitle) return
    const body = activeLines.map(compactInline).filter(Boolean).join('\n')
    if (compactInline(body).length >= 140) {
      sections.push({ title: activeTitle, text: body })
    }
  }

  for (const rawLine of lines) {
    const cleaned = compactInline(rawLine)
    if (!cleaned) {
      if (activeTitle && activeLines.length > 0) activeLines.push('')
      continue
    }

    if (isLikelyGeneratedSectionHeading(cleaned)) {
      pushSection()
      activeTitle = cleanImportedTitle(cleaned, cleaned)
      activeLines = []
      continue
    }

    if (activeTitle) activeLines.push(cleaned)
  }

  pushSection()

  return sections
}

function mergeGeneratedSections(sections: Array<{ title: string; text: string }>, totalDays: number) {
  const targetCount = Math.max(1, Math.min(totalDays, sections.length))
  const chunkSize = Math.max(1, Math.ceil(sections.length / targetCount))
  const merged: Array<{ title: string; text: string }> = []

  for (let index = 0; index < sections.length; index += chunkSize) {
    const chunk = sections.slice(index, index + chunkSize)
    const primaryTitle = chunk[0]?.title || `Daily Reading ${merged.length + 1}`
    merged.push({
      title: primaryTitle,
      text: chunk.map((entry) => `${entry.title}\n${entry.text}`).join('\n\n'),
    })
  }

  return merged
}

function buildChunkedStudyDays(text: string, totalDays = 30) {
  const normalized = normalizeBookText(text)
  const generatedSections = extractGeneratedSections(text)
  if (generatedSections.length >= 5) {
    const mergedSections = mergeGeneratedSections(generatedSections, totalDays)
    const days = mergedSections.map((section, index) => {
      const references = getBookReferences(section.text)
      const scripture = references[0] || SUPPORTING_PASSAGES[index % SUPPORTING_PASSAGES.length]
      const title = cleanImportedTitle(section.title, `Daily Reading ${index + 1}`)
      return {
        sourceDiagnostics: buildDaySourceDiagnostics(section.text, {
          hasMappedPages: false,
          hasSlices: false,
          usedParagraphChunks: false,
        }),
        day: index + 1,
        week: Math.ceil((index + 1) / 7),
        title,
        scripture,
        dailyReading: scripture,
        focus: `Read this section of the source and pair its main burden with ${scripture}.`,
        phase: 'Generated from Source Sections',
        sourceSection: title,
        sourceExcerpt: excerptFromSection(section.text, title),
      }
    })

    return {
      days,
      strategy: 'source-sections' as const,
      sectionCount: generatedSections.length,
    }
  }

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((paragraph) => compactInline(paragraph))
    .filter((paragraph) => paragraph.length > 120)

  const chunkSize = Math.max(1, Math.ceil(paragraphs.length / totalDays))
  const days: OwnedBookPlanDay[] = []

  for (let index = 0; index < totalDays && index * chunkSize < paragraphs.length; index += 1) {
    const chunk = paragraphs.slice(index * chunkSize, (index + 1) * chunkSize).join('\n\n')
    const references = getBookReferences(chunk)
    const scripture = references[0] || SUPPORTING_PASSAGES[index % SUPPORTING_PASSAGES.length]
    const title = inferSectionTitle(chunk.split(/\n/), `Daily Reading ${index + 1}`)

    days.push({
      sourceDiagnostics: buildDaySourceDiagnostics(chunk, {
        hasMappedPages: false,
        hasSlices: false,
        usedParagraphChunks: true,
      }),
      day: index + 1,
      week: Math.ceil((index + 1) / 7),
      title,
      scripture,
      dailyReading: scripture,
      focus: `Read this portion of the source and pair its main burden with ${scripture}.`,
      phase: 'Generated Daily Study',
      sourceSection: title,
      sourceExcerpt: excerptFromSection(chunk, title),
    })
  }

  return {
    days,
    strategy: 'paragraph-chunks' as const,
    sectionCount: 0,
  }
}

function detectSourceCadence(rawText: string) {
  const lines = normalizeBookText(rawText).split(/\r?\n/)
  const dayMarkers = findDailyMarkers(lines)
  const dailyReviewCount = lines.filter((line) => /Daily Review/i.test(compactInline(line))).length
  const weekCount = lines.filter((line) => /^Week\s+\d+/i.test(compactInline(line))).length
  const unitCount = lines.filter((line) => /^Unit\s+[0-9IVXLCDM]+$/i.test(compactInline(line).replace(/\bU\s*N\s*I\s*T\b/gi, 'Unit'))).length

  if (dayMarkers.length >= 5) {
    return {
      strategy: 'explicit-day-markers',
      preserveDaily: true,
      daysPerWeek: weekCount > 0 ? 5 : 5,
      reason: `Detected ${dayMarkers.length} explicit day markers in the source.`,
      dayMarkerCount: dayMarkers.length,
      dailyReviewCount,
      weekCount,
      unitCount,
    } as const
  }

  if (dailyReviewCount >= 5) {
    return {
      strategy: 'review-cycle',
      preserveDaily: true,
      daysPerWeek: 5,
      reason: `Detected ${dailyReviewCount} recurring daily review markers in the source.`,
      dayMarkerCount: dayMarkers.length,
      dailyReviewCount,
      weekCount,
      unitCount,
    } as const
  }

  return {
    strategy: 'generated',
    preserveDaily: false,
    daysPerWeek: 7,
    reason: 'No stable built-in daily cadence was detected, so Chronicle should generate one.',
    dayMarkerCount: dayMarkers.length,
    dailyReviewCount,
    weekCount,
    unitCount,
  } as const
}

function buildOwnedBookDailyPlan(title: string, rawText: string, workflow: 'preserve-daily' | 'ai-daily-study' | 'auto-detect') {
  const cadence = detectSourceCadence(rawText)
  const dailyDays = buildDailyStudyDays(rawText)
  const generatedStudy = buildChunkedStudyDays(rawText)
  const normalizedBookId = slugifyFileStem(title)
  const preserveDaily =
    workflow === 'preserve-daily'
    || (workflow === 'auto-detect' && (cadence.preserveDaily || dailyDays.length >= 10))
  const days = (preserveDaily ? dailyDays : generatedStudy.days).map((day) => normalizeOwnedBookDay(normalizedBookId, day))
  const phases = Array.from(new Set(days.map((day) => day.phase || 'Daily Sessions')))
    .slice(0, 12)
    .map((label) => ({
      label,
      emphasis: preserveDaily ? 'Preserve and complete the source day in order.' : 'Read, study, respond, and practice one portion of the source.',
    }))

  const classification: 'daily-study' | 'general-book' = preserveDaily ? 'daily-study' : 'general-book'
  const recommendedWorkflow: 'preserve-daily' | 'ai-daily-study' = preserveDaily ? 'preserve-daily' : 'ai-daily-study'
  const generatedPlan: OwnedBookDailyPlan = {
    title: preserveDaily ? `${title} Daily Journey` : `${title} Daily Study`,
    totalDays: days.length || 1,
    daysPerWeek: preserveDaily ? cadence.daysPerWeek : 7,
    cadence: preserveDaily
      ? cadence.strategy === 'explicit-day-markers'
        ? 'Daily · explicit source day cadence'
        : 'Daily · source review cadence'
      : 'Daily',
    summary: preserveDaily
      ? `Chronicle detected an existing day-by-day cadence in the source and preserved it as a one-day-at-a-time discipleship path. ${cadence.reason}`
      : generatedStudy.strategy === 'source-sections'
        ? `Chronicle reshaped the source into a daily Bible-study path by following ${generatedStudy.sectionCount} source sections, then layering Scripture focus, reflection, prayer, and obedience prompts onto each day.`
        : 'Chronicle reshaped the source into a daily Bible-study path with Scripture focus, reflection, prayer, and obedience prompts.',
    generationStrategy: preserveDaily ? 'preserved-daily' : generatedStudy.strategy,
    phases: phases.length > 0 ? phases : [{ label: 'Daily Sessions', emphasis: 'Move through the source one day at a time.' }],
    days,
  }
  generatedPlan.sourceDiagnostics = summarizePlanSourceDiagnostics(generatedPlan)

  return {
    classification,
    recommendedWorkflow,
    summary: generatedPlan.summary,
    generatedPlan,
  }
}

function getEmbeddedStructurePath(textPath: string) {
  if (textPath.endsWith('.book.txt')) return textPath.replace(/\.book\.txt$/, '.embedded.txt')
  if (textPath.endsWith('.txt')) return textPath.replace(/\.txt$/, '.embedded.txt')
  return null
}

function comparableWords(value: string) {
  return compactInline(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !['the', 'and', 'for', 'part'].includes(word))
}

function findTitleStartInWindow(lines: string[], start: number, end: number, title: string) {
  const words = comparableWords(title)
  if (words.length === 0) return start
  const threshold = Math.max(2, Math.ceil(words.length * 0.58))
  const maxIndex = Math.min(end, start + 240, lines.length)

  for (let index = start; index < maxIndex; index += 1) {
    const combined = compactInline(lines.slice(index, Math.min(index + 6, maxIndex)).join(' '))
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
    const hits = words.filter((word) => combined.includes(word)).length
    if (hits >= threshold) return index
  }

  return start
}

function isReviewOrChromeLine(line: string) {
  const cleaned = compactInline(line)
  return !cleaned
    || /^\d+$/.test(cleaned)
    || /^(experiencing god|unit\s+\d+|summary statements?|verse\s+to\s+memori|daily review)$/i.test(cleaned)
    || /review today’s lesson|review today's lesson|what was the most meaningful|ment or scripture you read today|reword the statement|into a prayer of response|what does god want you to do|in response to today’s study/i.test(cleaned)
}

function enrichDailyPlanWithSourceText(
  plan: OwnedBookDailyPlan,
  sourceText: string,
  bookTitle?: string,
): OwnedBookDailyPlan {
  if (!plan.days?.length) return plan

  const pages = splitOcrTextIntoPages(sourceText)
  const lines = pages.flatMap((page) => page.lines)
  const reviewIndexes = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => /Review today’s lesson\. Pray|Review today's lesson\. Pray/i.test(line))
    .map(({ index }) => index)

  if ((plan.generationStrategy === 'preserved-daily' || !plan.generationStrategy) && reviewIndexes.length + 1 < plan.days.length) return plan

  let previousEndLine = 0
  const enrichedDays = plan.days.map((day, index) => {
    const manualOverride = getManualDaySourceOverride(bookTitle || plan.title, day.day)
    const roughStart = index === 0
      ? 0
      : reviewIndexes[index - 1] != null
        ? reviewIndexes[index - 1] + 1
        : previousEndLine
    const titleStart = findTitleStartInWindow(lines, roughStart, lines.length, day.title)
    const nextTitleStart = index + 1 < plan.days!.length
      ? findTitleStartInWindow(lines, titleStart + 1, lines.length, plan.days![index + 1].title)
      : lines.length
    const reviewEnd = reviewIndexes[index] != null ? reviewIndexes[index] : lines.length
    const roughEnd = Math.min(
      reviewEnd > titleStart ? reviewEnd : lines.length,
      nextTitleStart > titleStart ? nextTitleStart : lines.length,
    )
    previousEndLine = Math.max(titleStart + 1, roughEnd)
    const sectionLines = lines.slice(titleStart, roughEnd)
    const sectionText = sectionLines
      .map(compactInline)
      .filter((line) => !isReviewOrChromeLine(line))
      .join('\n')
    const references = getBookReferences(sectionText)
    const scripture = day.scripture || references.slice(0, 2).join('; ') || day.dailyReading || 'Pair today’s section with Scripture'
    const cleanedSourceText = cleanDailySourceText(sectionLines, day.title)
    const fallbackSourceText = compactInline(sectionText)
      .replace(new RegExp(`^${escapeRegExp(day.title)}\\s*`, 'i'), '')
      .replace(/^experiencing god\s*/i, '')
      .replace(/^masterlife\s*/i, '')
      .trim()
    const sourcePageSlices = manualOverride?.sourcePageSlices
      || deriveSourcePageSlicesFromLineRange(pages, titleStart, Math.max(titleStart, roughEnd - 1))
    const sourcePageStart = Math.min(...sourcePageSlices.map((slice) => slice.pageNumber))
    const sourcePageEnd = Math.max(...sourcePageSlices.map((slice) => slice.pageNumber))
    const mappedPageText = compactInline(
      pages
        .filter((page) => sourcePageSlices.some((slice) => slice.pageNumber === page.pageNumber))
        .flatMap((page) => page.lines)
        .filter((line) => !isReviewOrChromeLine(line))
        .join(' ')
    )
      .replace(new RegExp(`^${escapeRegExp(day.title)}\\s*`, 'i'), '')
      .replace(/^experiencing god\s*/i, '')
      .replace(/^masterlife\s*/i, '')
      .trim()
    const storedSourceText =
      cleanedSourceText.length >= 120
        ? cleanedSourceText
        : fallbackSourceText.length >= 120
          ? fallbackSourceText
          : mappedPageText
    const resolvedTitle = manualOverride?.title || day.title

    return {
      ...day,
      title: resolvedTitle,
      scripture,
      dailyReading: day.dailyReading || scripture,
      sourceExcerpt: excerptFromSection(storedSourceText || sectionText, resolvedTitle),
      sourceText: storedSourceText || undefined,
      sourcePageStart,
      sourcePageEnd,
      sourcePageSlices,
      sourceDiagnostics: buildDaySourceDiagnostics(storedSourceText || sectionText, {
        hasMappedPages: sourcePageSlices.length > 0,
        hasSlices: sourcePageSlices.some((slice) => slice.startY != null || slice.endY != null),
        usedParagraphChunks: plan.generationStrategy === 'paragraph-chunks',
      }),
    }
  })

  return {
    ...plan,
    sourceDiagnostics: summarizePlanSourceDiagnostics({
      ...plan,
      days: enrichedDays,
    }),
    days: enrichedDays,
  }
}

function maybeEnrichStructuredRecord(record: LibraryBookRecord) {
  if (
    record.status !== 'structured'
    || !record.generatedPlan?.days?.length
    || !getManagedAssetPath(record, 'ocr-text')
    || !existsSync(getManagedAssetPath(record, 'ocr-text')!)
  ) {
    return record
  }

  const needsEnrichment = record.generatedPlan.days.some((day) => {
    const manualOverride = getManualDaySourceOverride(record.title, day.day)
    if (manualOverride) {
      return day.sourcePageStart !== manualOverride.sourcePageStart
        || day.sourcePageEnd !== manualOverride.sourcePageEnd
        || JSON.stringify(day.sourcePageSlices || []) !== JSON.stringify(manualOverride.sourcePageSlices || [])
        || (manualOverride.title && day.title !== manualOverride.title)
    }
    return !day.sourceText || !day.sourcePageStart || !day.sourcePageEnd || (record.workflow === 'preserve-daily' && !(day.workbookOverlays?.length))
  })
  if (!needsEnrichment) {
    const ocrQuality = summarizeOcrQuality(record)
    return {
      ...record,
      ocrQuality,
      importDiagnostics: record.generatedPlan ? summarizePlanSourceDiagnostics(record.generatedPlan, ocrQuality) : record.importDiagnostics,
    }
  }

  const sourceText = readFileSync(getManagedAssetPath(record, 'ocr-text')!, 'utf8')
  const generatedPlan = attachDynamicStudyLayouts(
    enrichDailyPlanWithSourceText(record.generatedPlan, sourceText, record.title),
    record.title,
    record.workflow === 'preserve-daily' ? 'preserve-daily' : 'ai-daily-study',
    sourceText,
  )
  const ocrQuality = summarizeOcrQuality(record)
  const updated = {
    ...record,
    updatedAt: new Date().toISOString(),
    generatedPlan,
    ocrQuality,
    importDiagnostics: summarizePlanSourceDiagnostics(generatedPlan, ocrQuality),
  }
  upsertLibraryRecord(updated)
  return updated
}

function apiBibleDevApi(env: Record<string, string>): Plugin {
  return withChronicleMiddlewares('chronicle-api-bible-dev-api', (middlewares) => {
      middlewares.use('/api/api-bible/books', async (_request, response) => {
        try {
          const apiKey = env.API_BIBLE_KEY || env.VITE_API_BIBLE_KEY
          const bibleId = getPrimaryApiBibleId(env)

          if (!apiKey || !bibleId) {
            sendJson(response, 401, { error: { errmsg: 'API.Bible key or Bible ID is not configured.' } })
            return
          }

          const apiBibleResponse = await fetch(
            `${API_BIBLE_BASE_URL}/bibles/${encodeURIComponent(bibleId)}/books`,
            { headers: { 'api-key': apiKey } }
          )
          const payload = await apiBibleResponse.json()
          sendJson(response, apiBibleResponse.status, payload)
        } catch (error) {
          sendJson(response, 500, {
            error: {
              errmsg: error instanceof Error ? error.message : 'API.Bible books request failed.',
            },
          })
        }
      })

      middlewares.use('/api/api-bible/chapters', async (request, response) => {
        try {
          const requestUrl = getRequestUrl(request)
          const bookId = requestUrl.searchParams.get('bookId')
          const apiKey = env.API_BIBLE_KEY || env.VITE_API_BIBLE_KEY
          const bibleId = getPrimaryApiBibleId(env)

          if (!bookId) {
            sendJson(response, 400, { error: { errmsg: 'Missing bookId query parameter.' } })
            return
          }

          if (!apiKey || !bibleId) {
            sendJson(response, 401, { error: { errmsg: 'API.Bible key or Bible ID is not configured.' } })
            return
          }

          const apiBibleResponse = await fetch(
            `${API_BIBLE_BASE_URL}/bibles/${encodeURIComponent(bibleId)}/books/${encodeURIComponent(bookId)}/chapters`,
            { headers: { 'api-key': apiKey } }
          )
          const payload = await apiBibleResponse.json()
          sendJson(response, apiBibleResponse.status, payload)
        } catch (error) {
          sendJson(response, 500, {
            error: {
              errmsg: error instanceof Error ? error.message : 'API.Bible chapters request failed.',
            },
          })
        }
      })

      middlewares.use('/api/api-bible/chapter', async (request, response) => {
        try {
          const requestUrl = getRequestUrl(request)
          const chapterId = requestUrl.searchParams.get('chapterId')
          const bibleId = requestUrl.searchParams.get('bibleId')
          const apiKey = env.API_BIBLE_KEY || env.VITE_API_BIBLE_KEY

          if (!chapterId) {
            sendJson(response, 400, { error: { errmsg: 'Missing chapterId query parameter.' } })
            return
          }

          const bibleIds = bibleId ? [bibleId] : getApiBibleIds(env)
          if (!apiKey || bibleIds.length === 0) {
            sendJson(response, 401, { error: { errmsg: 'API.Bible key or Bible ID is not configured.' } })
            return
          }

          const params = new URLSearchParams({
            'content-type': 'html',
            'include-notes': 'false',
            'include-titles': 'true',
            'include-chapter-numbers': 'false',
            'include-verse-numbers': 'true',
            'include-verse-spans': 'false',
          })
          let lastPayload: unknown = null
          let lastStatus = 500
          for (const candidateBibleId of bibleIds) {
            const apiBibleResponse = await fetch(
              `${API_BIBLE_BASE_URL}/bibles/${encodeURIComponent(candidateBibleId)}/chapters/${encodeURIComponent(chapterId)}?${params.toString()}`,
              { headers: { 'api-key': apiKey } }
            )
            const payload = await apiBibleResponse.json()
            if (apiBibleResponse.ok) {
              sendJson(response, apiBibleResponse.status, payload)
              return
            }
            lastPayload = payload
            lastStatus = apiBibleResponse.status
          }

          sendJson(response, lastStatus, lastPayload || { error: { errmsg: 'API.Bible request failed.' } })
        } catch (error) {
          sendJson(response, 500, {
            error: {
              errmsg: error instanceof Error ? error.message : 'API.Bible request failed.',
            },
          })
        }
      })
  })
}

function aiChatDevApi(env: Record<string, string>): Plugin {
  return withChronicleMiddlewares('chronicle-ai-chat-dev-api', (middlewares) => {
      middlewares.use('/api/ai/chat', async (request, response) => {
        if (request.method !== 'POST') {
          sendJson(response, 405, { error: { errmsg: 'Method not allowed.' } })
          return
        }

        try {
          const apiKey = env.OPENAI_API_KEY
          if (!apiKey) {
            sendJson(response, 401, { error: { errmsg: 'OPENAI_API_KEY is not configured.' } })
            return
          }

          const body = await readJsonBody(request) as {
            page?: string
            pathname?: string
            persona?: ChroniclePersonaId
            agentMode?: 'bible_study_agent' | 'discipleship_coach' | 'prayer_guide' | 'reflection_guide'
            context?: Record<string, unknown>
            messages?: Array<{ role: 'user' | 'assistant'; text: string }>
          }

          const persona = getChroniclePersona(body.persona || DEFAULT_CHRONICLE_PERSONA)
          const agentMode = body.agentMode || 'bible_study_agent'
          const transcript = (body.messages || [])
            .map((message) => `${message.role === 'user' ? 'User' : 'Assistant'}: ${message.text}`)
            .join('\n\n')

          const prompt = [
            `Page: ${body.page || 'Unknown'}`,
            `Path: ${body.pathname || '/'}`,
            `Context: ${JSON.stringify(body.context || {})}`,
            '',
            transcript,
          ].join('\n')

          const openAiResponse = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: env.OPENAI_MODEL || 'gpt-4.1-mini',
              instructions: buildChronicleInstructions(persona.id, agentMode),
              input: prompt,
            }),
          })

          const payload = await openAiResponse.json() as {
            output_text?: string
            output?: Array<{
              type?: string
              role?: string
              content?: Array<{
                type?: string
                text?: string
              }>
            }>
            error?: { message?: string }
          }

          if (!openAiResponse.ok) {
            sendJson(response, openAiResponse.status, {
              error: { errmsg: payload.error?.message || 'OpenAI request failed.' },
            })
            return
          }

          sendJson(response, 200, { reply: extractOpenAIText(payload) || 'No response text returned.' })
        } catch (error) {
          sendJson(response, 500, {
            error: {
              errmsg: error instanceof Error ? error.message : 'AI chat request failed.',
            },
          })
        }
      })
  })
}

function splitCommand(command: string) {
  const parts = command.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    throw new Error('No command configured.')
  }
  return {
    bin: parts[0],
    args: parts.slice(1),
  }
}

async function executableExists(command: string) {
  try {
    const { bin } = splitCommand(command)
    if (bin.includes('/')) return existsSync(bin)
    await execFileAsync('which', [bin])
    return true
  } catch {
    return false
  }
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '')
}

function inferAudioExtension(mimeType?: string, fileName?: string) {
  const fromName = fileName ? extname(fileName) : ''
  if (fromName) return fromName
  if (mimeType?.includes('webm')) return '.webm'
  if (mimeType?.includes('wav')) return '.wav'
  if (mimeType?.includes('mpeg') || mimeType?.includes('mp3')) return '.mp3'
  if (mimeType?.includes('ogg')) return '.ogg'
  if (mimeType?.includes('mp4') || mimeType?.includes('m4a')) return '.m4a'
  return '.webm'
}

function createVoiceTempDir(prefix: string) {
  return mkdtempSync(join(tmpdir(), prefix))
}

async function callHomeAssistantApi(
  env: Record<string, string>,
  path: string,
  init: RequestInit = {},
  config?: ChronicleVoiceConfig,
) {
  const baseUrl = trimTrailingSlash(env.CHRONICLE_HOME_ASSISTANT_URL || config?.homeAssistant.baseUrl || '')
  const token = env.CHRONICLE_HOME_ASSISTANT_TOKEN || ''
  if (!baseUrl || !token) {
    throw new Error('Home Assistant URL/token is not configured.')
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Home Assistant request failed with ${response.status}.`)
  }

  if (response.status === 204) return null
  return response.json()
}

async function transcribeWithWhisperCli(
  audioBuffer: Buffer,
  mimeType: string | undefined,
  fileName: string | undefined,
  config: ChronicleVoiceConfig,
  env: Record<string, string>,
) {
  const command = env.CHRONICLE_WHISPER_COMMAND || config.whisperCli.command || 'whisper'
  const { bin, args: baseArgs } = splitCommand(command)
  const tempDir = createVoiceTempDir('chronicle-whisper-')
  const inputExt = inferAudioExtension(mimeType, fileName)
  const inputPath = join(tempDir, `input${inputExt}`)
  const outputPath = join(tempDir, `input.json`)
  try {
    writeFileSync(inputPath, audioBuffer)
    const cliArgs = [
      ...baseArgs,
      inputPath,
      '--model',
      env.CHRONICLE_WHISPER_MODEL || config.whisperCli.model || 'base',
      '--output_format',
      'json',
      '--output_dir',
      tempDir,
    ]
    if (config.whisperCli.language && config.whisperCli.language !== 'auto') {
      cliArgs.push('--language', config.whisperCli.language)
    }
    if (config.whisperCli.translateToEnglish) {
      cliArgs.push('--task', 'translate')
    }
    if (config.whisperCli.initialPrompt.trim()) {
      cliArgs.push('--initial_prompt', config.whisperCli.initialPrompt.trim())
    }
    await execFileAsync(bin, cliArgs, { maxBuffer: 20 * 1024 * 1024 })
    const payload = JSON.parse(readFileSync(outputPath, 'utf8')) as { text?: string }
    const transcript = typeof payload.text === 'string' ? payload.text.trim() : ''
    if (!transcript) throw new Error('Whisper returned an empty transcript.')
    return {
      provider: 'whisper-cli',
      transcript,
    }
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
}

async function transcribeWithLocalAI(
  audioBuffer: Buffer,
  mimeType: string | undefined,
  fileName: string | undefined,
  config: ChronicleVoiceConfig,
  env: Record<string, string>,
) {
  const baseUrl = trimTrailingSlash(env.CHRONICLE_LOCALAI_BASE_URL || config.localAi.baseUrl || '')
  if (!baseUrl) throw new Error('LocalAI base URL is not configured.')
  const apiKey = env.CHRONICLE_LOCALAI_API_KEY || config.localAi.apiKey || ''
  const body = new FormData()
  body.append('file', new Blob([audioBuffer], { type: mimeType || 'audio/webm' }), fileName || `chronicle${inferAudioExtension(mimeType, fileName)}`)
  body.append('model', env.CHRONICLE_LOCALAI_WHISPER_MODEL || config.localAi.whisperModel || 'whisper-1')
  if (config.whisperCli.language && config.whisperCli.language !== 'auto') {
    body.append('language', config.whisperCli.language)
  }
  if (config.whisperCli.initialPrompt.trim()) {
    body.append('prompt', config.whisperCli.initialPrompt.trim())
  }

  const response = await fetch(`${baseUrl}/v1/audio/transcriptions`, {
    method: 'POST',
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
    body,
  })
  const payload = await response.json() as { text?: string; error?: { message?: string } }
  if (!response.ok) {
    throw new Error(payload.error?.message || 'LocalAI transcription failed.')
  }
  const transcript = typeof payload.text === 'string' ? payload.text.trim() : ''
  if (!transcript) throw new Error('LocalAI returned an empty transcript.')
  return {
    provider: 'localai-openai',
    transcript,
  }
}

async function synthesizeWithPiper(
  text: string,
  config: ChronicleVoiceConfig,
  env: Record<string, string>,
) {
  const command = env.CHRONICLE_PIPER_COMMAND || config.piper.command || 'piper'
  const modelPath = resolveChroniclePath(env.CHRONICLE_PIPER_MODEL || config.piper.modelPath)
  if (!modelPath || !existsSync(modelPath)) {
    throw new Error('Piper model path is not configured or the model file does not exist.')
  }

  const { bin, args: baseArgs } = splitCommand(command)
  const tempDir = createVoiceTempDir('chronicle-piper-')
  const outputPath = join(tempDir, 'speech.wav')

  try {
    const args = [...baseArgs, '--model', modelPath, '--output_file', outputPath]
    if (typeof config.piper.speaker === 'number' && config.piper.speaker >= 0) {
      args.push('--speaker', String(config.piper.speaker))
    }

    await new Promise<void>((resolvePromise, rejectPromise) => {
      const child = spawn(bin, args, { stdio: ['pipe', 'ignore', 'pipe'] })
      let stderr = ''
      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString()
      })
      child.on('error', rejectPromise)
      child.on('close', (code) => {
        if (code === 0) resolvePromise()
        else rejectPromise(new Error(stderr.trim() || `Piper exited with code ${code}.`))
      })
      child.stdin.write(text)
      child.stdin.end()
    })

    const audioBuffer = readFileSync(outputPath)
    return {
      provider: 'piper-cli',
      mimeType: 'audio/wav',
      audioBase64: audioBuffer.toString('base64'),
    }
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
}

function voiceDevApi(env: Record<string, string>): Plugin {
  return withChronicleMiddlewares('chronicle-voice-dev-api', (middlewares) => {
      middlewares.use('/api/voice/status', async (_request, response) => {
        try {
          const whisperCommand = env.CHRONICLE_WHISPER_COMMAND || 'whisper'
          const piperCommand = env.CHRONICLE_PIPER_COMMAND || 'piper'
          sendJson(response, 200, {
            ok: true,
            providers: {
              whisperCli: {
                available: await executableExists(whisperCommand),
                command: whisperCommand,
                model: env.CHRONICLE_WHISPER_MODEL || 'base',
              },
              localAi: {
                configured: Boolean(env.CHRONICLE_LOCALAI_BASE_URL),
                baseUrl: env.CHRONICLE_LOCALAI_BASE_URL || null,
              },
              piper: {
                available: await executableExists(piperCommand),
                command: piperCommand,
                modelConfigured: Boolean(env.CHRONICLE_PIPER_MODEL),
                modelPath: env.CHRONICLE_PIPER_MODEL || null,
              },
              homeAssistant: {
                configured: Boolean(env.CHRONICLE_HOME_ASSISTANT_URL && env.CHRONICLE_HOME_ASSISTANT_TOKEN),
                baseUrl: env.CHRONICLE_HOME_ASSISTANT_URL || null,
                hasTtsTarget: Boolean(env.CHRONICLE_HOME_ASSISTANT_TTS_ENTITY_ID),
                hasMediaPlayer: Boolean(env.CHRONICLE_HOME_ASSISTANT_MEDIA_PLAYER_ENTITY_ID),
              },
              liveKit: {
                configured: Boolean(env.LIVEKIT_URL && env.LIVEKIT_API_KEY && env.LIVEKIT_API_SECRET),
                url: env.LIVEKIT_URL || null,
              },
            },
          })
        } catch (error) {
          sendJson(response, 500, { error: { errmsg: error instanceof Error ? error.message : 'Unable to inspect voice status.' } })
        }
      })

      middlewares.use('/api/voice/transcribe', async (request, response) => {
        if (request.method !== 'POST') {
          sendJson(response, 405, { error: { errmsg: 'Method not allowed.' } })
          return
        }

        try {
          const body = await readJsonBody(request) as {
            audioBase64?: string
            mimeType?: string
            fileName?: string
            config?: ChronicleVoiceConfig
            provider?: 'whisper-cli' | 'localai-openai'
          }
          if (!body.audioBase64) {
            sendJson(response, 400, { error: { errmsg: 'audioBase64 is required.' } })
            return
          }
          const config = normalizeVoiceConfig(body.config)
          const audioBuffer = Buffer.from(body.audioBase64, 'base64')
          const provider = body.provider || config.transcriptionProvider
          const result = provider === 'localai-openai'
            ? await transcribeWithLocalAI(audioBuffer, body.mimeType, body.fileName, config, env)
            : await transcribeWithWhisperCli(audioBuffer, body.mimeType, body.fileName, config, env)

          sendJson(response, 200, {
            ok: true,
            ...result,
          })
        } catch (error) {
          sendJson(response, 500, { error: { errmsg: error instanceof Error ? error.message : 'Unable to transcribe audio.' } })
        }
      })

      middlewares.use('/api/voice/speak', async (request, response) => {
        if (request.method !== 'POST') {
          sendJson(response, 405, { error: { errmsg: 'Method not allowed.' } })
          return
        }

        try {
          const body = await readJsonBody(request) as {
            text?: string
            config?: ChronicleVoiceConfig
            provider?: 'piper-cli' | 'home-assistant-tts'
          }
          if (!body.text?.trim()) {
            sendJson(response, 400, { error: { errmsg: 'text is required.' } })
            return
          }
          const config = normalizeVoiceConfig(body.config)
          const provider = body.provider || config.synthesisProvider

          if (provider === 'home-assistant-tts') {
            const entityId = env.CHRONICLE_HOME_ASSISTANT_TTS_ENTITY_ID || config.homeAssistant.ttsEntityId
            const mediaPlayerEntityId = env.CHRONICLE_HOME_ASSISTANT_MEDIA_PLAYER_ENTITY_ID || config.homeAssistant.mediaPlayerEntityId
            if (!entityId || !mediaPlayerEntityId) {
              throw new Error('Home Assistant TTS entity or media player is not configured.')
            }
            await callHomeAssistantApi(env, '/api/services/tts/speak', {
              method: 'POST',
              body: JSON.stringify({
                target: { entity_id: entityId },
                data: {
                  media_player_entity_id: mediaPlayerEntityId,
                  message: body.text.trim(),
                  language: config.homeAssistant.preferredLanguage,
                },
              }),
            }, config)
            sendJson(response, 200, {
              ok: true,
              provider: 'home-assistant-tts',
              delivered: true,
            })
            return
          }

          const result = await synthesizeWithPiper(body.text.trim(), config, env)
          sendJson(response, 200, {
            ok: true,
            ...result,
          })
        } catch (error) {
          sendJson(response, 500, { error: { errmsg: error instanceof Error ? error.message : 'Unable to synthesize speech.' } })
        }
      })

      middlewares.use('/api/voice/home-assistant/conversation', async (request, response) => {
        if (request.method !== 'POST') {
          sendJson(response, 405, { error: { errmsg: 'Method not allowed.' } })
          return
        }
        try {
          const body = await readJsonBody(request) as {
            text?: string
            conversationId?: string
            config?: ChronicleVoiceConfig
          }
          if (!body.text?.trim()) {
            sendJson(response, 400, { error: { errmsg: 'text is required.' } })
            return
          }
          const config = normalizeVoiceConfig(body.config)
          const payload = await callHomeAssistantApi(env, '/api/conversation/process', {
            method: 'POST',
            body: JSON.stringify({
              text: body.text.trim(),
              conversation_id: body.conversationId,
              agent_id: env.CHRONICLE_HOME_ASSISTANT_CONVERSATION_AGENT || config.homeAssistant.conversationAgentId,
              language: config.homeAssistant.preferredLanguage,
            }),
          }, config) as {
            conversation_id?: string
            response?: {
              speech?: {
                plain?: { speech?: string }
              }
            }
          }
          sendJson(response, 200, {
            ok: true,
            conversationId: payload?.conversation_id,
            reply: payload?.response?.speech?.plain?.speech || '',
            raw: payload,
          })
        } catch (error) {
          sendJson(response, 500, { error: { errmsg: error instanceof Error ? error.message : 'Unable to call Home Assistant conversation.' } })
        }
      })

      middlewares.use('/api/voice/home-assistant/service', async (request, response) => {
        if (request.method !== 'POST') {
          sendJson(response, 405, { error: { errmsg: 'Method not allowed.' } })
          return
        }
        try {
          const body = await readJsonBody(request) as {
            domain?: string
            service?: string
            data?: Record<string, unknown>
            config?: ChronicleVoiceConfig
          }
          if (!body.domain || !body.service) {
            sendJson(response, 400, { error: { errmsg: 'domain and service are required.' } })
            return
          }
          const config = normalizeVoiceConfig(body.config)
          const result = await callHomeAssistantApi(
            env,
            `/api/services/${encodeURIComponent(body.domain)}/${encodeURIComponent(body.service)}`,
            {
              method: 'POST',
              body: JSON.stringify(body.data || {}),
            },
            config,
          )
          sendJson(response, 200, {
            ok: true,
            result,
          })
        } catch (error) {
          sendJson(response, 500, { error: { errmsg: error instanceof Error ? error.message : 'Unable to call Home Assistant service.' } })
        }
      })

      middlewares.use('/api/voice/livekit/token', async (request, response) => {
        if (request.method !== 'POST') {
          sendJson(response, 405, { error: { errmsg: 'Method not allowed.' } })
          return
        }
        try {
          const body = await readJsonBody(request) as {
            roomName?: string
            participantName?: string
            config?: ChronicleVoiceConfig
          }
          const config = normalizeVoiceConfig(body.config)
          const url = env.LIVEKIT_URL || config.liveKit.url
          const apiKey = env.LIVEKIT_API_KEY
          const apiSecret = env.LIVEKIT_API_SECRET
          if (!url || !apiKey || !apiSecret) {
            throw new Error('LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET must be configured.')
          }
          const roomName = body.roomName || config.liveKit.roomName
          const participantName = body.participantName || config.liveKit.participantName
          const token = new AccessToken(apiKey, apiSecret, {
            identity: participantName,
            name: participantName,
            ttl: `${config.liveKit.tokenTtlMinutes}m`,
          })
          token.addGrant({
            roomJoin: true,
            room: roomName,
            canPublish: true,
            canSubscribe: true,
          })
          sendJson(response, 200, {
            ok: true,
            url,
            roomName,
            participantName,
            agentName: config.liveKit.agentName,
            token: await token.toJwt(),
          })
        } catch (error) {
          sendJson(response, 500, { error: { errmsg: error instanceof Error ? error.message : 'Unable to generate LiveKit token.' } })
        }
      })
  })
}

function studyImportsDevApi(env: Record<string, string>): Plugin {
  return withChronicleMiddlewares('chronicle-study-imports-dev-api', (middlewares) => {
      middlewares.use('/api/study-imports/status', async (_request, response) => {
        try {
          const ocrDir = resolve(process.cwd(), 'data/ocr')
          const files = existsSync(ocrDir)
            ? await listFilesRecursive(ocrDir)
            : []

          sendJson(response, 200, {
            manifest: buildChronicleLibraryManifest(loadLibraryCatalog()),
            tools: {
              tesseract: existsSync('/opt/homebrew/bin/tesseract'),
              ocrmypdf: existsSync('/opt/homebrew/bin/ocrmypdf'),
              pdftotext: existsSync('/opt/homebrew/bin/pdftotext'),
            },
            files,
          })
        } catch (error) {
          sendJson(response, 500, {
            error: { errmsg: error instanceof Error ? error.message : 'Unable to load study import status.' },
          })
        }
      })

      middlewares.use('/api/study-imports/library', async (_request, response) => {
        try {
          const records = loadLibraryCatalog().map((record) => {
            const enriched = maybeEnrichStructuredRecord(record)
            return enriched.ocrQuality ? enriched : {
              ...enriched,
              ocrQuality: summarizeOcrQuality(enriched),
            }
          })
          sendJson(response, 200, {
            ok: true,
            manifest: buildChronicleLibraryManifest(records),
            records,
          })
        } catch (error) {
          sendJson(response, 500, {
            error: { errmsg: error instanceof Error ? error.message : 'Unable to load library catalog.' },
          })
        }
      })

      middlewares.use('/api/study-imports/delete-book', async (request, response) => {
        if (request.method !== 'POST') {
          sendJson(response, 405, { error: { errmsg: 'Method not allowed.' } })
          return
        }

        try {
          const body = await readJsonBody(request) as { bookId?: string }
          if (!body.bookId) {
            sendJson(response, 400, { error: { errmsg: 'bookId is required.' } })
            return
          }

          const deleted = deleteLibraryRecord(body.bookId)
          if (!deleted) {
            sendJson(response, 404, { error: { errmsg: 'Study library record not found.' } })
            return
          }

          sendJson(response, 200, {
            ok: true,
            bookId: body.bookId,
            removedTitle: deleted.record.title,
            removedPaths: deleted.removedPaths,
            workbookAuditUpdated: deleted.workbookAuditUpdated,
          })
        } catch (error) {
          sendJson(response, 500, {
            error: { errmsg: error instanceof Error ? error.message : 'Unable to delete the study library book.' },
          })
        }
      })

      middlewares.use('/api/study-imports/workbook-audit', async (_request, response) => {
        try {
          const auditPath = getDiscipleshipWorkbookAuditPath()
          if (!existsSync(auditPath)) {
            sendJson(response, 200, {
              ok: true,
              generatedAt: null,
              audits: [],
              warnings: [],
            })
            return
          }

          const audit = readJsonFile<{
            generatedAt?: string
            audits?: Array<{
              bookId: string
              title: string
              day: number
              section?: string
              pageRange?: number[]
              coveredPages?: number[]
              cuePages?: Array<{ pageNumber: number; cueLabels?: string[] }>
              uncoveredCuePages?: Array<{ pageNumber: number; cueLabels?: string[] }>
            }>
            warnings?: string[]
          }>(auditPath)

          sendJson(response, 200, {
            ok: true,
            generatedAt: audit.generatedAt || null,
            audits: audit.audits || [],
            warnings: audit.warnings || [],
          })
        } catch (error) {
          sendJson(response, 500, {
            error: { errmsg: error instanceof Error ? error.message : 'Unable to load workbook audit status.' },
          })
        }
      })

      middlewares.use('/api/study-imports/run-workbook-sync', async (request, response) => {
        if (request.method !== 'POST') {
          sendJson(response, 405, { error: { errmsg: 'Method not allowed.' } })
          return
        }

        try {
          const scriptPath = resolve(process.cwd(), 'scripts', 'sync-discipleship-workbook-overlays.mjs')
          const { stdout, stderr } = await execFileAsync(process.execPath, [scriptPath], {
            cwd: process.cwd(),
            maxBuffer: 1024 * 1024 * 4,
          })

          sendJson(response, 200, {
            ok: true,
            stdout,
            stderr,
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Workbook sync failed.'
          sendJson(response, 500, {
            error: { errmsg: message },
          })
        }
      })

      middlewares.use('/api/study-imports/run-workbook-qa', async (request, response) => {
        if (request.method !== 'POST') {
          sendJson(response, 405, { error: { errmsg: 'Method not allowed.' } })
          return
        }

        try {
          const scriptPath = resolve(process.cwd(), 'scripts', 'qa-discipleship-workbook.mjs')
          const { stdout, stderr } = await execFileAsync(process.execPath, [scriptPath], {
            cwd: process.cwd(),
            maxBuffer: 1024 * 1024 * 4,
          })

          sendJson(response, 200, {
            ok: true,
            stdout,
            stderr,
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Workbook QA failed.'
          sendJson(response, 500, {
            error: { errmsg: message },
          })
        }
      })

      middlewares.use('/api/study-imports/book-text', async (request, response) => {
        try {
          const requestUrl = getRequestUrl(request)
          const bookId = requestUrl.searchParams.get('bookId')
          const fallbackTextPath = requestUrl.searchParams.get('textPath')
          if (!bookId && !fallbackTextPath) {
            sendJson(response, 400, { error: { errmsg: 'bookId or textPath is required.' } })
            return
          }

          const record = bookId ? loadLibraryCatalog().find((entry) => entry.id === bookId) : null
          if (!record && !fallbackTextPath) {
            sendJson(response, 404, { error: { errmsg: 'Book not found.' } })
            return
          }

          const textPath = getManagedAssetPath(record || {}, 'ocr-text') || fallbackTextPath
          if (!textPath || !existsSync(textPath)) {
            sendJson(response, 404, { error: { errmsg: 'OCR text is not available for this book yet.' } })
            return
          }

          const text = readFileSync(textPath, 'utf8')
          sendJson(response, 200, {
            ok: true,
            title: record?.title || basename(textPath),
            text,
          })
        } catch (error) {
          sendJson(response, 500, {
            error: { errmsg: error instanceof Error ? error.message : 'Unable to load OCR transcription.' },
          })
        }
      })

      middlewares.use('/api/study-imports/book-pdf', async (request, response) => {
        try {
          const requestUrl = getRequestUrl(request)
          const bookId = requestUrl.searchParams.get('bookId')
          const fallbackSourcePath = requestUrl.searchParams.get('sourcePath')
          if (!bookId && !fallbackSourcePath) {
            sendJson(response, 400, { error: { errmsg: 'bookId or sourcePath is required.' } })
            return
          }

          const record = bookId ? loadLibraryCatalog().find((entry) => entry.id === bookId) : null
          if (!record && !fallbackSourcePath) {
            sendJson(response, 404, { error: { errmsg: 'Book not found.' } })
            return
          }

          const pdfPath = getManagedAssetPath(record || {}, 'imported-pdf') || fallbackSourcePath
          if (!pdfPath || !existsSync(pdfPath)) {
            sendJson(response, 404, { error: { errmsg: 'Source PDF is not available for this book yet.' } })
            return
          }

          response.statusCode = 200
          response.setHeader('Content-Type', 'application/pdf')
          response.setHeader('Content-Disposition', `inline; filename="${basename(pdfPath)}"`)
          response.end(readFileSync(pdfPath))
        } catch (error) {
          sendJson(response, 500, {
            error: { errmsg: error instanceof Error ? error.message : 'Unable to load source PDF.' },
          })
        }
      })

      middlewares.use('/api/study-imports/book-pdf-range', async (request, response) => {
        try {
          const requestUrl = getRequestUrl(request)
          const bookId = requestUrl.searchParams.get('bookId')
          const fallbackSourcePath = requestUrl.searchParams.get('sourcePath')
          const startPage = Number.parseInt(requestUrl.searchParams.get('startPage') || '', 10)
          const endPage = Number.parseInt(requestUrl.searchParams.get('endPage') || '', 10)

          if ((!bookId && !fallbackSourcePath) || !Number.isFinite(startPage) || !Number.isFinite(endPage)) {
            sendJson(response, 400, { error: { errmsg: 'bookId/sourcePath and startPage/endPage are required.' } })
            return
          }

          const record = bookId ? loadLibraryCatalog().find((entry) => entry.id === bookId) : null
          const pdfPath = getManagedAssetPath(record || {}, 'imported-pdf') || fallbackSourcePath
          if (!pdfPath || !existsSync(pdfPath)) {
            sendJson(response, 404, { error: { errmsg: 'Source PDF is not available for this book yet.' } })
            return
          }

          const safeStart = Math.max(1, Math.min(startPage, endPage))
          const safeEnd = Math.max(safeStart, endPage)
          const slicesDir = resolve(process.cwd(), 'data/library/page-slices')
          mkdirSync(slicesDir, { recursive: true })
          const sliceStem = `${slugifyFileStem(record?.title || basename(pdfPath, extname(pdfPath)))}-${safeStart}-${safeEnd}.pdf`
          const slicePath = resolve(slicesDir, sliceStem)

          if (!existsSync(slicePath)) {
            const qpdfBinary = existsSync('/opt/homebrew/bin/qpdf') ? '/opt/homebrew/bin/qpdf' : 'qpdf'
            await execFileAsync(qpdfBinary, [
              pdfPath,
              '--pages',
              pdfPath,
              `${safeStart}-${safeEnd}`,
              '--',
              slicePath,
            ], {
              cwd: process.cwd(),
              maxBuffer: 1024 * 1024 * 8,
            })
          }

          response.statusCode = 200
          response.setHeader('Content-Type', 'application/pdf')
          response.setHeader('Content-Disposition', `inline; filename="${basename(slicePath)}"`)
          response.end(readFileSync(slicePath))
        } catch (error) {
          sendJson(response, 500, {
            error: { errmsg: error instanceof Error ? error.message : 'Unable to load source PDF range.' },
          })
        }
      })

      middlewares.use('/api/study-imports/book-page-image', async (request, response) => {
        try {
          const requestUrl = getRequestUrl(request)
          const bookId = requestUrl.searchParams.get('bookId')
          const fallbackSourcePath = requestUrl.searchParams.get('sourcePath')
          const page = Number.parseInt(requestUrl.searchParams.get('page') || '', 10)

          if ((!bookId && !fallbackSourcePath) || !Number.isFinite(page) || page < 1) {
            sendJson(response, 400, { error: { errmsg: 'bookId/sourcePath and a valid page are required.' } })
            return
          }

          const record = bookId ? loadLibraryCatalog().find((entry) => entry.id === bookId) : null
          const pdfPath = getManagedAssetPath(record || {}, 'imported-pdf') || fallbackSourcePath
          if (!pdfPath || !existsSync(pdfPath)) {
            sendJson(response, 404, { error: { errmsg: 'Source PDF is not available for this book yet.' } })
            return
          }

          const pageImagesDir = resolve(process.cwd(), 'data/library/page-images')
          mkdirSync(pageImagesDir, { recursive: true })
          const imageStem = `${slugifyFileStem(record?.title || basename(pdfPath, extname(pdfPath)))}-page-${page}`
          const imagePath = resolve(pageImagesDir, `${imageStem}.png`)

          if (!existsSync(imagePath)) {
            const pdftoppmBinary = existsSync('/opt/homebrew/bin/pdftoppm') ? '/opt/homebrew/bin/pdftoppm' : 'pdftoppm'
            await execFileAsync(pdftoppmBinary, [
              '-png',
              '-singlefile',
              '-f',
              String(page),
              '-l',
              String(page),
              pdfPath,
              resolve(pageImagesDir, imageStem),
            ], {
              cwd: process.cwd(),
              maxBuffer: 1024 * 1024 * 16,
            })
          }

          response.statusCode = 200
          response.setHeader('Content-Type', 'image/png')
          response.setHeader('Content-Disposition', `inline; filename="${basename(imagePath)}"`)
          response.end(readFileSync(imagePath))
        } catch (error) {
          sendJson(response, 500, {
            error: { errmsg: error instanceof Error ? error.message : 'Unable to render the source page image.' },
          })
        }
      })

      middlewares.use('/api/study-imports/import-local-book', async (request, response) => {
        if (request.method !== 'POST') {
          sendJson(response, 405, { error: { errmsg: 'Method not allowed.' } })
          return
        }

        try {
          const body = await readJsonBody(request) as {
            pdfPath?: string
            title?: string
            outputStem?: string
          }

          if (!body.pdfPath) {
            sendJson(response, 400, { error: { errmsg: 'pdfPath is required.' } })
            return
          }

          await stat(body.pdfPath)

          const originalFileName = basename(body.pdfPath)
          const title = body.title || basename(originalFileName, extname(originalFileName))
          const uploadsDir = resolve(process.cwd(), 'data/library/uploads')
          mkdirSync(uploadsDir, { recursive: true })

          const stem = slugifyFileStem(body.outputStem || title)
          const storedFileName = `${Date.now()}-${stem}${extname(originalFileName).toLowerCase() || '.pdf'}`
          const storedPath = resolve(uploadsDir, storedFileName)
          copyFileSync(body.pdfPath, storedPath)

          const bookDir = resolve(process.cwd(), 'data/ocr/books', stem)
          mkdirSync(bookDir, { recursive: true })
          const textPath = resolve(bookDir, `${stem}.book.txt`)
          const manifestPath = resolve(bookDir, `${stem}.segments.json`)
          const pdftotextBinary = existsSync('/opt/homebrew/bin/pdftotext') ? '/opt/homebrew/bin/pdftotext' : 'pdftotext'
          await execFileAsync(pdftotextBinary, ['-layout', storedPath, textPath], {
            cwd: process.cwd(),
            maxBuffer: 1024 * 1024 * 16,
          })

          const pageCount = await getPdfPageCount(storedPath)
          const now = new Date().toISOString()
          const recordId = `book-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
          const manifest = {
            sourcePdf: storedPath,
            outputStem: stem,
            totalPages: pageCount,
            segmentSize: pageCount,
            segmentCount: 1,
            createdAt: now,
            fullTextPath: textPath,
            extraction: 'pdftotext-layout',
          }
          writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')

          upsertLibraryRecord({
            id: recordId,
            title,
            originalFileName,
            sourcePath: body.pdfPath,
            storedPath,
            status: 'ocr_complete',
            uploadedAt: now,
            updatedAt: now,
            ocrTextPath: textPath,
            ocrManifestPath: manifestPath,
          })

          sendJson(response, 200, {
            ok: true,
            recordId,
            title,
            storedPath,
            textPath,
            manifestPath,
            pageCount,
          })
        } catch (error) {
          sendJson(response, 500, {
            error: { errmsg: error instanceof Error ? error.message : 'Unable to import local book.' },
          })
        }
      })

      middlewares.use('/api/study-imports/upload-book', async (request, response) => {
        if (request.method !== 'POST') {
          sendJson(response, 405, { error: { errmsg: 'Method not allowed.' } })
          return
        }

        try {
          const body = await readJsonBody(request) as {
            fileName?: string
            contentBase64?: string
          }

          if (!body.fileName || !body.contentBase64) {
            sendJson(response, 400, { error: { errmsg: 'fileName and contentBase64 are required.' } })
            return
          }

          const extension = extname(body.fileName).toLowerCase() || '.pdf'
          const supportedExtension = extension === '.pdf' ? '.pdf' : extension
          const uploadsDir = resolve(process.cwd(), 'data/library/uploads')
          mkdirSync(uploadsDir, { recursive: true })

          const stem = slugifyFileStem(body.fileName)
          const storedFileName = `${Date.now()}-${stem}${supportedExtension}`
          const storedPath = resolve(uploadsDir, storedFileName)
          const fileBuffer = Buffer.from(body.contentBase64, 'base64')
          const now = new Date().toISOString()
          const recordId = `book-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

          writeFileSync(storedPath, fileBuffer)

          upsertLibraryRecord({
            id: recordId,
            title: basename(body.fileName, extname(body.fileName)),
            originalFileName: basename(body.fileName),
            sourcePath: storedPath,
            storedPath,
            status: 'uploaded',
            uploadedAt: now,
            updatedAt: now,
          })

          sendJson(response, 200, {
            ok: true,
            recordId,
            storedPath,
            storedFileName,
            originalFileName: basename(body.fileName),
            bytes: fileBuffer.byteLength,
          })
        } catch (error) {
          sendJson(response, 500, {
            error: { errmsg: error instanceof Error ? error.message : 'Unable to upload book file.' },
          })
        }
      })

      middlewares.use('/api/study-imports/job-status', async (request, response) => {
        try {
          const requestUrl = getRequestUrl(request)
          const jobId = requestUrl.searchParams.get('jobId')
          if (!jobId) {
            sendJson(response, 400, { error: { errmsg: 'jobId is required.' } })
            return
          }

          const job = studyImportJobs.get(jobId)
          if (!job) {
            sendJson(response, 404, { error: { errmsg: 'Study import job not found.' } })
            return
          }

          sendJson(response, 200, { ok: true, job })
        } catch (error) {
          sendJson(response, 500, {
            error: { errmsg: error instanceof Error ? error.message : 'Unable to load study import job status.' },
          })
        }
      })

      middlewares.use('/api/study-imports/ocr', async (request, response) => {
        if (request.method !== 'POST') {
          sendJson(response, 405, { error: { errmsg: 'Method not allowed.' } })
          return
        }

        try {
          const body = await readJsonBody(request) as {
            pdfPath?: string
            outputStem?: string
            pageRange?: string
            recordId?: string
            forceOcr?: boolean
          }

          if (!body.pdfPath) {
            sendJson(response, 400, { error: { errmsg: 'pdfPath is required.' } })
            return
          }

          await stat(body.pdfPath)

          const args = [resolve(process.cwd(), 'scripts/ocr-study-pdf.sh'), body.pdfPath]
          if (body.outputStem) args.push(body.outputStem)
          if (body.pageRange) args.push('--pages', body.pageRange)
          if (body.forceOcr) args.push('--force-ocr')

          const job = runStudyImportJob(
            'ocr',
            body.outputStem || 'OCR import',
            'bash',
            args,
            parseOcrProgress,
            (result) => {
              if (!body.recordId) return result
              const records = loadLibraryCatalog()
              const existing = records.find((entry) => entry.id === body.recordId)
              if (!existing) return result
              const updated = upsertLibraryRecord({
                ...existing,
                status: 'ocr_complete',
                updatedAt: new Date().toISOString(),
                ocrTextPath: typeof result.textPath === 'string' ? result.textPath : existing.ocrTextPath || null,
                ocrPdfPath: typeof result.ocrPdfPath === 'string' ? result.ocrPdfPath : existing.ocrPdfPath || null,
                ocrManifestPath: typeof result.metaPath === 'string' ? result.metaPath : existing.ocrManifestPath || null,
              })
              return { ...result, recordId: updated.id }
            },
          )

          sendJson(response, 202, { ok: true, job })
        } catch (error) {
          sendJson(response, 500, {
            error: { errmsg: error instanceof Error ? error.message : 'OCR import failed.' },
          })
        }
      })

      middlewares.use('/api/study-imports/ocr-segmented', async (request, response) => {
        if (request.method !== 'POST') {
          sendJson(response, 405, { error: { errmsg: 'Method not allowed.' } })
          return
        }

        try {
          const body = await readJsonBody(request) as {
            pdfPath?: string
            outputStem?: string
            segmentSize?: number
            recordId?: string
            forceOcr?: boolean
          }

          if (!body.pdfPath) {
            sendJson(response, 400, { error: { errmsg: 'pdfPath is required.' } })
            return
          }

          await stat(body.pdfPath)

          const args = [resolve(process.cwd(), 'scripts/ocr-book-segments.mjs'), body.pdfPath]
          if (body.outputStem) args.push(body.outputStem)
          if (body.segmentSize) args.push(String(body.segmentSize))
          if (body.forceOcr) args.push('--force-ocr')

          const job = runStudyImportJob(
            'segmented',
            body.outputStem || 'Segmented OCR',
            'node',
            args,
            parseSegmentedProgress,
            (result) => {
              if (!body.recordId) return result
              const records = loadLibraryCatalog()
              const existing = records.find((entry) => entry.id === body.recordId)
              if (!existing) return result
              const manifestPath = typeof result.manifestPath === 'string' ? result.manifestPath : existing.ocrManifestPath || null
              const fullTextPath = typeof result.fullTextPath === 'string' ? result.fullTextPath : existing.ocrTextPath || null
              const updated = upsertLibraryRecord({
                ...existing,
                status: 'ocr_complete',
                updatedAt: new Date().toISOString(),
                ocrTextPath: fullTextPath,
                ocrManifestPath: manifestPath,
              })
              return { ...result, recordId: updated.id }
            },
          )

          sendJson(response, 202, { ok: true, job })
        } catch (error) {
          sendJson(response, 500, {
            error: { errmsg: error instanceof Error ? error.message : 'Segmented OCR failed.' },
          })
        }
      })

      middlewares.use('/api/study-imports/recommend-chunking', async (request, response) => {
        if (request.method !== 'POST') {
          sendJson(response, 405, { error: { errmsg: 'Method not allowed.' } })
          return
        }

        try {
          const body = await readJsonBody(request) as {
            pdfPath?: string
            workflow?: 'auto-detect' | 'preserve-daily' | 'ai-daily-study'
          }

          if (!body.pdfPath) {
            sendJson(response, 400, { error: { errmsg: 'pdfPath is required.' } })
            return
          }

          await stat(body.pdfPath)
          const pageCount = await getPdfPageCount(body.pdfPath)
          const recommendation = recommendOcrChunking(pageCount, body.workflow)

          sendJson(response, 200, {
            ok: true,
            ...recommendation,
          })
        } catch (error) {
          sendJson(response, 500, {
            error: { errmsg: error instanceof Error ? error.message : 'Unable to recommend OCR chunking.' },
          })
        }
      })

      middlewares.use('/api/study-imports/import-masterlife', async (request, response) => {
        if (request.method !== 'POST') {
          sendJson(response, 405, { error: { errmsg: 'Method not allowed.' } })
          return
        }

        try {
          const body = await readJsonBody(request) as { textPath?: string; recordId?: string }
          if (!body.textPath) {
            sendJson(response, 400, { error: { errmsg: 'textPath is required.' } })
            return
          }

          await stat(body.textPath)

          const job = runStudyImportJob(
            'import',
            'MasterLife import',
            'node',
            [resolve(process.cwd(), 'scripts/import-masterlife-source.mjs'), body.textPath],
            parseImportProgress,
            (result) => {
              if (!body.recordId) return result
              const records = loadLibraryCatalog()
              const existing = records.find((entry) => entry.id === body.recordId)
              if (!existing) return result
              const updated = upsertLibraryRecord({
                ...existing,
                status: 'structured',
                updatedAt: new Date().toISOString(),
                workflow: 'preserve-daily',
                classification: 'daily-study',
              })
              return { ...result, recordId: updated.id }
            },
          )

          sendJson(response, 202, { ok: true, job })
        } catch (error) {
          sendJson(response, 500, {
            error: { errmsg: error instanceof Error ? error.message : 'MasterLife import failed.' },
          })
        }
      })

      middlewares.use('/api/study-imports/masterlife-source', async (_request, response) => {
        try {
          const sourcePath = resolve(process.cwd(), 'data/ocr/masterlife-book1-source.json')
          if (!existsSync(sourcePath)) {
            sendJson(response, 404, { error: { errmsg: 'No imported MasterLife source is available yet.' } })
            return
          }

          const payload = JSON.parse(readFileSync(sourcePath, 'utf8')) as Record<string, unknown>
          sendJson(response, 200, payload)
        } catch (error) {
          sendJson(response, 500, {
            error: { errmsg: error instanceof Error ? error.message : 'Unable to load imported MasterLife source.' },
          })
        }
      })

      middlewares.use('/api/discipleship/analyze-book', async (request, response) => {
        if (request.method !== 'POST') {
          sendJson(response, 405, { error: { errmsg: 'Method not allowed.' } })
          return
        }

        try {
          const body = await readJsonBody(request) as {
            title?: string
            textPath?: string
            workflow?: 'preserve-daily' | 'ai-daily-study' | 'auto-detect'
            recordId?: string
          }

          if (!body.title || !body.textPath) {
            sendJson(response, 400, { error: { errmsg: 'title and textPath are required.' } })
            return
          }

          await stat(body.textPath)
          const rawText = readFileSync(body.textPath, 'utf8')
          const workflow = body.workflow || 'auto-detect'
          const records = body.recordId ? loadLibraryCatalog() : []
          const existingRecord = body.recordId ? records.find((entry) => entry.id === body.recordId) : null
          const sourceOcrQuality = existingRecord ? summarizeOcrQuality(existingRecord) : null
          const readinessFailure = getImportReadinessFailure(rawText, sourceOcrQuality)
          if (readinessFailure) {
            sendJson(response, 422, { error: { errmsg: readinessFailure } })
            return
          }
          let localAnalysis = buildOwnedBookDailyPlan(body.title, rawText, workflow)
          localAnalysis = {
            ...localAnalysis,
            generatedPlan: attachDynamicStudyLayouts(
              enrichDailyPlanWithSourceText(localAnalysis.generatedPlan, rawText, body.title),
              body.title,
              localAnalysis.recommendedWorkflow,
              rawText,
            ),
          }
          const embeddedStructurePath = getEmbeddedStructurePath(body.textPath)
          if ((localAnalysis.generatedPlan.days?.length || 0) < 10 && embeddedStructurePath && existsSync(embeddedStructurePath)) {
            const embeddedText = readFileSync(embeddedStructurePath, 'utf8')
            const embeddedAnalysis = buildOwnedBookDailyPlan(body.title, embeddedText, workflow)
            if ((embeddedAnalysis.generatedPlan.days?.length || 0) > (localAnalysis.generatedPlan.days?.length || 0)) {
              localAnalysis = {
                ...embeddedAnalysis,
                generatedPlan: attachDynamicStudyLayouts(
                  enrichDailyPlanWithSourceText(embeddedAnalysis.generatedPlan, rawText, body.title),
                  body.title,
                  embeddedAnalysis.recommendedWorkflow,
                  rawText,
                ),
              }
            }
          }

          let classification = localAnalysis.classification
          let recommendedWorkflow = localAnalysis.recommendedWorkflow
          let summary = localAnalysis.summary
          let generatedPlan = localAnalysis.generatedPlan
          const localPreservedDaily = localAnalysis.recommendedWorkflow === 'preserve-daily'
            && (localAnalysis.generatedPlan.days?.length || 0) >= 10

          if (env.OPENAI_API_KEY && !localPreservedDaily) {
            const excerpt = normalizeBookText(rawText).replace(/\s+/g, ' ').trim().slice(0, 12000)
            const analysisResponse = await fetch('https://api.openai.com/v1/responses', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${env.OPENAI_API_KEY}`,
              },
              body: JSON.stringify({
                model: env.OPENAI_MODEL || 'gpt-4.1-mini',
                instructions: [
                  'You classify Christian study books for Chronicle.',
                  'Decide whether the source is already a daily study/devotional or a general book that should be transformed into a daily Bible-study workflow.',
                  'Return only valid JSON with keys: classification, recommendedWorkflow, summary, generatedPlan.',
                  'generatedPlan must include title, cadence, summary, and phases.',
                  'phases must be a short array of objects with label and emphasis.',
                  'Do not quote long portions of the source. Keep the summary concise.',
                ].join(' '),
                input: JSON.stringify({
                  title: body.title,
                  requestedWorkflow: workflow,
                  excerpt,
                }),
              }),
            })

            const analysisPayload = await analysisResponse.json() as {
              output_text?: string
              output?: Array<{ type?: string; role?: string; content?: Array<{ type?: string; text?: string }> }>
            }

            if (analysisResponse.ok) {
              const rawJson = extractOpenAIText(analysisPayload)
              if (rawJson) {
                const normalizedJson = rawJson
                  .replace(/^```json\s*/i, '')
                  .replace(/^```\s*/i, '')
                  .replace(/\s*```$/i, '')
                  .trim()
                const parsed = JSON.parse(normalizedJson) as {
                  classification?: 'daily-study' | 'general-book'
                  recommendedWorkflow?: 'preserve-daily' | 'ai-daily-study'
                  summary?: string
                  generatedPlan?: OwnedBookDailyPlan
                }
                const parsedClassification = String(parsed.classification || '').toLowerCase()
                const parsedWorkflow = String(parsed.recommendedWorkflow || '').toLowerCase()
                if (!localPreservedDaily) {
                  classification =
                    parsedClassification.includes('daily') && !parsedClassification.includes('general')
                      ? 'daily-study'
                      : parsedClassification.includes('general')
                        ? 'general-book'
                        : classification
                  recommendedWorkflow =
                    parsedWorkflow.includes('preserve')
                      ? 'preserve-daily'
                      : parsedWorkflow.includes('transform') || parsedWorkflow.includes('daily')
                        ? 'ai-daily-study'
                        : recommendedWorkflow
                }
                summary = localPreservedDaily ? localAnalysis.summary : parsed.summary || summary
                generatedPlan = localPreservedDaily
                  ? {
                      ...generatedPlan,
                      totalDays: localAnalysis.generatedPlan.totalDays,
                      daysPerWeek: localAnalysis.generatedPlan.daysPerWeek,
                      summary: localAnalysis.generatedPlan.summary,
                      phases: localAnalysis.generatedPlan.phases,
                      days: localAnalysis.generatedPlan.days,
                    }
                  : {
                      ...generatedPlan,
                      ...(parsed.generatedPlan || {}),
                      totalDays: localAnalysis.generatedPlan.totalDays,
                      daysPerWeek: localAnalysis.generatedPlan.daysPerWeek,
                      summary: localAnalysis.generatedPlan.summary,
                      phases: parsed.generatedPlan?.phases?.length ? parsed.generatedPlan.phases : generatedPlan.phases,
                      days: localAnalysis.generatedPlan.days,
                    }
              }
            }
          }

          generatedPlan = attachDynamicStudyLayouts(generatedPlan, body.title, recommendedWorkflow, rawText)
          generatedPlan = {
            ...generatedPlan,
            sourceDiagnostics: summarizePlanSourceDiagnostics(generatedPlan, sourceOcrQuality),
          }

          if (body.recordId) {
            const existing = existingRecord
            if (existing) {
              upsertLibraryRecord({
                ...existing,
                status: 'structured',
                updatedAt: new Date().toISOString(),
                workflow: recommendedWorkflow,
                classification,
                summary,
                generatedPlan,
                importDiagnostics: generatedPlan.sourceDiagnostics,
              })
            }
          }

          sendJson(response, 200, {
            ok: true,
            title: body.title,
            textPath: body.textPath,
            classification,
            recommendedWorkflow,
            summary,
            generatedPlan,
          })
        } catch (error) {
          sendJson(response, 500, {
            error: { errmsg: error instanceof Error ? error.message : 'Book analysis failed.' },
          })
        }
      })
  })
}

function buildChronicleInstructions(
  personaId: ChroniclePersonaId,
  agentMode: 'bible_study_agent' | 'discipleship_coach' | 'prayer_guide' | 'reflection_guide',
) {
  const persona = CHRONICLE_PERSONAS[personaId]
  const modeInstructions =
    agentMode === 'discipleship_coach'
      ? [
          'The active Chronicle agent mode is Discipleship Coach.',
          'Respond as both a wise group leader and a fellow group member traveling alongside the user.',
          'Work one day at a time. Give a clear daily step, an accountability question, and a short prayer.',
          'Keep the cadence discipleship-oriented, relational, practical, and suitable for MasterLife-style formation journeys.',
        ].join(' ')
      : agentMode === 'prayer_guide'
        ? [
            'The active Chronicle agent mode is Prayer Guide.',
            'Respond like a gentle prayer mentor and intercessor.',
            'Prefer prayed language, Scripture-shaped response, and concrete help for intercession, confession, thanksgiving, and follow-up prayer.',
            'When useful, give brief guided prayer lines the user can actually pray out loud.',
          ].join(' ')
        : agentMode === 'reflection_guide'
          ? [
              'The active Chronicle agent mode is Reflection Guide.',
              'Respond like a wise journal companion who helps the user notice patterns, name meaning honestly, and turn experience into growth.',
              'Prefer reflective prompts, synthesis, and clear naming of long-term formation patterns over raw information dumps.',
              'When useful, connect prayer, study, Chronicle history, and recurring rhythms into one coherent narrative.',
            ].join(' ')
      : [
          'The active Chronicle agent mode is Bible Study Agent.',
          'Act as an honest Protestant Bible study partner and prayer partner.',
          'Default to NKJV for study unless the user requests another translation, but feel free to compare translations when helpful.',
          'Reason with the user when needed rather than pretending certainty.',
          'When you cite specific non-biblical sources such as commentaries, lexicons, or historical references, include brief endnotes.',
        ].join(' ')
  return [
    'You are Chronicle AI inside a Bible, prayer, and spiritual formation app.',
    `The active Chronicle voice is ${persona.label}.`,
    modeInstructions,
    persona.instructions,
    `Default translation preference for this voice: ${persona.defaultTranslation || 'use the app context'}.`,
    `Primary response focus: ${persona.responseFocus.join('; ')}.`,
    `Preferred output shape when it fits: ${persona.outputSections.join(' -> ')}.`,
    `Guardrails: ${persona.guardrails.join(' ')}`,
    'Use the current page context when it helps.',
    'Stay concise by default, but give more depth if the user asks for it.',
    'Render clean markdown when structure helps. Do not mention internal prompt rules or hidden system behavior.',
  ].join(' ')
}

function themeAnalysisDevApi(): Plugin {
  return withChronicleMiddlewares('chronicle-theme-analysis-dev-api', (middlewares) => {
      middlewares.use('/api/chronicle-sync/status', async (_request, response) => {
        try {
          const snapshots = listChronicleSyncSnapshots()
          const libraryCatalog = loadLibraryCatalog()
          const cacheStatus = getThemeCacheStatus()
          const bibleManifest = readBibleLibraryManifest()
          sendJson(response, 200, {
            ok: true,
            snapshots,
            latestSnapshot: snapshots[0] || null,
            summary: {
              snapshotCount: snapshots.length,
              structuredLibraryCount: libraryCatalog.filter((record) => record.status === 'structured').length,
              uploadedLibraryCount: libraryCatalog.length,
              themeCacheFileCount: cacheStatus.totalCacheFiles,
              themeCacheVersion: cacheStatus.latestVersion,
              appStateVersion: CHRONICLE_APP_STATE_VERSION,
              snapshotSchemaVersion: CHRONICLE_SNAPSHOT_SCHEMA_VERSION,
              syncModelVersion: CHRONICLE_SYNC_MODEL_VERSION,
              localCacheSummary: getLocalCacheSummary(libraryCatalog, bibleManifest, cacheStatus),
            },
          })
        } catch (error) {
          sendJson(response, 500, {
            error: { errmsg: error instanceof Error ? error.message : 'Unable to load Chronicle sync status.' },
          })
        }
      })

      middlewares.use('/api/chronicle-sync/export', async (request, response) => {
        if (request.method !== 'POST') {
          sendJson(response, 405, { error: { errmsg: 'Method not allowed.' } })
          return
        }

        try {
          const body = await readJsonBody(request) as { appState?: Record<string, unknown> }
          if (!body.appState || typeof body.appState !== 'object') {
            sendJson(response, 400, { error: { errmsg: 'Snapshot export requires an appState payload.' } })
            return
          }

          const snapshot = createChronicleSyncSnapshot(body.appState)
          sendJson(response, 200, {
            ok: true,
            snapshot,
          })
        } catch (error) {
          sendJson(response, 500, {
            error: { errmsg: error instanceof Error ? error.message : 'Unable to create Chronicle snapshot.' },
          })
        }
      })

      middlewares.use('/api/chronicle-sync/import', async (request, response) => {
        if (request.method !== 'POST') {
          sendJson(response, 405, { error: { errmsg: 'Method not allowed.' } })
          return
        }

        try {
          const body = await readJsonBody(request) as {
            snapshot?: {
              id?: string
              createdAt?: string
              appState?: Record<string, unknown>
            }
          }
          if (!body.snapshot || typeof body.snapshot !== 'object') {
            sendJson(response, 400, { error: { errmsg: 'Snapshot import requires a snapshot payload.' } })
            return
          }

          const imported = importChronicleSyncSnapshot(body.snapshot)
          sendJson(response, 200, {
            ok: true,
            snapshot: {
              id: imported.id,
              createdAt: imported.createdAt,
              path: imported.path,
              byteSize: imported.byteSize,
              schemaVersion: imported.schemaVersion,
              appStateVersion: imported.appStateVersion,
              chronicleEntryCount: imported.chronicleEntryCount,
              prayerItemCount: imported.prayerItemCount,
              ownedBookCount: imported.ownedBookCount,
              scriptureBookmarkCount: imported.scriptureBookmarkCount,
            },
            appState: imported.appState,
          })
        } catch (error) {
          sendJson(response, 500, {
            error: { errmsg: error instanceof Error ? error.message : 'Unable to import Chronicle snapshot.' },
          })
        }
      })

      middlewares.use('/api/chronicle-sync/restore-latest', async (_request, response) => {
        try {
          const snapshots = listChronicleSyncSnapshots()
          const latest = snapshots[0]
          if (!latest) {
            sendJson(response, 404, { error: { errmsg: 'No Chronicle snapshots are available yet.' } })
            return
          }
          const payload = migrateChronicleSyncSnapshotPayload(readJsonFile<{
            id: string
            createdAt: string
            schemaVersion?: number
            appStateVersion?: number
            appState?: Record<string, unknown>
            libraryCatalog?: LibraryBookRecord[]
          }>(latest.path))
          sendJson(response, 200, {
            ok: true,
            snapshot: latest,
            appState: payload.appState || {},
          })
        } catch (error) {
          sendJson(response, 500, {
            error: { errmsg: error instanceof Error ? error.message : 'Unable to restore latest Chronicle snapshot.' },
          })
        }
      })

      middlewares.use('/api/chronicle-sync/restore', async (request, response) => {
        try {
          const base = request.headers.host ? `http://${request.headers.host}` : 'http://127.0.0.1'
          const snapshotId = new URL(request.url || '', base).searchParams.get('snapshotId')
          if (!snapshotId) {
            sendJson(response, 400, { error: { errmsg: 'A snapshotId query parameter is required.' } })
            return
          }

          const restored = loadChronicleSyncSnapshotById(snapshotId)
          if (!restored) {
            sendJson(response, 404, { error: { errmsg: `Snapshot ${snapshotId} was not found.` } })
            return
          }

          sendJson(response, 200, {
            ok: true,
            snapshot: restored.snapshot,
            appState: restored.appState,
          })
        } catch (error) {
          sendJson(response, 500, {
            error: { errmsg: error instanceof Error ? error.message : 'Unable to restore the requested Chronicle snapshot.' },
          })
        }
      })

      middlewares.use('/api/chronicle-sync/download-latest', async (_request, response) => {
        try {
          const latest = listChronicleSyncSnapshots()[0]
          if (!latest) {
            sendJson(response, 404, { error: { errmsg: 'No Chronicle snapshots are available yet.' } })
            return
          }
          sendJsonFile(response, latest.path, `${latest.id}.json`)
        } catch (error) {
          sendJson(response, 500, {
            error: { errmsg: error instanceof Error ? error.message : 'Unable to download the latest Chronicle snapshot.' },
          })
        }
      })

      middlewares.use('/api/chronicle-sync/download', async (request, response) => {
        try {
          const base = request.headers.host ? `http://${request.headers.host}` : 'http://127.0.0.1'
          const snapshotId = new URL(request.url || '', base).searchParams.get('snapshotId')
          if (!snapshotId) {
            sendJson(response, 400, { error: { errmsg: 'A snapshotId query parameter is required.' } })
            return
          }

          const restored = loadChronicleSyncSnapshotById(snapshotId)
          if (!restored) {
            sendJson(response, 404, { error: { errmsg: `Snapshot ${snapshotId} was not found.` } })
            return
          }

          sendJsonFile(response, restored.snapshot.path, `${restored.snapshot.id}.json`)
        } catch (error) {
          sendJson(response, 500, {
            error: { errmsg: error instanceof Error ? error.message : 'Unable to download the requested Chronicle snapshot.' },
          })
        }
      })

      middlewares.use('/api/bible-library/status', async (_request, response) => {
        try {
          const libraryManifest = readJsonFile<{
            translations: Array<{ id: string; label: string; basePath?: string; sourceLabel?: string; providerId?: string }>
          }>(getBibleLibraryManifestPath())
          const cacheStatus = getThemeCacheStatus()

          const translations = (libraryManifest.translations || []).map((entry) => {
            const manifestPath = getTranslationManifestPath(entry.basePath || '', entry.id.toLowerCase())
            const manifest = existsSync(manifestPath)
              ? readJsonFile<{ chapterCount?: number; books?: Array<unknown>; translation?: string | { shortName?: string; englishName?: string }; attribution?: string }>(manifestPath)
              : null
            const safeId = entry.id.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
            const chapterCount = Number(manifest?.chapterCount || 0)
            const cachedCount = cacheStatus.byTranslation[safeId] || 0
            const manifestTranslation = typeof manifest?.translation === 'string'
              ? manifest.translation
              : manifest?.translation?.shortName || manifest?.translation?.englishName || entry.id.toUpperCase()
            return {
              id: entry.id.toLowerCase(),
              label: entry.label,
              providerId: entry.providerId || `offline_${entry.id.toLowerCase()}`,
              sourceLabel: entry.sourceLabel || '',
              chapterCount,
              cachedCount,
              coveragePct: chapterCount > 0 ? Math.round((cachedCount / chapterCount) * 100) : 0,
              translation: manifestTranslation,
              attribution: manifest?.attribution || '',
            }
          })

          sendJson(response, 200, {
            ok: true,
            translations,
            cacheVersion: cacheStatus.latestVersion,
            totalCacheFiles: cacheStatus.totalCacheFiles,
          })
        } catch (error) {
          sendJson(response, 500, {
            error: { errmsg: error instanceof Error ? error.message : 'Bible library status request failed.' },
          })
        }
      })

      middlewares.use('/api/theme-analysis-cache/precompute', async (request, response) => {
        if (request.method !== 'POST') {
          sendJson(response, 405, { error: { errmsg: 'Method not allowed.' } })
          return
        }

        try {
          const body = await readJsonBody(request) as {
            translations?: string[]
            translation?: string
            overwrite?: boolean
            limit?: number
          }

          const libraryManifest = readJsonFile<{
            translations: Array<{ id: string; basePath?: string }>
          }>(resolve(process.cwd(), 'public', 'bibles', 'library', 'manifest.json'))

          const translationEntries = (libraryManifest.translations || [])
            .map((entry) => ({
              id: entry.id.toLowerCase(),
              basePath: entry.basePath || `/bibles/library/${entry.id.toLowerCase()}`,
            }))

          const requestedTranslations = (body.translations?.length ? body.translations : body.translation ? [body.translation] : [])
            .map((value) => value.toLowerCase())
          const translations = requestedTranslations.length > 0
            ? requestedTranslations
            : translationEntries.map((entry) => entry.id)

          const overwrite = Boolean(body.overwrite)
          const limit = Number.isFinite(body.limit) && Number(body.limit) > 0 ? Math.floor(Number(body.limit)) : Number.POSITIVE_INFINITY
          const results: Array<{ translation: string; generated: number; skipped: number; failed: number }> = []
          let processed = 0
          let limitReached = false

          for (const translation of translations) {
            const libraryEntry = translationEntries.find((entry) => entry.id === translation)
            const manifestPath = libraryEntry
              ? resolve(process.cwd(), 'public', libraryEntry.basePath.replace(/^\//, ''), 'manifest.json')
              : resolve(process.cwd(), 'public', 'bibles', 'library', translation, 'manifest.json')
            if (!existsSync(manifestPath)) {
              results.push({ translation, generated: 0, skipped: 0, failed: 1 })
              continue
            }

            const manifest = readJsonFile<{
              books: Array<{ id: string; commonName?: string; name: string; firstChapterNumber: number; lastChapterNumber: number }>
            }>(manifestPath)

            let generated = 0
            let skipped = 0
            let failed = 0

            for (const book of manifest.books || []) {
              for (let chapterNumber = book.firstChapterNumber; chapterNumber <= book.lastChapterNumber; chapterNumber += 1) {
                if (processed >= limit) {
                  limitReached = true
                  break
                }

                const bookName = book.commonName || book.name
                const cachePath = getThemeAnalysisCachePath(bookName, chapterNumber, translation)
                if (!overwrite && existsSync(cachePath)) {
                  skipped += 1
                  processed += 1
                  continue
                }

                try {
                  const chapterData = loadChapterFromLocalLibrary(translation, book.id, chapterNumber, libraryEntry?.basePath)
                  const studyEvidence = buildStudyEvidenceFromFiles(book.id, chapterNumber)
                  const themes = analyzeChapterThemes(bookName, chapterNumber, chapterData, studyEvidence)
                  const record: ThemeAnalysisCacheRecord = {
                    version: '2026-05-01-graph-v2',
                    book: bookName,
                    chapter: chapterNumber,
                    translation,
                    generatedAt: new Date().toISOString(),
                    themes,
                  }

                  mkdirSync(getThemeAnalysisCacheDir(), { recursive: true })
                  writeFileSync(cachePath, `${JSON.stringify(record, null, 2)}\n`, 'utf8')
                  generated += 1
                } catch {
                  failed += 1
                }
                processed += 1
              }
              if (limitReached) break
            }

            results.push({ translation, generated, skipped, failed })
            if (limitReached) break
          }

          sendJson(response, 200, { ok: true, results, processed, limit: Number.isFinite(limit) ? limit : null })
        } catch (error) {
          sendJson(response, 500, {
            error: { errmsg: error instanceof Error ? error.message : 'Theme analysis precompute failed.' },
          })
        }
      })

      middlewares.use('/api/theme-analysis-cache', async (request, response) => {
        try {
          if (request.method === 'GET') {
            const requestUrl = getRequestUrl(request)
            const book = requestUrl.searchParams.get('book')
            const chapter = Number.parseInt(requestUrl.searchParams.get('chapter') || '', 10)
            const translation = requestUrl.searchParams.get('translation')

            if (!book || !Number.isFinite(chapter) || !translation) {
              sendJson(response, 400, { error: { errmsg: 'Missing book, chapter, or translation query parameters.' } })
              return
            }

            const cachePath = getThemeAnalysisCachePath(book, chapter, translation)
            if (!existsSync(cachePath)) {
              sendJson(response, 404, { error: { errmsg: 'Theme analysis cache not found.' } })
              return
            }

            sendJson(response, 200, readJsonFile<ThemeAnalysisCacheRecord>(cachePath))
            return
          }

          if (request.method === 'POST') {
            const payload = await readJsonBody(request) as ThemeAnalysisCacheRecord
            if (!payload?.book || !payload?.chapter || !payload?.translation || !Array.isArray(payload?.themes)) {
              sendJson(response, 400, { error: { errmsg: 'Invalid theme analysis payload.' } })
              return
            }

            mkdirSync(getThemeAnalysisCacheDir(), { recursive: true })
            writeFileSync(
              getThemeAnalysisCachePath(payload.book, payload.chapter, payload.translation),
              `${JSON.stringify(payload, null, 2)}\n`,
              'utf8',
            )
            sendJson(response, 200, { ok: true })
            return
          }

          sendJson(response, 405, { error: { errmsg: 'Method not allowed.' } })
        } catch (error) {
          sendJson(response, 500, {
            error: { errmsg: error instanceof Error ? error.message : 'Theme analysis cache request failed.' },
          })
        }
      })
  })
}

function getApiBibleIds(env: Record<string, string>) {
  return [
    env.API_BIBLE_ID || env.VITE_API_BIBLE_ID,
    env.API_BIBLE_SECONDARY_ID,
    env.API_BIBLE_TERTIARY_ID,
  ].filter((id): id is string => Boolean(id))
}

function getPrimaryApiBibleId(env: Record<string, string>) {
  return getApiBibleIds(env)[0] || null
}

function getRequestUrl(request: IncomingMessage) {
  return new URL(request.url || '/', 'http://localhost')
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadChronicleEnv(mode)

  return {
    plugins: [react(), apiBibleDevApi(env), aiChatDevApi(env), voiceDevApi(env), studyImportsDevApi(env), themeAnalysisDevApi(), chronicleIntegrationDevApi()],
  }
})

function loadChronicleEnv(mode: string) {
  const root = process.cwd()
  return {
    ...loadEnv(mode, root, ''),
    ...readDotEnvFile(resolve(root, '.env.local')),
  }
}

function readDotEnvFile(path: string) {
  if (!existsSync(path)) return {}

  return readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .reduce<Record<string, string>>((values, line) => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) return values

      const separatorIndex = trimmed.indexOf('=')
      if (separatorIndex === -1) return values

      const key = trimmed.slice(0, separatorIndex).trim()
      let value = trimmed.slice(separatorIndex + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }

      values[key] = value
      return values
    }, {})
}

async function readJsonBody(request: IncomingMessage) {
  const chunks = []
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  const raw = Buffer.concat(chunks).toString('utf8')
  return raw ? JSON.parse(raw) : {}
}

function extractOpenAIText(payload: {
  output_text?: string
  output?: Array<{
    type?: string
    role?: string
    content?: Array<{
      type?: string
      text?: string
    }>
  }>
}) {
  if (payload.output_text) return payload.output_text

  for (const item of payload.output || []) {
    if (item.type !== 'message' || item.role !== 'assistant') continue
    const text = (item.content || [])
      .filter((content) => content.type === 'output_text' && typeof content.text === 'string')
      .map((content) => content.text?.trim() || '')
      .filter(Boolean)
      .join('\n\n')
    if (text) return text
  }

  return ''
}
