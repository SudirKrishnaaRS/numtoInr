import { useEffect, useState } from 'react'

function read(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key)
    return raw == null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

/** useState that mirrors to localStorage. Survives private windows by falling back to memory. */
export function useLocalStorage(key, fallback) {
  const [value, setValue] = useState(() => read(key, fallback))
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* storage unavailable: keep in-memory state only */
    }
  }, [key, value])
  return [value, setValue]
}
