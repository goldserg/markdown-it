import MarkdownIt, { type Token } from 'markdown-it'
import Modern from 'markdown-it/modern'
import ModernBrowser from 'markdown-it/modern/browser'

const parser = new MarkdownIt({ html: true })
const tokens: Token[] = parser.parse('abc', {})

const modern: Token[] = new Modern().parse('abc', {})
const modernBrowser: Token[] = new ModernBrowser().parse('abc', {})

export { parser, tokens, modern, modernBrowser }
