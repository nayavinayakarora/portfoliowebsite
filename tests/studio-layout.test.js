import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('../src/components/Studio.jsx', import.meta.url), 'utf8')
const styles = await readFile(new URL('../src/components/Studio.css', import.meta.url), 'utf8')

test('the piano comes first, with the synth and complete sequencer before the sampler', () => {
  const sections = [...source.matchAll(/<section className="([^"]+)"[\s\S]*?<\/section>/g)]
    .filter(([opening]) => /studio-(synth"|keyboard-module"|sequence-editor|granular")/.test(opening))
  assert.deepEqual(sections.map(([, classes]) => classes), [
    'studio-keyboard-module',
    'studio-rack studio-synth',
    'studio-sequence-editor studio-rack',
    'studio-rack studio-granular',
  ])
  assert.match(sections[2][0], /studio-sequence-timing/)
  assert.match(sections[2][0], /studio-sequence-steps/)
  assert.doesNotMatch(sections[2][0], /studio-granular/)
})

test('phone layouts keep the synth controls together while desktop retains its two-column rack', () => {
  assert.match(styles, /grid-template-areas: "synth granular" "sequence sequence" "keyboard keyboard"/)
  const mobile = styles.slice(styles.indexOf('@media (max-width: 800px)'))
  assert.match(mobile, /grid-template-areas: "keyboard" "synth" "sequence" "granular"/)
})

test('the built-in sample bank identifies its creator and asks for credit on reuse', () => {
  const sampler = source.match(/<section className="studio-rack studio-granular"[\s\S]*?<\/section>/)[0]
  assert.match(sampler, /The built-in sound bank contains original samples created, synthesised, and recorded by <strong>Vinayak Arora<\/strong>/)
  assert.match(sampler, /If you use these samples in your work, please credit Vinayak Arora\./)
})

test('studio section headings have no module numbers while sequence steps retain theirs', () => {
  assert.doesNotMatch(source, /studio-module-number/)
  assert.doesNotMatch(styles, /studio-module-number/)
  assert.match(source, /String\(index \+ 1\)\.padStart\(2, '0'\)/)
})
