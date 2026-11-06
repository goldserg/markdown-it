import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const md = require('../../')()

describe('CJS', () => {
  it('require', () => {
    assert.strictEqual(md.render('abc'), '<p>abc</p>\n')
  })
})

for (const [entry, esmFile, cjsFile] of [
  ['markdown-it/modern', 'markdown-it.mjs', 'markdown-it.cjs.js'],
  ['markdown-it/modern/browser', 'browser/markdown-it.esm.min.mjs', 'browser/markdown-it.umd.min.js']
]) {
  describe(entry, () => {
    it('renders through both package export conditions', async () => {
      const dir = new URL('../../dist/modern/', import.meta.url)
      assert.equal(import.meta.resolve(entry), new URL(esmFile, dir).href)
      assert.equal(require.resolve(entry), fileURLToPath(new URL(cjsFile, dir)))

      const { default: esm } = await import(entry)
      const cjs = require(entry)

      for (const MarkdownIt of [esm, cjs]) {
        const parser = MarkdownIt()
        const tokens = parser.parse('a\nb', {})
        assert.ok(tokens[0] instanceof MarkdownIt.Token)
        assert.equal(parser.renderer.render(tokens, parser.options, {}), '<p>a\nb</p>\n')
      }
    })
  })
}
