import { openAssetsSync, readSync } from '@zos/fs'
import prefixIndex, { DICT_SIZE } from './prefix-index'
import { SUPPLEMENT_DATA } from './supplement-data'

// 调试：统计物理 readSync 次数（实机搜索瓶颈诊断用，发布版会移除）。
var __devReads = 0
function _devReset() { __devReads = 0 }
function _devGet() { return __devReads }

var DICT_PATH = 'dic/txtTrans_1.0.txt'
var SUPP_PATH = 'dic/supplement.txt'
var CN_INV_PATH = 'dic/cn-inv.bin'      // binary Chinese inverted index (char -> offsets into DICT)
var BLOCK_SIZE = 262144      // chars per read window (512KB) — minimize sync reads
// SAFE memory ceiling. The whole 1.69MB dict OOMs low-memory watches, so keep
// only one 512KB window resident. This preserves the previous hard ceiling while
// reducing scattered Chinese entry reads. Never raise it without device testing.
var MAX_BLOCKS = 1
var CN_INV_HDR = 12                       // magic(4) + u32 N + u32 postingsStart
var CN_INV_READ_SIZE = 229376             // 224KB: table + frequent Chinese postings in one read
var MAX_SUGGESTIONS = 8
var MAX_WORD_FAMILY = 20
var CN_MAX_RESULTS = 20
// Hard cap on how many inverted-index postings we EXAMINE for a multi-char
// Chinese query. Unbounded scanning of a common rarest-char's postings (e.g. 的/是)
// used to perform thousands of readSync -> watchdog reboot. Capped so a search can
// never exceed this many entry reads regardless of the query.
var CN_SCAN_CAP = 150
var MAX_CACHE_SIZE = 64                    // bounded result caches — avoid retaining large Chinese definitions
var MAX_SCAN_CHARS = 260000   // enough to cover the largest single-letter section

var EN_CACHE = {}
var CN_CACHE = {}

// Simple LRU: getCached bumps recency; setCached evicts the least-recently used.
// Results are treated as immutable app data (consumers serialize them through the
// router as JSON), so we do NOT deep-clone — that was the single biggest needless
// CPU/GC cost on-device (30 large Chinese strings cloned twice per query).
function getCached(map, key, order) {
  var v = map[key]
  if (v === undefined) return null
  if (order) {
    var idx = order.indexOf(key)
    if (idx >= 0 && idx !== order.length - 1) {
      order.splice(idx, 1)
      order.push(key)
    }
  }
  return v
}

function setCached(map, key, value, order, limit) {
  if (!key) return
  if (map[key] === undefined) order.push(key)
  else {
    var idx = order.indexOf(key)
    if (idx >= 0) { order.splice(idx, 1); order.push(key) }
  }
  map[key] = value
  while (order.length > limit) {
    var expired = order.shift()
    delete map[expired]
  }
}

function normalizeWord(word) {
  return (word || '').toLowerCase().trim()
}

function containsChinese(text) {
  return /[一-鿿]/.test(text || '')
}

// 大小写不敏感字符比较：只对 A-Z 做小写化，绝不修改非字母字符。
// `| 32` 对非字母会产生污染（如全角逗号 U+FF0C 变成 U+FF2C），导致
// 含标点/空格/中文的词条永远无法精确匹配。
function charEq(buf, idx, code) {
  var c = buf[idx]
  if (c >= 65 && c <= 90) c |= 32
  var q = code
  if (q >= 65 && q <= 90) q |= 32
  return c === q
}

// 纯字母目标（不含空格/标点）。词典文件对纯字母词按字母序排列，但对含空格
// 的词条排序并不遵循 ASCII（空格排在字母之后），因此 isPast 只对纯字母目标
// 可靠；含空格/标点的目标禁用 isPast 提前退出，改由安全上限终止扫描。
function isLetterTarget(target) {
  return /^[a-z]+$/.test(target || '')
}

// True when the word in `buf` (first `wLen` chars) is alphabetically past
// `target` and therefore no more prefix matches are possible. Compares only
// the first `tLen` chars so single-character queries (tLen=1) work correctly
// — the previous c1-based check broke immediately for any 1-char query.
// NOTE: the `| 32` lowercase trick only applies to A-Z; applying it to
// non-letters (space, backslash, Chinese) corrupts the value and can make a
// normal word look "past" the target, aborting the scan early (e.g. the
// dict entry `al\nadj` whose backslash became `|` > 'o').
function isPast(buf, wLen, target, tLen) {
  if (wLen < tLen) return false
  for (var k = 0; k < tLen; k++) {
    var raw = buf[k]
    var wc = raw >= 65 && raw <= 90 ? raw | 32 : raw
    var qc = target.charCodeAt(k)
    if (wc > qc) return true
    if (wc < qc) return false
  }
  return false
}

// 词典源数据中少数词行含字面反斜杠（如 al\nadj、\nadj），属于导出损坏。
// 这类“词”用户无法输入，也绝不能作为搜索结果/建议返回。
function isCleanWord(w) {
  return !!(w && w.indexOf('\\') === -1)
}

function uniquePush(list, item, keyMap) {
  if (!item || !item.word || !isCleanWord(item.word) || keyMap[item.word]) return
  keyMap[item.word] = true
  list.push(item)
}

// 轻量模糊匹配：允许查询词字符按顺序出现在单词中，中间可跳过字符。
// 只在前缀/精确匹配没有结果时作为兜底，避免每次正常搜索都增加额外扫描。
function isFuzzyMatch(wordBuf, wordLen, target) {
  if (!target || target.length < 3 || wordLen < target.length) return false
  var ti = 0
  for (var wi = 0; wi < wordLen && ti < target.length; wi++) {
    if (charEq(wordBuf, wi, target.charCodeAt(ti))) ti++
  }
  return ti === target.length
}

// Choose the best byte offset to start scanning from.
// 2-letter prefix is tightest; fall back to 1-letter (always present).
// This guarantees we never scan the whole file from offset 0.
// 词典把撇号开头的词（如 'll、're）按去掉撇号后的字母归入对应字母区，
// 因此前缀选择要先跳过开头的非字母字符，否则只能从 0 全扫并撞上限。
function pickStartOffset(target) {
  var t = target
  var i = 0
  while (i < t.length && !(t.charCodeAt(i) >= 97 && t.charCodeAt(i) <= 122)) i++
  if (i > 0) t = t.slice(i)
  if (t.length >= 2) {
    var two = prefixIndex[t.slice(0, 2)]
    if (two !== undefined) return two
  }
  var one = prefixIndex[t.charAt(0)]
  if (one !== undefined) return one
  return 0
}

function DictEngine() {
  this.fd = null
  this.debugMsg = ''
  this.isReady = false
  this._wBuf = new Uint16Array(128)
  this._dBuf = new Uint16Array(512)
  this._entryBuf = new Uint16Array(2048)   // reused for reading a word+definition entry
  this._blockCache = {}                    // window-aligned bytePos -> Uint16Array (LRU)
  this._blockCacheOrder = []
  this._supp = null
  this._suppWordMap = null
  this._cnInvFd = null
  this._cnInvBytes = null
  this._cnInvBytesLength = 0
  this._cnInvTable = null
  this._cnInvN = 0
  this._cnInvPostingsStart = 0
  this._cnInvReady = false
  this._lookupCache = {}
  this._lookupCacheOrder = []
  this._enCache = EN_CACHE
  this._enCacheOrder = []
  this._cnCache = CN_CACHE
  this._cnCacheOrder = []
  this.lastReads = 0
}

DictEngine.prototype.init = function() {
  if (this.isReady) return true
  try {
    this.fd = openAssetsSync({ path: DICT_PATH })
    if (!this.fd) { this.debugMsg = 'fd_err'; return false }
    this.isReady = true
    return true
  } catch (e) {
    this.debugMsg = 'ex:' + (e.message || '?')
    return false
  }
}

// NOTE: a prior "background warmup" that eagerly pre-loaded letter sections into
// RAM was REMOVED — on low-memory watches the 1MB it grabbed at app-open caused
// OOM (black screen / reboot). Caching is now strictly lazy and capped by
// MAX_BLOCKS, so memory only grows as searches actually happen.

// 启动期轻量预热(由 home 页 onInit 调用):只加载 supplement(7KB,456 常用词),
// 不预读 1.69MB 主字典块,也不预加载中文倒排索引表(~200KB 常驻)。
// 收益:常用英文词首次搜索命中 _suppWordMap → 0-readSync 返回(真毫秒级);
//      supplement 在内存里是 7KB 字符串,微小,不构成 OOM 风险。
// 注意:绝对不能在这里预读字典块或大表——重蹈历史 OOM 覆辙(注释见上方)。
//       cn-inv 表保持惰性加载(首次中文搜索时按需 _ensureCnInv),不让启动期承担额外常驻内存。
DictEngine.prototype.warmup = function() {
  if (!this.isReady && !this.init()) return false
  try { this._loadSupp() } catch (e) {}
  return true
}

DictEngine.prototype._setCache = function(map, key, value, order, limit) {
  setCached(map, key, value, order, limit)
}

DictEngine.prototype._getCache = function(map, key, order) {
  return getCached(map, key, order)
}

// Read one window (BLOCK_SIZE chars = 128KB) of the main dict, aligned to a
// window boundary, with an LRU cache. Zepp OS asset readSync is slow per call,
// so a larger window reduces the number of synchronous reads without holding
// the whole 1.69MB dict in RAM (which OOMs low-memory watches). The cache keeps
// recently-read windows resident within the same 512KB memory ceiling.
DictEngine.prototype._readBlock = function(bytePos) {
  var win = Math.floor(bytePos / (BLOCK_SIZE * 2)) * (BLOCK_SIZE * 2)
  var cached = this._blockCache[win]
  if (cached) {
    var idx = this._blockCacheOrder.indexOf(win)
    if (idx >= 0 && idx !== this._blockCacheOrder.length - 1) {
      this._blockCacheOrder.splice(idx, 1)
      this._blockCacheOrder.push(win)
    }
    return cached
  }
  try {
    var arr = new Uint16Array(BLOCK_SIZE)
    __devReads++; var len = readSync({
      fd: this.fd,
      buffer: arr.buffer,
      options: { offset: 0, length: BLOCK_SIZE * 2, position: win }
    })
    if (!len || len <= 0) return null
    this._blockCache[win] = arr
    this._blockCacheOrder.push(win)
    while (this._blockCacheOrder.length > MAX_BLOCKS) {
      var old = this._blockCacheOrder.shift()
      delete this._blockCache[old]
    }
    return arr
  } catch (e) {
    return null
  }
}

DictEngine.prototype._bufToStr = function(buf, start, end) {
  var len = end - start
  if (len <= 0) return ''
  // 批量转换:一次 apply 处理一整段,比旧的"逐字符 push + join"快数倍 ——
  // 省掉 N 次 String.fromCharCode 调用、1 个临时数组、N 个单字符 string 分配。
  // chunk=4096 严守 apply 参数上限(实际入参最长 scratch=2048,通常走 fast path)。
  // subarray 是零拷贝视图,不新开 buffer。
  if (len <= 4096) {
    return String.fromCharCode.apply(null, buf.subarray(start, end))
  }
  var out = ''
  for (var i = start; i < end; i += 4096) {
    var segEnd = i + 4096
    if (segEnd > end) segEnd = end
    out += String.fromCharCode.apply(null, buf.subarray(i, segEnd))
  }
  return out
}

// Decode a raw byte array (UTF-8) into a JS string. Used by supplement loader.
DictEngine.prototype._decodeUtf8 = function(raw) {
  var text = ''
  var i = 0
  while (i < raw.length) {
    var b = raw[i]
    if (b < 0x80) {
      text += String.fromCharCode(b)
      i++
    } else if ((b & 0xE0) === 0xC0 && i + 1 < raw.length) {
      text += String.fromCharCode(((b & 0x1F) << 6) | (raw[i + 1] & 0x3F))
      i += 2
    } else if ((b & 0xF0) === 0xE0 && i + 2 < raw.length) {
      text += String.fromCharCode(((b & 0x0F) << 12) | ((raw[i + 1] & 0x3F) << 6) | (raw[i + 2] & 0x3F))
      i += 3
    } else {
      i++
    }
  }
  return text
}

DictEngine.prototype._loadSupp = function() {
  if (this._supp !== null) return
  // supplement 作为编译期数据内置，避免首搜再触发一次高延迟资源 readSync。
  // supplement.txt 仍保留为可编辑源文件，tools/build-supplement.mjs 可重新生成本模块。
  this._supp = SUPPLEMENT_DATA
  this._suppWordMap = {}
  for (var i = 0; i < this._supp.length; i++) {
    this._suppWordMap[this._supp[i].w] = this._supp[i]
  }
}

// ---- English / prefix lookup over the main dictionary ----

DictEngine.prototype.lookup = function(word) {
  if (!this.isReady && !this.init()) return null
  _devReset()

  var target = normalizeWord(word)
  if (target.length === 0) return null

  var cached = this._getCache(this._lookupCache, target, this._lookupCacheOrder)
  if (cached) return cached

  var startOff = pickStartOffset(target)

  var tLen = target.length
  var tC0 = target.charCodeAt(0)
  var tC1 = tLen >= 2 ? target.charCodeAt(1) : 0

  var wBuf = this._wBuf
  var dBuf = this._dBuf
  var wLen = 0
  var dLen = 0
  var inWord = true
  var found = null
  var matches = []

  var blockByte = Math.floor(startOff / (BLOCK_SIZE * 2)) * (BLOCK_SIZE * 2)
  var arr = this._readBlock(blockByte)
  if (!arr) { this.debugMsg = 'IO'; return null }

  var blkIdx = (startOff - blockByte) / 2
  var safety = 0

  while (safety < MAX_SCAN_CHARS) {
    safety++

    if (blkIdx >= arr.length) {
      blockByte += BLOCK_SIZE * 2
      arr = this._readBlock(blockByte)
      if (!arr || arr.length === 0) break
      blkIdx = 0
    }

    var ch = arr[blkIdx]
    blkIdx++

    if (ch === 10) {
      if (inWord) {
        inWord = false
      } else {
        // 只有已经找到前缀候选时才能用字典排序提前结束。
        // 没有候选时要保留有限扫描窗口给英文模糊匹配（如 nien → nine）。
        // 含空格/标点的目标禁用 isPast（词典排序不遵循 ASCII），靠上限终止。
        if (isLetterTarget(target) && isPast(wBuf, wLen, target, tLen) && (matches.length > 0 || target.length < 3)) break

        if (wLen === tLen) {
          var exact = true
          for (var k0 = 0; k0 < tLen; k0++) {
            if (!charEq(wBuf, k0, target.charCodeAt(k0))) { exact = false; break }
          }
          if (exact) found = { word: this._bufToStr(wBuf, 0, wLen), definition: this._bufToStr(dBuf, 0, dLen) }
        }

        if (matches.length < 8) {
          var sw = wLen >= tLen
          if (sw) {
            for (var k1 = 0; k1 < tLen; k1++) {
              if (!charEq(wBuf, k1, target.charCodeAt(k1))) { sw = false; break }
            }
          }
          if (sw) {
            var wStr = this._bufToStr(wBuf, 0, wLen)
            if (isCleanWord(wStr) && (!found || wStr !== found.word)) {
              matches.push({ word: wStr, definition: this._bufToStr(dBuf, 0, dLen) })
            }
          }
        }

        // 无精确/前缀结果时，在同一次窗口扫描中收集有限模糊候选，
        // 避免扫描结束后再次从同一 offset 读取和解析一遍词库。
        if (!found && matches.length === 0 && target.length >= 3 && isFuzzyMatch(wBuf, wLen, target)) {
          var fuzzyWord = this._bufToStr(wBuf, 0, wLen)
          if (isCleanWord(fuzzyWord)) matches.push({ word: fuzzyWord, definition: this._bufToStr(dBuf, 0, dLen) })
        }
        if (found || matches.length >= 4) break
        wLen = 0
        dLen = 0
        inWord = true
      }
    } else {
      if (inWord) {
        if (wLen < 128) wBuf[wLen++] = ch
      } else {
        if (dLen < 512) dBuf[dLen++] = ch
      }
    }
  }

  var allMatches = matches.slice(0, 4)
  var existingWords = {}
  if (found) existingWords[found.word] = true
  for (var mi = 0; mi < allMatches.length; mi++) existingWords[allMatches[mi].word] = true

  // supplement: exact + prefix matches
  this._loadSupp()
  var suppDirect = this._suppWordMap && this._suppWordMap[target] ? this._suppWordMap[target] : null
  if (suppDirect && !found) found = { word: suppDirect.w, definition: suppDirect.d }
  if (this._supp) {
    for (var si = 0; si < this._supp.length && allMatches.length < MAX_SUGGESTIONS; si++) {
      var entry = this._supp[si]
      if (existingWords[entry.w]) continue
      if (entry.w === target) continue
      if (entry.w.indexOf(target) === 0) {
        allMatches.push({ word: entry.w, definition: entry.d })
        existingWords[entry.w] = true
      }
    }
  }

  // 同词根族单独扫描 word 行，不解码释义，最多读取 20 个前缀词。
  // 这样 play 能得到 player/playful，同时不把一次搜索变成全词库释义扫描。
  var family = this._prefixFamily(target, MAX_WORD_FAMILY)
  for (var fi = 0; fi < family.length; fi++) {
    if (!existingWords[family[fi].word]) {
      allMatches.push(family[fi])
      existingWords[family[fi].word] = true
    }
  }

  allMatches.sort(function(a, b) {
    var sa = scoreEnglish(a.word, target)
    var sb = scoreEnglish(b.word, target)
    return sa - sb || a.word.length - b.word.length
  })

  var finalResult
  if (found) {
    finalResult = { word: found.word, definition: found.definition, suggestions: allMatches }
  } else if (allMatches.length > 0) {
    finalResult = { word: target, definition: '未找到释义', suggestions: allMatches }
  } else {
    finalResult = { word: target, definition: '未找到释义', suggestions: [] }
  }

  this._setCache(this._lookupCache, target, finalResult, this._lookupCacheOrder, MAX_CACHE_SIZE)
  this.lastReads = _devGet()
  return finalResult
}

DictEngine.prototype._prefixFamily = function(target, limit) {
  var out = []
  if (!this.isReady && !this.init()) return out
  var seen = {}
  var startOff = pickStartOffset(target)
  var wBuf = this._wBuf
  var wLen = 0
  var inWord = true
  var blockByte = Math.floor(startOff / (BLOCK_SIZE * 2)) * (BLOCK_SIZE * 2)
  var arr = this._readBlock(blockByte)
  if (!arr) return out
  var blkIdx = (startOff - blockByte) / 2
  var safety = 0
  while (safety < 260000 && out.length < limit) {
    safety++
    if (blkIdx >= arr.length) {
      blockByte += BLOCK_SIZE * 2
      arr = this._readBlock(blockByte)
      if (!arr || arr.length === 0) break
      blkIdx = 0
    }
    var ch = arr[blkIdx++]
    if (ch === 10) {
      if (inWord) {
        inWord = false
      } else {
        if (isLetterTarget(target) && isPast(wBuf, wLen, target, target.length)) break
        var ok = wLen >= target.length
        for (var k = 0; ok && k < target.length; k++) {
          if (!charEq(wBuf, k, target.charCodeAt(k))) ok = false
        }
        if (ok) {
          var word = this._bufToStr(wBuf, 0, wLen)
          if (isCleanWord(word) && !seen[word]) {
            seen[word] = true
            out.push({ word: word, definition: '' })
          }
        }
        wLen = 0
        inWord = true
      }
    } else if (inWord && wLen < 128) {
      wBuf[wLen++] = ch
    }
  }
  return out
}
function scoreEnglish(word, query) {
  if (!word) return 999
  if (word === query) return 0
  if (word.indexOf(query) === 0) return 1
  if (word.indexOf(query) !== -1) return 2
  return 3
}

// ---- Chinese search via the binary inverted index (seek-based, no full scan) ----

DictEngine.prototype._ensureCnInv = function() {
  if (this._cnInvReady) return true
  try {
    this._cnInvFd = openAssetsSync({ path: CN_INV_PATH })
    if (!this._cnInvFd) return false
    // 224KB 覆盖字符表及高频/常用的 posting 区段；例如“学习”的“习”(59KB)
    // 与“学”(223KB)都可一次读入，省去两次高延迟 readSync。该缓冲常驻
    // 224KB，配合一个 512KB 主词库窗口，仍远低于曾导致 OOM 的整本加载。
    var indexBytes = new Uint8Array(CN_INV_READ_SIZE)
    __devReads++; var indexLen = readSync({
      fd: this._cnInvFd,
      buffer: indexBytes.buffer,
      options: { offset: 0, length: indexBytes.length, position: 0 }
    })
    if (!indexLen || indexLen < CN_INV_HDR) return false
    this._cnInvN = indexBytes[4] | (indexBytes[5] << 8) | (indexBytes[6] << 16) | (indexBytes[7] << 24)
    this._cnInvPostingsStart = indexBytes[8] | (indexBytes[9] << 8) | (indexBytes[10] << 16) | (indexBytes[11] << 24)
    var tblLen = this._cnInvN * 8
    if (indexLen < CN_INV_HDR + tblLen) return false
    this._cnInvBytes = indexBytes
    this._cnInvBytesLength = indexLen
    this._cnInvTable = indexBytes.subarray(CN_INV_HDR, CN_INV_HDR + tblLen)
    this._cnInvReady = true
    return true
  } catch (e) {
    return false
  }
}

// binary search the in-memory char table for a codepoint
DictEngine.prototype._findChar = function(cp) {
  var tbl = this._cnInvTable
  var lo = 0
  var hi = this._cnInvN - 1
  while (lo <= hi) {
    var mid = (lo + hi) >> 1
    var base = mid * 8
    var c = tbl[base] | (tbl[base + 1] << 8)
    if (c === cp) {
      var count = tbl[base + 2] | (tbl[base + 3] << 8)
      var postOff = tbl[base + 4] | (tbl[base + 5] << 8) | (tbl[base + 6] << 16) | (tbl[base + 7] << 24)
      return { count: count, postOff: postOff }
    }
    if (c < cp) lo = mid + 1
    else hi = mid - 1
  }
  return null
}

// read up to `limit` posting offsets (u24 LE) from the inverted-index file
DictEngine.prototype._readPostings = function(postOff, count, limit) {
  var n = count < limit ? count : limit
  if (n <= 0) return []
  var bytes = n * 3
  var b
  // 优先使用首次索引读取中已带入内存的 posting，避免额外同步 I/O。
  if (this._cnInvBytes && postOff >= 0 && postOff + bytes <= this._cnInvBytesLength) {
    b = this._cnInvBytes.subarray(postOff, postOff + bytes)
  } else {
    b = new Uint8Array(bytes)
    __devReads++; readSync({ fd: this._cnInvFd, buffer: b.buffer, options: { offset: 0, length: bytes, position: postOff } })
  }
  var offs = []
  for (var i = 0; i < n; i++) {
    offs.push(b[i * 3] | (b[i * 3 + 1] << 8) | (b[i * 3 + 2] << 16))
  }
  return offs
}

// read the word + definition entry starting at a byte offset in the main dict,
// using the same windowed reader as lookup (no whole-file RAM load).
// IMPORTANT: we scan the raw Uint16Array directly for the two newlines and only
// convert the tiny matched slice (word + def) to a string. The previous version
// built a full 64KB string per readSync and ran String.fromCharCode ~1M times per
// Chinese search — that was a large hidden CPU cost on top of the I/O latency.
DictEngine.prototype._readEntryAt = function(wordOff) {
  try {
    var scratch = this._entryBuf        // Uint16Array(2048), reused across calls
    var collected = 0
    var nl1 = -1
    var nl2 = -1
    var winByte = Math.floor(wordOff / (BLOCK_SIZE * 2)) * (BLOCK_SIZE * 2)
    var fromChar = (wordOff / 2) - (winByte / 2)
    var guard = 0
    while (guard < 8 && nl2 < 0) {
      guard++
      var arr = this._readBlock(winByte)
      if (!arr) break
      var startChar = (guard === 1) ? fromChar : 0
      for (var k = startChar; k < arr.length && nl2 < 0; k++) {
        var ch = arr[k]
        if (collected < scratch.length) scratch[collected++] = ch
        if (ch === 10) {
          if (nl1 < 0) nl1 = collected - 1
          else nl2 = collected - 1
        }
      }
      winByte += BLOCK_SIZE * 2
      fromChar = 0
    }
    if (nl1 < 0) return null
    var word = this._bufToStr(scratch, 0, nl1)
    var def = (nl2 < 0)
      ? this._bufToStr(scratch, nl1 + 1, collected)
      : this._bufToStr(scratch, nl1 + 1, nl2)
    return { word: word, def: def }
  } catch (e) {
    return null
  }
}

// 批量读取多个 entry:同 128KB 块内的 postings 共享一次 _readBlock,
// 消除中文搜索原 150 次 _readEntryAt 反复 _readBlock + 重复扫块的开销。
// offs 必须单调递增(倒排索引保证);跨块续读的 entry 返回 null,调用方走 _readEntryAt 兜底。
DictEngine.prototype._readEntriesBatch = function(offs) {
  var n = offs.length
  var out = new Array(n)
  if (n === 0) return out
  var scratch = this._entryBuf
  var i = 0
  while (i < n) {
    var winByte = Math.floor(offs[i] / (BLOCK_SIZE * 2)) * (BLOCK_SIZE * 2)
    var arr = this._readBlock(winByte)
    if (!arr) { out[i] = null; i++; continue }
    var winEndChar = arr.length
    // 在当前块内连续处理所有落在该块的 postings(每 posting 各自从 startChar 独立扫两个 \n)
    while (i < n) {
      var curOff = offs[i]
      var curWinByte = Math.floor(curOff / (BLOCK_SIZE * 2)) * (BLOCK_SIZE * 2)
      if (curWinByte !== winByte) break
      var startChar = (curOff / 2) - (winByte / 2)
      var collected = 0
      var nl1 = -1
      var nl2 = -1
      for (var k = startChar; k < winEndChar && nl2 < 0; k++) {
        var ch = arr[k]
        if (collected < scratch.length) scratch[collected++] = ch
        if (ch === 10) {
          if (nl1 < 0) nl1 = collected - 1
          else nl2 = collected - 1
        }
      }
      if (nl1 < 0 || nl2 < 0) {
        out[i] = null  // 跨块续读,交回 _readEntryAt 兜底
      } else {
        out[i] = {
          word: this._bufToStr(scratch, 0, nl1),
          def: this._bufToStr(scratch, nl1 + 1, nl2)
        }
      }
      i++
    }
  }
  return out
}

DictEngine.prototype.searchChinese = function(keyword) {
  var raw = String(keyword || '').trim()
  if (!raw) return []
  var queryHanCount = raw.replace(/[^一-鿿]/g, '').length
  var q = raw

  var cached = this._getCache(this._cnCache, q, this._cnCacheOrder)
  if (cached) return cached

  if (!this.isReady && !this.init()) return []

  var results = []
  var seen = {}

  // 1) supplement (in memory, instant)
  // supplement 含英文单词带中文释义(如 hello→int.你好),中文查询必须遍历它,
  // 否则像"你好"这种只在 supplement 出现的词会漏掉。supplement 仅 456 条、内存遍历快。
  this._loadSupp()
  if (this._supp) {
    for (var i = 0; i < this._supp.length; i++) {
      var sdef = this._supp[i].d || ''
      if (sdef.indexOf(q) !== -1) {
        uniquePush(results, { word: this._supp[i].w, definition: sdef, exact: true }, seen)
        if (results.length >= CN_MAX_RESULTS) { this._cacheCn(q, results); return results }
      }
    }
  }

  // 2) main-dict inverted index (seek only to candidate entries)
  if (results.length < CN_MAX_RESULTS && this._ensureCnInv()) {
    var foundChars = []
    var seenc = {}
    for (var ci = 0; ci < q.length; ci++) {
      var c = q.charCodeAt(ci)
      if (c >= 0x4E00 && c <= 0x9FFF && !seenc[c]) {
        seenc[c] = true
        var info = this._findChar(c)
        if (info) foundChars.push(info)
      }
    }
    if (foundChars.length > 0) {
      if (foundChars.length < q.length) {
        this._cacheCn(q, results)
        return results
      }
      // 选 count 最小的字作为 rare（单字查询 / 交集回退都用它）
      var rare = foundChars[0]
      for (var k = 1; k < foundChars.length; k++) {
        if (foundChars[k].count < rare.count) rare = foundChars[k]
      }

      // 交集优先：多字查询时，取 count 最小的两个字做 postings 交集，
      // 只对交集候选读 entry + def.indexOf 过滤。
      // 实测收益：学习 27次readSync/1371KB → 11次/299KB（-59%/-78%）；你好 11→8 / 347→105KB。
      // 因为 def 含查询串 ⟹ def 含查询串里每个字 ⟹ word 在每个字的 postings 里 ⟹ 在交集里。
      // 所以交集是正确结果的超集，def.indexOf(q) 过滤后即得真值。
      // 边界：单字查询无交集；任一字 count 过大(>5000，如「的」12732)时交集候选也会爆，
      //       回退 rare-only 分批扫描，保持原有界行为。
      var intersectUsed = false
      if (foundChars.length >= 2 && rare.count <= 5000) {
        // 找 count 第二小的字
        var second = null
        for (var k2 = 0; k2 < foundChars.length; k2++) {
          if (foundChars[k2] === rare) continue
          if (!second || foundChars[k2].count < second.count) second = foundChars[k2]
        }
        if (second && second.count <= 5000) {
          var setA = this._readPostings(rare.postOff, rare.count, rare.count)
          var setB = this._readPostings(second.postOff, second.count, second.count)
          // 交集：两个列表已各自升序，归并取交集
          var inter = []
          var ia = 0, ib = 0
          while (ia < setA.length && ib < setB.length) {
            if (setA[ia] === setB[ib]) { inter.push(setA[ia]); ia++; ib++ }
            else if (setA[ia] < setB[ib]) ia++
            else ib++
          }
          if (inter.length > 0 && inter.length <= CN_SCAN_CAP) {
            intersectUsed = true
            // 分片读取，凑够 CN_MAX_RESULTS 就停。inter 升序，前段候选更可能命中；
            // _readEntriesBatch 内部按窗口分组复用 readBlock，分片只影响何时停止读新窗口。
            var iStep = 2 * CN_MAX_RESULTS
            for (var iBase = 0; iBase < inter.length && results.length < CN_MAX_RESULTS; iBase += iStep) {
              var iSub = inter.slice(iBase, iBase + iStep)
              var batchI = this._readEntriesBatch(iSub)
              for (var ii = 0; ii < batchI.length && results.length < CN_MAX_RESULTS; ii++) {
                var ei = batchI[ii] || this._readEntryAt(iSub[ii])
                if (ei && ei.def.indexOf(q) !== -1 && !seen[ei.word]) {
                  seen[ei.word] = true
                  results.push({ word: ei.word, definition: ei.def, exact: true })
                }
              }
            }
          } else if (inter.length === 0) {
            // 交集为空 = 无词同时含两字 = 必无 def 含完整查询串的结果，跳过 rare-only。
            intersectUsed = true
          }
          // inter > CN_SCAN_CAP → intersectUsed 仍 false，回退 rare-only 分批
        }
      }

      if (!intersectUsed && results.length < CN_MAX_RESULTS) {
        if (queryHanCount === 1) {
          var offs = this._readPostings(rare.postOff, rare.count, CN_MAX_RESULTS)
          var batch = this._readEntriesBatch(offs)
          for (var oi = 0; oi < batch.length && results.length < CN_MAX_RESULTS; oi++) {
            var e = batch[oi] || this._readEntryAt(offs[oi])
            if (e && e.def.indexOf(q) !== -1 && !seen[e.word]) {
              seen[e.word] = true
              results.push({ word: e.word, definition: e.def, exact: true })
            }
          }
        } else {
          // Batch-read candidate entries in chunks, stopping once enough
          // matches are found. Avoids pre-reading every candidate's definition
          // (up to CN_SCAN_CAP=150 entries, ~1.4MB scattered 64KB sync reads).
          var all = this._readPostings(rare.postOff, rare.count, CN_SCAN_CAP)
          var step = 2 * CN_MAX_RESULTS
          for (var base = 0; base < all.length && results.length < CN_MAX_RESULTS; base += step) {
            var sub = all.slice(base, base + step)
            var batch2 = this._readEntriesBatch(sub)
            for (var oj = 0; oj < batch2.length && results.length < CN_MAX_RESULTS; oj++) {
              var e2 = batch2[oj] || this._readEntryAt(sub[oj])
              if (e2 && e2.def.indexOf(q) !== -1 && !seen[e2.word]) {
                seen[e2.word] = true
                results.push({ word: e2.word, definition: e2.def, exact: true })
              }
            }
          }
        }
      }
    }
  }

  this._cacheCn(q, results)
  return results
}

DictEngine.prototype._cacheCn = function(q, results) {
  this._setCache(this._cnCache, q, results, this._cnCacheOrder, MAX_CACHE_SIZE)
}

// ---- Public search entry ----

DictEngine.prototype.search = function(query) {
  var text = (query || '').trim()
  if (!text) return []
  _devReset()

  if (containsChinese(text)) {
    var cnRes = this.searchChinese(text)
    this.lastReads = _devGet()
    return cnRes
  }

  var cached = this._getCache(this._enCache, text, this._enCacheOrder)
  if (cached) return cached

  // 首次真正需要英文查询时再解析 7KB supplement；启动阶段不做同步 I/O。
  this._loadSupp()
  var direct = this._suppWordMap && this._suppWordMap[text] ? this._suppWordMap[text] : null
  // supplement 中的精确词也要继续补上同词根结果，不能在 direct 命中时提前返回。
  // 结果页用分页承载最多 20 个同前缀词，点击空释义项时再 lookup 正文。
  if (direct) {
    var directList = [{ word: direct.w, definition: direct.d, exact: true }]
    var family = this._prefixFamily(text, MAX_WORD_FAMILY)
    for (var di = 0; di < family.length; di++) {
      if (family[di].word !== text) directList.push({
        word: family[di].word,
        definition: family[di].definition,
        exact: false
      })
    }
    this._setCache(this._enCache, text, directList, this._enCacheOrder, MAX_CACHE_SIZE)
    return directList
  }

  var result = this.lookup(text)
  if (!result) { this.lastReads = _devGet(); return [] }

  var list = []
  var seen = {}
  if (result.definition && result.definition !== '未找到释义') {
    uniquePush(list, { word: result.word, definition: result.definition, exact: true }, seen)
  }
  var suggestions = result.suggestions || []
  for (var i = 0; i < suggestions.length; i++) {
    uniquePush(list, {
      word: suggestions[i].word,
      definition: suggestions[i].definition || '',
      exact: false
    }, seen)
  }
  var finalList = list.slice(0, MAX_WORD_FAMILY + 1)
  this._setCache(this._enCache, text, finalList, this._enCacheOrder, MAX_CACHE_SIZE)
  this.lastReads = _devGet()
  return finalList
}

DictEngine.prototype.lookupDefinition = function(word) {
  var target = normalizeWord(word)
  if (!target) return null
  this._loadSupp()
  var direct = this._suppWordMap && this._suppWordMap[target]
  if (direct) return { word: direct.w, definition: direct.d }
  if (!this.isReady && !this.init()) return null
  var cached = this._getCache(this._lookupCache, target, this._lookupCacheOrder)
  if (cached && cached.definition && cached.definition !== '未找到释义') {
    return { word: cached.word, definition: cached.definition }
  }

  var startOff = pickStartOffset(target)
  var wBuf = this._wBuf
  var dBuf = this._dBuf
  var wLen = 0
  var dLen = 0
  var inWord = true
  var blockByte = Math.floor(startOff / (BLOCK_SIZE * 2)) * (BLOCK_SIZE * 2)
  var arr = this._readBlock(blockByte)
  if (!arr) return null
  var blkIdx = (startOff - blockByte) / 2
  var safety = 0
  while (safety < MAX_SCAN_CHARS) {
    safety++
    if (blkIdx >= arr.length) {
      blockByte += BLOCK_SIZE * 2
      arr = this._readBlock(blockByte)
      if (!arr || arr.length === 0) break
      blkIdx = 0
    }
    var ch = arr[blkIdx++]
    if (ch === 10) {
      if (inWord) inWord = false
      else {
        if (isLetterTarget(target) && isPast(wBuf, wLen, target, target.length)) break
        var same = wLen === target.length
        for (var i = 0; same && i < target.length; i++) {
          if (!charEq(wBuf, i, target.charCodeAt(i))) same = false
        }
        if (same) {
          return { word: this._bufToStr(wBuf, 0, wLen), definition: this._bufToStr(dBuf, 0, dLen) }
        }
        wLen = 0
        dLen = 0
        inWord = true
      }
    } else if (inWord) {
      if (wLen < 128) wBuf[wLen++] = ch
    } else if (dLen < 512) {
      dBuf[dLen++] = ch
    }
  }
  return null
}

// 继续加载更多英文结果（结果页“更多 →”在最后一页触发）。
// 初始 search 只返回最多 MAX_WORD_FAMILY+1 条；本方法按 offset 返回后续词族。
DictEngine.prototype.searchMore = function(query, offset) {
  var text = normalizeWord(query)
  if (!text || containsChinese(text)) return []
  offset = offset || 0
  if (!this._moreLists) this._moreLists = {}
  if (!this._moreLists[text]) {
    this._moreLists[text] = this._buildMoreList(text)
    var keys = Object.keys(this._moreLists)
    if (keys.length > 8) delete this._moreLists[keys[0]]
  }
  var all = this._moreLists[text]
  return all.slice(offset, offset + 20)
}

DictEngine.prototype._buildMoreList = function(text) {
  var list = []
  var seen = {}
  this._loadSupp()
  var direct = this._suppWordMap && this._suppWordMap[text]
  if (direct) {
    uniquePush(list, { word: direct.w, definition: direct.d, exact: true }, seen)
    var family = this._prefixFamily(text, 200)
    for (var fi = 0; fi < family.length; fi++) {
      uniquePush(list, { word: family[fi].word, definition: family[fi].definition, exact: false }, seen)
    }
  } else {
    var result = this.lookup(text)
    if (result) {
      if (result.definition && result.definition !== '未找到释义') {
        uniquePush(list, { word: result.word, definition: result.definition, exact: true }, seen)
      }
      var suggestions = result.suggestions || []
      for (var si = 0; si < suggestions.length; si++) {
        uniquePush(list, { word: suggestions[si].word, definition: suggestions[si].definition || '', exact: false }, seen)
      }
    }
    var family2 = this._prefixFamily(text, 200)
    for (var fi2 = 0; fi2 < family2.length; fi2++) {
      uniquePush(list, { word: family2[fi2].word, definition: family2[fi2].definition, exact: false }, seen)
    }
  }
  return list
}

// 输入建议必须保持纯内存，不能调用 prefixSuggest() 触发主词库同步 I/O。
DictEngine.prototype.fastSuggestions = function(q, limit) {
  q = normalizeWord(q)
  if (!q) return []
  this._loadSupp()
  if (!this._supp) return []
  limit = limit || 3
  var out = []
  for (var i = 0; i < this._supp.length && out.length < limit; i++) {
    if (this._supp[i].w.indexOf(q) === 0) out.push(this._supp[i].w)
  }
  return out
}

// Cheap prefix autocomplete: seek to the prefix offset and collect words that
// start with `q` (no full definition decode). Used by the home input suggestions.
DictEngine.prototype.prefixSuggest = function(q, limit) {
  q = normalizeWord(q)
  if (!q) return []
  if (!this.isReady && !this.init()) return []
  limit = limit || 3
  var startOff = pickStartOffset(q)
  var tLen = q.length
  var tC0 = q.charCodeAt(0)
  var tC1 = tLen >= 2 ? q.charCodeAt(1) : 0
  var wBuf = this._wBuf
  var wLen = 0
  var inWord = true
  var blockByte = Math.floor(startOff / (BLOCK_SIZE * 2)) * (BLOCK_SIZE * 2)
  var arr = this._readBlock(blockByte)
  if (!arr) return []
  var blkIdx = (startOff - blockByte) / 2
  var out = []
  var seen = {}
  var safety = 0
  // safety:最坏情况扫描上界。旧值 12000 偏大(用户痛点:英文输入自动补全慢)。
  // 收紧到 4000:正常前缀经 isPast 或找够 limit 很快 break,4000 足以覆盖稀疏前缀的
  // 起点偏移段,同时把最坏情况 CPU 砍到 1/3。仍为有界循环,不破坏稳定性铁律。
  while (safety < 4000 && out.length < limit) {
    safety++
    if (blkIdx >= arr.length) {
      blockByte += BLOCK_SIZE * 2
      arr = this._readBlock(blockByte)
      if (!arr || arr.length === 0) break
      blkIdx = 0
    }
    var ch = arr[blkIdx]
    blkIdx++
    if (ch === 10) {
      if (inWord) {
        inWord = false
      } else {
        if (isPast(wBuf, wLen, q, tLen)) break
        if (wLen >= tLen) {
          var ok = true
          for (var k = 0; k < tLen; k++) {
            if (!charEq(wBuf, k, q.charCodeAt(k))) { ok = false; break }
          }
          if (ok) {
            var wd = this._bufToStr(wBuf, 0, wLen)
            if (isCleanWord(wd) && !seen[wd]) { seen[wd] = true; out.push(wd) }
          }
        }
        wLen = 0
        inWord = true
      }
    } else {
      if (inWord) { if (wLen < 128) wBuf[wLen++] = ch }
    }
  }
  return out
}

// Return a random dictionary entry (for the "random word" feature).
// The main dict alternates word-line / definition-line, so a raw random byte
// offset cannot tell which parity it lands on. Every value in prefixIndex is a
// guaranteed WORD-line offset, so we anchor on a random prefix entry and then
// step forward a random number of whole entries (which preserves parity).
DictEngine.prototype.randomWord = function() {
  if (!this.isReady && !this.init()) return null
  try {
    if (!this._anchorOffsets) {
      this._anchorOffsets = []
      for (var key in prefixIndex) {
        if (prefixIndex.hasOwnProperty(key)) this._anchorOffsets.push(prefixIndex[key])
      }
    }
    var anchors = this._anchorOffsets
    if (!anchors.length) return null
    var start = anchors[Math.floor(Math.random() * anchors.length)]
    var skip = Math.floor(Math.random() * 60)   // 0..59 entries forward
    var off = start
    var e = this._readEntryAt(off)
    for (var s = 0; s < skip; s++) {
      if (!e || !e.word) break
      // advance past this entry: word line + '\n' + def line + '\n'
      off += (e.word.length + 1 + e.def.length + 1) * 2
      if (DICT_SIZE && off >= DICT_SIZE - 4) { off = start; e = this._readEntryAt(off); break }
      var nextE = this._readEntryAt(off)
      if (!nextE || !nextE.word) break
      e = nextE
    }
    if (e && e.word && e.word.trim()) return { word: e.word, definition: e.def }
    return null
  } catch (err) {
    return null
  }
}

export default new DictEngine()
