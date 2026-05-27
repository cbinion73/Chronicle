const args = process.argv.slice(2)

const getArgValue = (name) => {
  const direct = args.find((arg) => arg.startsWith(`${name}=`))
  if (direct) return direct.slice(name.length + 1)
  const index = args.indexOf(name)
  if (index >= 0) return args[index + 1]
  return null
}

const host = getArgValue('--host') || process.env.CHRONICLE_THEME_HOST || 'http://127.0.0.1:5174'
const overwrite = args.includes('--overwrite')
const limitRaw = getArgValue('--limit')
const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined

const translations = args
  .filter((arg) => arg.startsWith('--translation='))
  .map((arg) => arg.split('=')[1])

const translationFlag = getArgValue('--translation')
if (translationFlag) translations.push(translationFlag)

const payload = {
  overwrite,
  limit: Number.isFinite(limit) ? limit : undefined,
  translations: translations.length > 0 ? Array.from(new Set(translations.map((value) => value.toLowerCase()))) : undefined,
}

const response = await fetch(`${host.replace(/\/$/, '')}/api/theme-analysis-cache/precompute`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
})

const result = await response.json()

if (!response.ok) {
  console.error(JSON.stringify(result, null, 2))
  process.exit(1)
}

console.log(JSON.stringify(result, null, 2))
