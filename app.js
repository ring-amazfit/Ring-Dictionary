import { onKey, KEY_SHORTCUT, offKey } from '@zos/interaction'
import { back } from '@zos/router'

App({
  onCreate() {
    console.log('App onCreate')

    // 监听物理按键(侧边按钮),按下时尝试返回上一页
    // Amazfit Balance 物理按键在 Zepp OS 4.0 下通常映射为 KEY_SHORTCUT
    // 返回 true 表示事件已处理,避免触发系统默认行为(如回表盘)
    let lastKeyTime = 0
    onKey({
      callback: (key) => {
        if (key === KEY_SHORTCUT) {
          // 防止 DOWN/UP 重复触发: 300ms 内只响应一次
          const now = Date.now()
          if (now - lastKeyTime < 300) return true
          lastKeyTime = now
          try {
            back({ anim: true })
          } catch (e) {
            console.log('back failed: ' + e)
          }
          return true
        }
        return false
      }
    })
  },

  onDestroy() {
    try { offKey() } catch (e) {}
    console.log('App onDestroy')
  }
})
