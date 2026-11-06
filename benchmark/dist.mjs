/* eslint no-console:0 */
import assert from 'node:assert/strict'
import MarkdownIt from 'markdown-it'
import Modern from 'markdown-it/modern'
import { Bench } from 'tinybench'

const input = 'plain text\n'.repeat(8000)
const standard = new MarkdownIt()
const modern = new Modern()

assert.equal(modern.render(input), standard.render(input))

const bench = new Bench({ name: '8,000 lines in one paragraph' })
bench.add('markdown-it', () => { standard.render(input) })
bench.add('markdown-it/modern', () => { modern.render(input) })

await bench.run()
console.table(bench.table())
