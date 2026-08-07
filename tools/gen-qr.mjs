// Generate the QR codes shown on the About screen.
// Per zeppos-widget-img-quirks.md:
//  - generate at the EXACT display size (IMG does not scale), margin 0, H level
//  - target key is "common" -> files land in assets/common/ and are packed as
//    /assets/<name>.png ; the page must use the bare filename as `src`.
import QRCode from 'qrcode'
import { fileURLToPath } from 'node:url'

const OUT = fileURLToPath(new URL('../assets/common/', import.meta.url))

// 关于页双二维码：本项目源码 + 爱发电赞赏。显示尺寸均为 170×170。
const items = [
  { url: 'https://github.com/ring-amazfit/Ring-Dictionary', file: 'github_qr_ring.png' },
  { url: 'https://www.ifdian.net/a/shynion?utm_source=copylink&utm_medium=link', file: 'ifdian_qr_ring.png' }
]

for (const it of items) {
  await QRCode.toFile(OUT + it.file, it.url, {
    width: 170,
    margin: 0,
    errorCorrectionLevel: 'H',
    color: { dark: '#000000', light: '#FFFFFF' }
  })
  console.log('wrote', it.file, '(', it.url, ')')
}
