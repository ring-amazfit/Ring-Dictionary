// 页面测试用 loader：把 @zos/* 映射到 tools/stub-zos-*.mjs，处理 Windows 路径与无扩展名相对导入
import { pathToFileURL } from 'node:url'

const map = {
  '@zos/ui': new URL('./stub-zos-ui.mjs', import.meta.url).href,
  '@zos/router': new URL('./stub-zos-router.mjs', import.meta.url).href,
  '@zos/i18n': new URL('./stub-zos-i18n.mjs', import.meta.url).href,
  '@zos/interaction': new URL('./stub-zos-interaction.mjs', import.meta.url).href,
  '@zos/display': new URL('./stub-zos-display.mjs', import.meta.url).href,
  '@zos/utils': new URL('./stub-zos-utils.mjs', import.meta.url).href,
  '@zos/fs': new URL('./stub-zos-fs.mjs', import.meta.url).href,
  '@zos/storage': new URL('./stub-zos-storage.mjs', import.meta.url).href
}

export async function resolve(specifier, context, nextResolve) {
  if (map[specifier]) {
    return { url: map[specifier], format: 'module', shortCircuit: true }
  }
  if (/^[A-Za-z]:[\/]/.test(specifier)) {
    return { url: pathToFileURL(specifier).href, shortCircuit: true }
  }
  if ((specifier.startsWith('./') || specifier.startsWith('../')) && !/\.[a-zA-Z]+$/.test(specifier)) {
    try {
      return await nextResolve(specifier + '.js', context)
    } catch (e) { /* fall through */ }
  }
  return nextResolve(specifier, context)
}
