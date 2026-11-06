// Types are checked as a package consumer would see them, via `exports` map.
import md = require('markdown-it')
import modern = require('markdown-it/modern')
import browser = require('markdown-it/modern/browser')

const parser = new md({ html: true })
const legacy = md('commonmark')
const tokens: md.Token[] = parser.parse('abc', {})
const Token: typeof md.Token = md.Token
const ruler: md.Ruler<[md.StateCore], void> = parser.core.ruler

const modernTokens: md.Token[] = modern().parse('abc', {})
const browserTokens: md.Token[] = browser().parse('abc', {})

export { parser, legacy, tokens, Token, ruler, modernTokens, browserTokens }
