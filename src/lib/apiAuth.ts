const STORAGE_KEY = 'chronicle.apiToken'
const COOKIE_NAME = 'chronicle_api_token'

export function getStoredApiToken(): string {
  try {
    return localStorage.getItem(STORAGE_KEY)?.trim() || ''
  } catch {
    return ''
  }
}

export function setStoredApiToken(token: string) {
  const trimmed = token.trim()
  try {
    if (trimmed) localStorage.setItem(STORAGE_KEY, trimmed)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // localStorage unavailable (private mode) — cookie below still covers the session
  }
  syncTokenCookie(trimmed)
}

// <img>/<iframe> requests can't carry an Authorization header, so the server also
// accepts the token from this same-origin cookie.
function syncTokenCookie(token: string) {
  if (token) {
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(token)}; path=/; SameSite=Lax`
  } else {
    document.cookie = `${COOKIE_NAME}=; path=/; SameSite=Lax; Max-Age=0`
  }
}

function isApiRequest(input: RequestInfo | URL): boolean {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
  return url.startsWith('/api/') || url.startsWith(`${window.location.origin}/api/`)
}

// Chronicle fires several /api requests in parallel on page load (entries,
// prayers, rhythms, bookmarks, owned books all fetch at once). Without this
// lock, a fresh browser with no stored token gets a 401 on all of them
// simultaneously, and each one independently pops its own window.prompt() —
// so entering the token once doesn't stop the next four prompts from firing
// right after. This makes every concurrent 401 share the same one prompt.
let pendingPrompt: Promise<string> | null = null

function promptForToken(): Promise<string> {
  if (!pendingPrompt) {
    pendingPrompt = Promise.resolve()
      .then(() => {
        const entered = window.prompt(
          'This Chronicle server requires an API token (CHRONICLE_API_TOKEN). Paste it to continue:',
        )
        const trimmed = entered?.trim() || ''
        if (trimmed) setStoredApiToken(trimmed)
        return trimmed
      })
      .finally(() => {
        pendingPrompt = null
      })
  }
  return pendingPrompt
}

/**
 * Wraps window.fetch so every same-origin /api request carries the Chronicle API
 * token. When the server rejects with 401 (CHRONICLE_API_TOKEN is set there but we
 * have no matching token), the user is prompted once — even if several requests
 * hit the 401 at the same time — and every one of them retries with the result.
 */
export function installApiAuth() {
  const originalFetch = window.fetch.bind(window)

  syncTokenCookie(getStoredApiToken())

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    if (!isApiRequest(input)) return originalFetch(input, init)

    const send = (token: string) => {
      const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined))
      if (token) headers.set('Authorization', `Bearer ${token}`)
      return originalFetch(input, { ...init, headers })
    }

    let response = await send(getStoredApiToken())
    if (response.status === 401) {
      const entered = await promptForToken()
      if (entered) {
        response = await send(entered)
      }
    }
    return response
  }
}
