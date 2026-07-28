import assert from 'node:assert/strict'
import fs from 'node:fs'

const source = fs.readFileSync('page/results.js', 'utf8')
const preview = source.slice(source.indexOf('// 释义预览'), source.indexOf('// 打开按钮'))

assert.match(preview, /text_size:\s*px\(13\)/, '释义预览应提升到 13px')
assert.match(preview, /color:\s*th\.text\b/, '释义预览应使用高对比正文色')

console.log('PASS: 结果页释义预览可读性样式')
