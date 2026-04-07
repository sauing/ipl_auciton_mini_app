import { playerNameMap } from './playerNameMap'

function cleanPlayerName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\(c\)|\(wk\)|\(w\/k\)|\(captain\)|\(keeper\)/gi, '')
    .replace(/\./g, '')
    .replace(/,/g, ' ')
    .replace(/['`]/g, '')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizePlayerName(name) {
  if (!name) return ''

  const cleaned = cleanPlayerName(name)

  return playerNameMap[cleaned] || cleaned
}