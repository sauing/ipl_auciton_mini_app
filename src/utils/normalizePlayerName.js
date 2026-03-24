import { playerNameMap } from './playerNameMap'

export function normalizePlayerName(name) {
  if (!name) return ''

  const cleaned = name
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\./g, '')
    .toLowerCase()

  return playerNameMap[cleaned] || cleaned
}