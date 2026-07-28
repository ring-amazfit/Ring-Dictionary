import { register } from 'node:module'
register(new URL('./loader.mjs', import.meta.url).href, import.meta.url)
const engine = (await import('../utils/dict-engine.js')).default

engine.init()
console.log('isReady=', engine.isReady, 'fd=', engine.fd, 'debug=', engine.debugMsg)

const arr = engine._readBlock(0)
console.log('readBlock(0) len=', arr ? arr.length : 0)
if (arr) {
  const s = engine._bufToStr(arr, 0, 160)
  console.log('first 160 chars:', JSON.stringify(s))
}

const lu = engine.lookup('apple')
console.log('lookup(apple)=', lu ? JSON.stringify(lu).slice(0, 300) : lu)

const se = engine.search('apple')
console.log('search(apple)=', JSON.stringify(se)?.slice(0, 300))

const sc = engine.searchChinese('学习')
console.log('searchChinese(学习) len=', sc.length, JSON.stringify(sc).slice(0, 300))
