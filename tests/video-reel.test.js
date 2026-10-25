import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { collectReelVideos, youtubeVideoId, shuffleReelVideos, reelIndex, reelEmbedUrl } from '../src/videoReel.js'

test('the phone only accepts valid YouTube links in the formats already on the site', () => {
  for (const link of ['https://youtu.be/3c4PBIxCvmA', 'https://www.youtube.com/watch?v=3c4PBIxCvmA&si=abc', 'https://youtube.com/embed/3c4PBIxCvmA?feature=oembed', 'https://www.youtube-nocookie.com/embed/3c4PBIxCvmA', 'https://youtube.com/shorts/3c4PBIxCvmA', 'https://youtube.com/live/3c4PBIxCvmA']) assert.equal(youtubeVideoId(link), '3c4PBIxCvmA')
  for (const link of ['https://vimeo.com/1185325506', 'https://youtube.com.evil.test/watch?v=3c4PBIxCvmA', 'https://youtube.com/@vinayakaroraeotd', 'not a url', 'https://youtu.be/no']) assert.equal(youtubeVideoId(link), null)
})

test('the queue deduplicates website videos without losing their titles', () => {
  const list = collectReelVideos([{ href: 'https://youtu.be/3c4PBIxCvmA', title: 'Moventhisizer', category: 'Live' }, { href: 'https://youtube.com/embed/3c4PBIxCvmA', title: 'Duplicate' }, { href: 'https://vimeo.com/123', title: 'Not YouTube' }])
  assert.equal(list.length, 1)
  assert.equal(list[0].title, 'Moventhisizer')
  assert.equal(list[0].category, 'Live')
  assert.equal(list[0].id, '3c4PBIxCvmA')
})

test('shuffle visits each item once and avoids an immediate repeat across queues', () => {
  const source = Array.from({ length: 30 }, (_, id) => ({ id: String(id) }))
  for (let run = 0; run < 50; run += 1) {
    const shuffled = shuffleReelVideos(source, '0')
    assert.equal(new Set(shuffled.map((item) => item.id)).size, source.length)
    assert.notEqual(shuffled[0].id, '0')
  }
  assert.equal(source[0].id, '0')
  assert.deepEqual(shuffleReelVideos([]), [])
  assert.deepEqual(shuffleReelVideos([{ id: 'only' }], 'only'), [{ id: 'only' }])
})

test('scroll indexing clamps bounce, resize, and end-of-feed positions', () => {
  assert.equal(reelIndex(-30, 284, 20), 0)
  assert.equal(reelIndex(284, 284, 20), 1)
  assert.equal(reelIndex(50000, 284, 20), 19)
  assert.equal(reelIndex(100, 0, 0), 0)
  assert.equal(reelEmbedUrl('3c4PBIxCvmA'), 'https://www.youtube-nocookie.com/embed/3c4PBIxCvmA?autoplay=1&playsinline=1&rel=0')
  assert.throws(() => reelEmbedUrl('bad?parameters'))
})

test('only the active video embeds after a gesture; hiding the phone removes playback', () => {
  const source = readFileSync(new URL('../src/components/VideoReelPhone.jsx', import.meta.url), 'utf8')
  assert.match(source, /position === index && started \? <iframe/)
  assert.match(source, /function close\(\) \{\s*setStarted\(false\)\s*setIndex\(0\)\s*setOpen\(false\)/)
  assert.match(source, /if \(!open\) \{/)
  assert.match(source, /min-width: 1100px/)
  assert.match(source, /loading="lazy"/)
  assert.match(source, /useLayoutEffect\([\s\S]*?scrollTo\(\{ top: 0, behavior: 'instant' \}\)[\s\S]*?\[deck, open\]/)
  const css = readFileSync(new URL('../src/components/VideoReelPhone.css', import.meta.url), 'utf8')
  assert.match(css, /overflow-anchor: none/)
  const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
  assert.match(app, /\.\.\.listeningRoom.liveVideos/)
  assert.match(app, /\.\.\.eotd.sessions/)
})
