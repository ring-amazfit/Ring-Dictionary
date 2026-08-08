import { createWidget, widget, text_style, align, prop } from '@zos/ui'
import { px } from '@zos/utils'
import { push, back, replace } from '@zos/router'
import dictEngine from '../utils/dict-engine'
import { storage } from '../utils/storage'
import { THEMES, SCREEN, CROWN, DECO } from '../utils/constants'
import { getText } from '@zos/i18n'
import { getGaokaoCountdownText } from '../utils/gaokao'
import { bindCrown } from '../utils/crown'
import { consumeResultRoute, saveResultRoute } from '../utils/route-cache'
function parseParams(params) {
  if (!params) return {}
  var p = params
  if (typeof p === 'string') {
    try { p = JSON.parse(p) } catch (e) { p = {} }
  }
  return p || {}
}

// 按官方表冠规范：bindCrown 内部完成 KEY_HOME、degree 类型、Math.sign 和轻节流。

function trimPreview(text) {
  var value = (text || '').replace(/\s+/g, ' ').trim()
  if (value.length > 22) return value.slice(0, 22) + '...'
  return value
}


Page({
  state: {
    theme: 'dark',
    query: '',
    results: [],
    page: 0,
    expandGeneration: 0,
    expandPending: [],
    expandDone: 0,
    expandTimer: null,
    noMore: false
  },

  onInit(params) {
    globalThis.__t_resultsOnInit = Date.now()
    this.state.theme = storage.getTheme()
    var p = parseParams(params)
    var routed = p.token ? consumeResultRoute(p.token) : null
    this.state.query = (routed && routed.query) || p.query || ''
    this.state.reads = routed && routed.reads !== undefined ? routed.reads : (p.reads || 0)
    // 优先从进程内 token 取完整结果；兼容直接数组和旧版内层 JSON。
    if (routed && Array.isArray(routed.results)) {
      this.state.results = routed.results
    } else if (Array.isArray(p.results)) {
      this.state.results = p.results
    } else {
      try {
        this.state.results = JSON.parse(p.results || '[]')
      } catch (e) {
        this.state.results = []
      }
    }
    // 页面切换可能让 token 缓存失效；query 仍在路由参数中时，按 query 恢复结果，
    // 避免出现“有标题但 0 个结果”的空白结果页。
    if (!this.state.results.length && this.state.query) {
      this.state.results = dictEngine.search(this.state.query) || []
      if (!this.state.results.length) {
        this.state.results.push({ word: this.state.query, definition: getText('notFoundDefinition'), exact: false })
      }
    }
    globalThis.__t_resultsParsed = Date.now()
  },

  build() {
    var self = this
    var th = this.state.theme === 'dark' ? THEMES.dark : THEMES.light
    this.theme = th
    var totalResults = this.state.results.length

    // 背景
    createWidget(widget.FILL_RECT, { x: 0, y: 0, w: px(480), h: px(480), radius: px(240), color: th.bg })

    // 装饰外环
    createWidget(widget.ARC, {
      x: px(DECO.outerRing.x), y: px(DECO.outerRing.y),
      w: px(DECO.outerRing.w), h: px(DECO.outerRing.h),
      start_angle: 0, end_angle: 360,
      color: th.border,
      line_width: px(DECO.outerRing.lineWidth)
    })

    // 标题栏装饰线
    createWidget(widget.FILL_RECT, {
      x: px(100), y: px(40), w: px(40), h: px(3),
      radius: px(2), color: th.accent
    })

    // 查询词标题
    createWidget(widget.TEXT, {
      x: px(100), y: px(46), w: px(280), h: px(26),
      text_size: px(22),
      color: th.text,
      align_h: align.LEFT,
      align_v: align.CENTER_V,
      text_style: text_style.TRUNCATE,
      text: this.state.query || getText('searchResultsTitle')
    })

    // 结果计数；调试耗时不在发布界面展示。
    this.countText = createWidget(widget.TEXT, {
      x: px(70), y: px(72), w: px(320), h: px(18),
      text_size: px(12),
      color: th.textSecondary,
      align_h: align.LEFT,
      align_v: align.CENTER_V,
      text_style: text_style.TRUNCATE,
      text: totalResults + getText('resultCountSuffix')
    })

    // 页码指示
    this.pageText = createWidget(widget.TEXT, {
      x: px(320), y: px(72), w: px(80), h: px(18),
      text_size: px(13),
      color: th.textSecondary,
      align_h: align.RIGHT,
      align_v: align.CENTER_V,
      text: ''
    })

    // 结果卡片 + 操作按钮：只创建当前结果页实际需要的数量。
    // 保留每页最多 4 张的原布局，2 个结果不会再创建 2 张空卡片。
    var cardCount = Math.min(SCREEN.RESULTS_PER_PAGE, totalResults)
    this.cardCount = cardCount
    this.wordWidgets = []
    this.previewWidgets = []
    this.resultButtons = []
    for (var i = 0; i < cardCount; i++) {
      var y = px(94) + i * px(58)

      // 卡片背景
      createWidget(widget.FILL_RECT, {
        x: px(60), y: y, w: px(360), h: px(52),
        radius: px(16), color: th.keyboardBg
      })

      // 左侧装饰条（模拟 accent 竖线）
      createWidget(widget.FILL_RECT, {
        x: px(60), y: y + px(8), w: px(4), h: px(36),
        radius: px(2), color: th.accent
      })

      // 单词
      this.wordWidgets[i] = createWidget(widget.TEXT, {
        x: px(78), y: y + px(6), w: px(180), h: px(20),
        text_size: px(18),
        color: th.text,
        align_h: align.LEFT,
        align_v: align.CENTER_V,
        text_style: text_style.TRUNCATE,
        text: ''
      })

      // 释义预览
      this.previewWidgets[i] = createWidget(widget.TEXT, {
        x: px(78), y: y + px(25), w: px(180), h: px(18),
        text_size: px(13),
        color: th.text,
        align_h: align.LEFT,
        align_v: align.CENTER_V,
        text_style: text_style.TRUNCATE,
        text: ''
      })

      // 打开按钮
      this.resultButtons[i] = createWidget(widget.BUTTON, {
        x: px(282), y: y + px(10), w: px(120), h: px(28),
        radius: px(14),
        text: getText('openDetail'),
        text_size: px(12),
        color: 0xffffff,
        press_color: th.success,
        normal_color: th.accent,
        click_func: this._makeOpenDetailByIndex(i)
      })
    }

    this.expandBtn = createWidget(widget.BUTTON, {
      x: px(160), y: px(330), w: px(160), h: px(28),
      radius: px(14), text: getText('expandDefinition'), text_size: px(13),
      color: th.text, press_color: th.border, normal_color: th.keyboardKey,
      click_func: function() { self._startExpandDefinitions() }
    })

    // 初始结果已达上限时提示可继续加载（仅满 21 条时显示，点击更多后隐藏）。
    this.moreHint = createWidget(widget.TEXT, {
      x: px(60), y: px(362), w: px(360), h: px(16), text_size: px(11),
      color: th.textSecondary, align_h: align.CENTER_H, align_v: align.CENTER_V, text: ''
    })


    var navY = px(384)
    var navBW = px(68)
    var navGap = px(8)
    var navStartX = px(92)
    createWidget(widget.BUTTON, {
      x: navStartX, y: navY, w: navBW, h: px(34),
      radius: px(17),
      text: getText('previousPage'), text_size: px(12),
      color: th.text,
      press_color: th.border,
      normal_color: th.keyboardKey,
      click_func: function() { self._changePage(-1) }
    })

    createWidget(widget.BUTTON, {
      x: navStartX + (navBW + navGap), y: navY, w: navBW, h: px(34),
      radius: px(17),
      text: getText('back'), text_size: px(14),
      color: th.text,
      press_color: th.border,
      normal_color: th.keyboardKey,
      click_func: function() { back() }
    })

    createWidget(widget.BUTTON, {
      x: navStartX + (navBW + navGap) * 2, y: navY, w: navBW, h: px(34),
      radius: px(17),
      text: getText('home'), text_size: px(13),
      color: th.text,
      press_color: th.border,
      normal_color: th.keyboardKey,
      click_func: function() {
        replace({ url: 'page/home', anim: false })
      }
    })

    // 结果页底部仅保留导航按钮，展开释义放在“更多”按钮内轮换触发
    this.moreBtn = createWidget(widget.BUTTON, {
      x: navStartX + (navBW + navGap) * 3, y: navY, w: navBW, h: px(34),
      radius: px(17),
      text: getText('more'), text_size: px(12),
      color: 0xffffff,
      press_color: th.success,
      normal_color: th.accent,
      click_func: function() { self._changePage(1) }
    })

    this._renderPage()

    // 表冠（官方规范 + 轻节流）
    this._unbindCrown = bindCrown(function(step) { self._changePage(step) })

    // build 完成后保持计数文案稳定。
    globalThis.__t_buildEnd = Date.now()
    try {
      this.countText.setProperty(prop.MORE, {
        text: (this.state.results || []).length + getText('resultCountSuffix')
      })
    } catch (e) {}
  },

  _renderPage() {
    var perPage = SCREEN.RESULTS_PER_PAGE
    var maxPage = Math.max(0, Math.ceil(this.state.results.length / perPage) - 1)
    if (this.state.page > maxPage) this.state.page = maxPage
    var start = this.state.page * perPage

    for (var i = 0; i < this.cardCount; i++) {
      var item = this.state.results[start + i]
      if (item) {
        this.wordWidgets[i].setProperty(prop.MORE, {
          text: item.word + (item.exact ? '' : '')
        })
        this.previewWidgets[i].setProperty(prop.MORE, {
          text: trimPreview(item.definition || getText('clickToViewDefinition'))
        })
        // 按钮回调在 build 时已按槽位绑定；翻页只更新文字，避免重复创建闭包。
        this.resultButtons[i].setProperty(prop.MORE, { text: getText('openDetail') })
      } else {
        this.wordWidgets[i].setProperty(prop.MORE, { text: '' })
        this.previewWidgets[i].setProperty(prop.MORE, { text: '' })
        this.resultButtons[i].setProperty(prop.MORE, { text: ' ' })
      }
    }

    this.moreBtn.setProperty(prop.MORE, { text: !this.state.noMore && this.state.results.length > 0 ? getText('more') : ' ' })
    if (this.moreHint) {
      this.moreHint.setProperty(prop.MORE, {
        text: (!this.state.noMore && this.state.results.length === 21) ? getText('moreHint') : ''
      })
    }
    this.pageText.setProperty(prop.MORE, {
      text: (this.state.page + 1) + '/' + (maxPage + 1)
    })
  },

  _makeOpenDetailByIndex(index) {
    var self = this
    return function() {
      var perPage = SCREEN.RESULTS_PER_PAGE
      var actualIndex = self.state.page * perPage + index
      var item = self.state.results[actualIndex]
      if (!item) return
      storage.addHistory(item.word)
      var detail = item.definition || ''
      if (!detail) {
        var lookup = dictEngine.lookup(item.word.toLowerCase())
        detail = lookup && lookup.definition && lookup.definition !== getText('notFoundDefinition')
          ? lookup.definition : getText('notFoundDefinition')
      }
      var resultToken = saveResultRoute({
        query: self.state.query,
        results: self.state.results,
        reads: self.state.reads || 0
      })
      push({
        url: 'page/detail',
        params: JSON.stringify({
          word: item.word,
          definition: detail,
          phonetic: '',
          suggestions: [],
          resultToken: resultToken
        }),
        anim: true
      })
    }
  },

  _startExpandDefinitions() {
    if (this.state.expandTimer || !this.state.results.length) return
    this.state.expandGeneration += 1
    var generation = this.state.expandGeneration
    this.state.expandPending = []
    // 只展开当前页可见条目：继续加载后结果可达近百条，全量展开会长时间占用主线程。
    var pageStart = this.state.page * SCREEN.RESULTS_PER_PAGE
    var pageEnd = pageStart + SCREEN.RESULTS_PER_PAGE
    for (var i = pageStart; i < pageEnd && i < this.state.results.length; i++) {
      if (!this.state.results[i].definition) this.state.expandPending.push(i)
    }
    this.state.expandDone = 0
    if (!this.state.expandPending.length) {
      this.expandBtn.setProperty(prop.MORE, { text: getText('expandedDefinition') })
      return
    }
    this.expandBtn.setProperty(prop.MORE, { text: getText('expandingDefinitionPrefix') + '0/' + this.state.expandPending.length })
    this._expandNext(generation)
  },

  _expandNext(generation) {
    var self = this
    if (generation !== this.state.expandGeneration || !this.state.expandPending.length) {
      this.state.expandTimer = null
      if (generation === this.state.expandGeneration && this.expandBtn) {
        this.expandBtn.setProperty(prop.MORE, { text: getText('expandedDefinition') })
      }
      return
    }
    var index = this.state.expandPending.shift()
    var item = this.state.results[index]
    if (item && item.word) {
      var found = dictEngine.lookupDefinition(item.word)
      item.definition = found && found.definition ? found.definition : getText('notFoundDefinition')
      var pageStart = this.state.page * SCREEN.RESULTS_PER_PAGE
      var slot = index - pageStart
      if (slot >= 0 && slot < this.cardCount) {
        this.previewWidgets[slot].setProperty(prop.MORE, { text: trimPreview(item.definition) })
      }
    }
    this.state.expandDone += 1
    this.expandBtn.setProperty(prop.MORE, {
      text: getText('expandingDefinitionPrefix') + this.state.expandDone + '/' + (this.state.expandDone + this.state.expandPending.length)
    })
    this.state.expandTimer = setTimeout(function() {
      self.state.expandTimer = null
      self._expandNext(generation)
    }, 0)
  },
  _changePage(step) {
    var perPage = SCREEN.RESULTS_PER_PAGE
    var maxPage = Math.max(0, Math.ceil(this.state.results.length / perPage) - 1)
    // 已在最后一页且向右翻 → 尝试继续加载更多结果（第 4 点：更多 →）
    if (step > 0 && this.state.page >= maxPage) {
      this._loadMore()
      return
    }
    var next = this.state.page + step
    if (next < 0) next = 0
    if (next > maxPage) next = maxPage
    if (next !== this.state.page) {
      this.state.page = next
      this._renderPage()
    }
  },

  // 结果已达初始上限时，点“更多 →”在最后一页继续加载下一批词族结果。
  _loadMore() {
    if (this.state.noMore || this._loadingMore) return
    var q = this.state.query
    if (!q) return
    this._loadingMore = true
    var more = []
    try {
      more = dictEngine.searchMore(q, this.state.results.length) || []
    } catch (e) {
      more = []
    }
    this._loadingMore = false
    if (!more.length) {
      this.state.noMore = true
      this._renderPage()
      return
    }
    var oldLen = this.state.results.length
    this.state.results = this.state.results.concat(more)
    // 落在新加载结果所在的第一页：旧列表最后一页若未满，保持原页即可。
    this.state.page = Math.floor(oldLen / SCREEN.RESULTS_PER_PAGE)
    this._renderPage()
  },

  onDestroy() {
    this.state.expandGeneration += 1
    if (this.state.expandTimer) {
      clearTimeout(this.state.expandTimer)
      this.state.expandTimer = null
    }
    if (this._unbindCrown) this._unbindCrown()
  }
})
