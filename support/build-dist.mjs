import { readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { rolldown } from 'rolldown'
import { dts } from 'rolldown-plugin-dts'
import ts from 'typescript'
import { build } from 'vite'

const require = createRequire(import.meta.url)
const pkg = require('../package.json')

const banner = `/*! ${pkg.name} ${pkg.version} https://github.com/${pkg.repository} @license ${pkg.license} */`

// CJS bundles entities because newer versions no longer provide CJS exports.
const dependencies = Object.keys(pkg.dependencies)
const formats = [
  { format: 'cjs', file: 'markdown-it.cjs.js', target: 'es2015' },
  { format: 'es', file: 'markdown-it.mjs', target: 'es2018' },
  { format: 'umd', file: 'markdown-it.umd.min.js', target: 'es2015', browser: true },
  { format: 'es', file: 'markdown-it.esm.min.mjs', target: 'es2018', browser: true }
]

await rm('dist', { recursive: true, force: true })

for (const { format, file, target, browser = false } of formats) {
  const external = browser ? [] : dependencies.filter(name => format !== 'cjs' || name !== 'entities')
  const name = format === 'umd' ? 'markdownit' : undefined

  for (const [directory, syntax] of [['dist', target], ['dist/modern', 'es2022']]) {
    await build({
      configFile: false,
      logLevel: 'info',
      build: {
        outDir: browser ? join(directory, 'browser') : directory,
        emptyOutDir: false,
        sourcemap: true,
        target: syntax,
        minify: browser,
        lib: { entry: 'src/index.ts', name, formats: [format], fileName: () => file },
        rolldownOptions: { external, output: { banner, name } }
      }
    })
  }
}

// ESM types, bundled into a single .d.mts
const dtsBundle = await rolldown({
  input: 'src/index.ts',
  external: Object.keys(pkg.dependencies),
  checks: { pluginTimings: false },
  plugins: dts({
    emitDtsOnly: true,
    generator: 'tsc'
  })
})

try {
  await dtsBundle.write({
    dir: 'dist',
    format: 'es',
    codeSplitting: false,
    entryFileNames: chunk => chunk.name.endsWith('.d')
      ? 'markdown-it.d.mts'
      : 'types-empty.js'
  })
} finally {
  await dtsBundle.close()
}

// CJS types: a wrapper with `export =`, to match `module.exports = MarkdownIt`.
// Named exports are not allowed next to `export =`, so exported types are moved
// into a namespace with the same name, merged into the exported value.
const dtsSource = ts.createSourceFile(
  'markdown-it.d.mts',
  await readFile('dist/markdown-it.d.mts', 'utf8'),
  ts.ScriptTarget.Latest,
  true
)

const typeParams = new Map()

for (const node of dtsSource.statements) {
  if (ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
    typeParams.set(node.name.text, node.typeParameters ?? [])
  }
}

const specifiers = dtsSource.statements
  .filter(node => ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause))
  .flatMap(node => [...node.exportClause.elements])

const members = []
let hasDefault = false

for (const spec of specifiers) {
  const exported = spec.name.text
  const local = (spec.propertyName ?? spec.name).text

  if (exported === 'default') {
    hasDefault = true
    continue
  }

  if (!spec.isTypeOnly) {
    throw new Error(`Value export "${exported}" can not be re-exposed in CJS declarations`)
  }

  // Generic types must be re-declared with their parameters
  const params = typeParams.get(local) ?? []
  const declared = params.length ? `<${params.map(p => p.getText()).join(', ')}>` : ''
  const used = params.length ? `<${params.map(p => p.name.text).join(', ')}>` : ''

  members.push(`  type ${exported}${declared} = import('./markdown-it.mjs').${exported}${used}`)
}

if (!hasDefault) throw new Error('No default export found in generated declarations')

await writeFile('dist/markdown-it.d.cts', [
  'declare namespace MarkdownIt {',
  ...members,
  '}',
  "declare const MarkdownIt: typeof import('./markdown-it.mjs').default",
  'export = MarkdownIt',
  ''
].join('\n'))
