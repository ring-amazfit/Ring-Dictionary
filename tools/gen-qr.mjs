// Generate the GitHub QR code shown on the About screen.
// Per zeppos-widget-img-quirks.md:
//  - generate at the EXACT display size (IMG does not scale), margin 0, H level
//  - target key is "common" -> files land in assets/common/ and are packed as
//    /assets/<name>.png ; the page must use the bare filename as `src`.
import QRCode from 'qrcode'
import { fileURLToPath } from 'node:url'
import { rmSync } from 'node:fs'

const OUT = fileURLToPath(new URL('../assets/common/', import.meta.url))

// 只保留本项目源码二维码，不再放依赖库（用户要求）
const items = [
  { url: 'https://github.com/ring-amazfit/Ring-Dictionary', file: 'github_qr_ring.png' }
]

// 清理旧的 easy-storage 二维码（已从关于页移除）
try { rmSync(OUT + 'github_qr_easy.png') } catch (e) {}

for (const it of items) {
  await QRCode.toFile(OUT + it.file, it.url, {
    width: 200,
    margin: 0,
    errorCorrectionLevel: 'H',
    color: { dark: '#000000', light: '#FFFFFF' }
  })
  console.log('wrote', it.file, '(', it.url, ')')
}
