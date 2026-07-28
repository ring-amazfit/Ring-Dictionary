// Node-only stub for @zos/fs used by tools/profile-io.mjs.
// Counts every readSync call + total bytes so we can see what a search costs
// on-device (Zepp OS asset readSync is synchronous and slow per call).
import { openSync, readSync as nodeRead } from 'node:fs'
import { fileURLToPath } from 'node:url'

const ASSETS = fileURLToPath(new URL('../assets/common/', import.meta.url))
const handles = new Map()
let counter = 0

globalThis.__ioProfile = { calls: 0, bytes: 0, perCall: [] }

export function openAssetsSync({ path }) {
  const full = ASSETS + path
  const fp = openSync(full, 'r')
  const fd = ++counter
  handles.set(fd, { fp, path })
  return fd
}

export function readSync({ fd, buffer, options }) {
  const h = handles.get(fd)
  if (!h) return 0
  const offset = options?.offset ?? 0
  const length = options?.length ?? 0
  const position = options?.position ?? 0
  const tmp = Buffer.alloc(length)
  let n = 0
  try {
    // Node 26 移除了 5 参数 (fd,buffer,offset,length,position) 形式，必须用 options 对象。
    n = nodeRead(h.fp, tmp, { offset: 0, length, position })
  } catch (e) {
    n = 0
  }
  if (n > 0) {
    const view = new Uint8Array(buffer, offset, n)
    view.set(tmp.subarray(0, n))
  }
  globalThis.__ioProfile.calls++
  globalThis.__ioProfile.bytes += Math.max(0, n)
  globalThis.__ioProfile.perCall.push(Math.max(0, n))
  return n
}
