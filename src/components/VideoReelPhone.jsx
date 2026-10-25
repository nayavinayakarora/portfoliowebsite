import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { reelEmbedUrl, reelIndex, shuffleReelVideos } from '../videoReel'
import './VideoReelPhone.css'

function ReelIcon({ kind }) {
  const paths = {
    phone: 'M7 2h10v20H7z M10 19h4',
    close: 'M6 6l12 12 M18 6L6 18',
    up: 'M5 15l7-7 7 7',
    down: 'M5 9l7 7 7-7',
    shuffle: 'M3 6h3c5 0 7 12 12 12h3 M17 14l4 4-4 4 M3 18h3c2 0 3-2 4-4 M14 8c1-1 2-2 4-2h3 M17 2l4 4-4 4',
    play: 'M9 5l11 7-11 7z',
  }
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[kind]} /></svg>
}

export default function VideoReelPhone({ videos }) {
  const [open, setOpen] = useState(() => window.matchMedia('(min-width: 1100px) and (min-height: 650px)').matches)
  const [deck, setDeck] = useState(() => shuffleReelVideos(videos))
  const [index, setIndex] = useState(0)
  const [started, setStarted] = useState(false)
  const feedRef = useRef(null)
  const railRef = useRef(null)
  const launcherRef = useRef(null)
  const hadOpenRef = useRef(open)
  const frameRef = useRef(0)
  const touchYRef = useRef(null)
  const video = deck[index]

  useLayoutEffect(() => {
    // Reset after keyed slides move; otherwise scroll anchoring can keep the old video in view.
    if (open) feedRef.current?.scrollTo({ top: 0, behavior: 'instant' })
  }, [deck, open])

  useEffect(() => {
    if (open) hadOpenRef.current = true
    else if (hadOpenRef.current) launcherRef.current?.focus({ preventScroll: true })
  }, [open])

  useEffect(() => () => cancelAnimationFrame(frameRef.current), [])

  useEffect(() => {
    if (!open) return
    const rail = railRef.current
    if (!rail) return
    let distance = 0
    let lastAt = 0
    let lockedUntil = 0
    const wheel = (event) => {
      if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return
      event.preventDefault()
      const now = performance.now()
      if (now < lockedUntil) return
      if (now - lastAt > 180) distance = 0
      distance += event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 200 : 1)
      lastAt = now
      if (Math.abs(distance) < 35) return
      const feed = feedRef.current
      const current = reelIndex(feed.scrollTop, feed.clientHeight, deck.length)
      const next = Math.min(deck.length - 1, Math.max(0, current + Math.sign(distance)))
      feed.scrollTo({ top: next * feed.clientHeight, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
      distance = 0
      lockedUntil = now + 450
    }
    rail.addEventListener('wheel', wheel, { passive: false })
    return () => rail.removeEventListener('wheel', wheel)
  }, [open, deck.length])

  function navigate(direction) {
    const feed = feedRef.current
    const next = Math.min(deck.length - 1, Math.max(0, index + direction))
    feed.scrollTo({ top: next * feed.clientHeight, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }

  function handleScroll() {
    cancelAnimationFrame(frameRef.current)
    frameRef.current = requestAnimationFrame(() => {
      const feed = feedRef.current
      if (feed) setIndex(reelIndex(feed.scrollTop, feed.clientHeight, deck.length))
    })
  }

  function reshuffle() {
    setDeck(shuffleReelVideos(videos, video.id))
    setIndex(0)
    feedRef.current?.scrollTo({ top: 0, behavior: 'instant' })
  }

  function close() {
    setStarted(false)
    setIndex(0)
    setOpen(false)
  }

  if (!video) return null

  if (!open) {
    return <button ref={launcherRef} type="button" className="reel-launcher" onClick={() => setOpen(true)} aria-label="Open video reels" aria-expanded="false" aria-controls="video-reel-phone"><ReelIcon kind="phone" /></button>
  }

  return (
    <aside className="reel-phone" id="video-reel-phone" aria-label="Video reels" onKeyDown={(event) => {
      if (event.key === 'Escape') close()
      if (event.target.closest('button, a, iframe')) return
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        navigate(event.key === 'ArrowDown' ? 1 : -1)
      }
    }}>
      <div className="reel-phone-top"><span className="reel-brand">On shuffle</span><span className="reel-speaker" aria-hidden="true" /><button type="button" onClick={close} aria-label="Hide video reels"><ReelIcon kind="close" /></button></div>
      <div className="reel-feed" ref={feedRef} onScroll={handleScroll} tabIndex="0" aria-label="Video reel feed. Swipe vertically, or use the arrow buttons.">
        {deck.map((item, position) => <article className="reel-slide" key={item.id} aria-label={item.title} aria-hidden={position !== index} aria-current={position === index ? 'true' : undefined}>
          <div className="reel-media">
            {position === index && started ? <iframe key={item.id} title={`Reel: ${item.title}`} src={reelEmbedUrl(item.id)} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /> : <button type="button" className="reel-poster" tabIndex={position === index ? 0 : -1} onClick={() => { setIndex(position); setStarted(true) }} aria-label={`Play ${item.title}`}>
              {Math.abs(position - index) <= 1 && <img src={item.image} alt="" loading="lazy" decoding="async" />}
              <span className="reel-play"><ReelIcon kind="play" /></span>
            </button>}
          </div>
          <div className="reel-caption"><span>{item.category}</span><strong>{item.title}</strong></div>
        </article>)}
      </div>
      <div className="reel-swipe-rail" ref={railRef} aria-hidden="true" onTouchStart={(event) => { touchYRef.current = event.touches[0].clientY }} onTouchEnd={(event) => {
        if (touchYRef.current === null) return
        const delta = touchYRef.current - event.changedTouches[0].clientY
        if (Math.abs(delta) > 24) navigate(delta > 0 ? 1 : -1)
        touchYRef.current = null
      }}><span>↕</span><span className="reel-rail-dots">·<br />·<br />·</span></div>
      <div className="reel-footer">
        <button type="button" onClick={() => navigate(-1)} disabled={index === 0} aria-label="Previous reel"><ReelIcon kind="up" /></button>
        <button type="button" onClick={reshuffle} aria-label="Shuffle video reels"><ReelIcon kind="shuffle" /></button>
        <button type="button" onClick={() => navigate(1)} disabled={index === deck.length - 1} aria-label="Next reel"><ReelIcon kind="down" /></button>
        <a href={video.href} target="_blank" rel="noreferrer" aria-label={`Watch ${video.title} on YouTube`}>YouTube ↗</a>
      </div>
      <span className="reel-home-bar" aria-hidden="true" />
      <span className="reel-announcement" role="status" aria-live="polite">{video.title}</span>
    </aside>
  )
}
