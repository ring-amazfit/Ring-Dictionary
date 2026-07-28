// Node-only stub for @zos/storage used by route-cache regression tests.
const values = new Map()

export const sessionStorage = {
  getItem(key) {
    return values.has(key) ? values.get(key) : null
  },
  setItem(key, value) {
    values.set(key, String(value))
  },
  removeItem(key) {
    values.delete(key)
  },
  clear() {
    values.clear()
  }
}

export const localStorage = {
  getItem(key) {
    return values.has(key) ? values.get(key) : null
  },
  setItem(key, value) {
    values.set(key, String(value))
  },
  removeItem(key) {
    values.delete(key)
  },
  clear() {
    values.clear()
  }
}
