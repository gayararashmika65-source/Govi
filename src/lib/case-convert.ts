// Snake_case (Supabase/Postgres convention) ↔ camelCase (JS/Prisma convention)
// Used by the backend adapter so the existing frontend never has to change.

export function snakeToCamel<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(snakeToCamel) as unknown as T
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const camelKey = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    out[camelKey] = snakeToCamel(v)
  }
  return out as T
}

export function camelToSnake<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(camelToSnake) as unknown as T
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const snakeKey = k.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase())
    out[snakeKey] = camelToSnake(v)
  }
  return out as T
}
