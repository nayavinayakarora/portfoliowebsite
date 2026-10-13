import { useEffect, useRef, useState } from 'react'
import { PixelHeroAudio } from './pixelHeroAudio'
import { PORTAL_PIXELS, pixelLayout } from './pixelPortrait'
import { drawPixelWorld, portalVisible, recordHandScratch, studioPixelOpacity } from './pixelWorld'
import { createPixelCharacter, SPRITE_SIZE } from './pixelCharacter'
import { createPixelPet, pixelPetLayout, drawPixelPets } from './pixelPets'

const FIXED_PARTS = new Set(['console', 'record-left', 'record-right', 'mixer', 'meter', 'guitar', 'tabla', 'synth', 'patch-cable'])

function StudioWordmark() {
  return <svg viewBox="0 0 44 16" aria-hidden="true" shapeRendering="crispEdges">{PORTAL_PIXELS.map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="0.88" height="0.88" />)}<path d="M38 9h5v5h-1v-3l-5 5-.7-.7 5-5H38z" /></svg>
}

export function HeroScene({ soundEnabled = true, dark = false }) {
  const shellRef = useRef(null)
  const canvasRef = useRef(null)
  const runtimeRef = useRef(null)
  const audioRef = useRef(null)
  const revealedRef = useRef(false)
  const interactionRef = useRef({ lastAt: -Infinity, touch: false, hovered: false, focused: false, failed: false })
  const darkRef = useRef(dark)
  const [revealed, setRevealed] = useState(false)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [awake, setAwake] = useState(false)

  const reveal = () => { revealedRef.current = true; setRevealed(true) }
  const focusPortal = (event) => {
    if (event.currentTarget.matches(':focus-visible')) { interactionRef.current.focused = true; reveal() }
  }
  const blurPortal = () => { interactionRef.current.focused = false }

  useEffect(() => { darkRef.current = dark }, [dark])

  useEffect(() => { if (audioRef.current) audioRef.current.setEnabled(soundEnabled) }, [soundEnabled])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) { setFailed(true); interactionRef.current.failed = true; reveal(); return }
    let frame = 0
    let lastFrame = 0
    let visible = true
    let width = 1
    let height = 1
    let layout
    let petsLayout
    const pixels = createPixelCharacter()
    const pets = { beagle: createPixelPet('beagle'), cat: createPixelPet('cat') }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const pointer = { x: -1000, y: -1000, active: false, movedAt: 0 }
    const runtime = { pointer, reduced: reduced.matches, layout: null, pixels: [], kick: 0, scroll: 0, portal: null, portalExposure: 0 }
    runtimeRef.current = runtime

    const resize = () => {
      const bounds = shellRef.current.getBoundingClientRect()
      width = bounds.width; height = bounds.height
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.imageSmoothingEnabled = false
      layout = pixelLayout(width, height)
      runtime.layout = layout; runtime.pixels = pixels
      const instructions = shellRef.current.querySelector('.pixel-hero-instructions').getBoundingClientRect()
      petsLayout = pixelPetLayout(width, height, layout, instructions.right - bounds.left)
      pixels.forEach((pixel) => { pixel.x = layout.left + pixel.u * layout.size; pixel.y = layout.top + pixel.v * layout.size })
      runtime.portal = { x: layout.left + layout.size * (width < 760 ? 0.32 : 0.35), y: layout.top + layout.size * (width < 760 ? 0.64 : 0.71), width: layout.size * 0.38 }
      shellRef.current.style.setProperty('--portal-left', `${runtime.portal.x}px`)
      shellRef.current.style.setProperty('--portal-top', `${runtime.portal.y}px`)
      shellRef.current.style.setProperty('--portal-width', `${runtime.portal.width}px`)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(shellRef.current)
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting })
    intersection.observe(shellRef.current)
    const onScroll = () => {
      const rect = shellRef.current.getBoundingClientRect()
      runtime.scroll = Math.max(0, Math.min(1, -rect.top / height))
    }
    const onReduced = () => { runtime.reduced = reduced.matches }
    reduced.addEventListener('change', onReduced)
    window.addEventListener('scroll', onScroll, { passive: true })
    resize()
    setReady(true)

    const draw = (now) => {
      frame = requestAnimationFrame(draw)
      if (!visible || document.hidden || now - lastFrame < 32) return
      const dt = Math.min(2, (now - (lastFrame || now - 33)) / 33)
      lastFrame = now
      ctx.clearRect(0, 0, width, height)
      const time = runtime.reduced ? 0 : now / 1000
      drawPixelWorld(ctx, width, height, { time, dark: darkRef.current, mobile: width < 760 })
      const unit = layout.size / layout.resolution
      const handScratch = recordHandScratch(time, runtime.reduced) * unit
      const radius = width < 760 ? 58 : 80
      const portal = runtime.portal
      if (pointer.active && pointer.x >= portal.x && pointer.x <= portal.x + portal.width && pointer.y >= portal.y && pointer.y <= portal.y + portal.width * 16 / 44) {
        interactionRef.current.lastAt = now
      }
      const exposureTarget = portalVisible(interactionRef.current, now) ? 1 : 0
      runtime.portalExposure = runtime.reduced ? exposureTarget : runtime.portalExposure + (exposureTarget - runtime.portalExposure) * (1 - 0.82 ** dt)
      let touched = 0
      let closest = null
      let nearest = radius * radius
      for (const pixel of pixels) {
        const head = pixel.part === 'head'
        const fixed = FIXED_PARTS.has(pixel.part)
        const scratchWeight = pixel.part === 'hand-left' ? 1 : pixel.part === 'arm-left' ? Math.max(0, Math.min(1, (pixel.v * SPRITE_SIZE - 77) / 17)) : 0
        const sway = (runtime.reduced || fixed ? 0 : Math.sin(time * 0.9) * (head ? 2 : 0.6)) + handScratch * scratchWeight
        const idleFloat = runtime.reduced || fixed || scratchWeight > 0 ? 0 : Math.sin(time * 1.1 + pixel.u * 2) * (pixel.part === 'hand-right' ? 1.4 : 0.7)
        const float = idleFloat + handScratch * scratchWeight * 0.2 - runtime.scroll * 20
        let targetX = 0
        let targetY = 0
        const deltaX = pixel.x + pixel.dx - pointer.x
        const deltaY = pixel.y + pixel.dy - pointer.y
        const distanceSquared = deltaX * deltaX + deltaY * deltaY
        if (pointer.active && distanceSquared < radius * radius) {
          touched += 1
          if (distanceSquared < nearest) { closest = pixel; nearest = distanceSquared }
          if (!runtime.reduced) {
            const distance = Math.sqrt(distanceSquared)
            const force = (1 - distance / radius) * 58
            targetX += deltaX / Math.max(3, distance) * force
            targetY += deltaY / Math.max(3, distance) * force
          }
        }
        if (!runtime.reduced && runtime.kick > 0) {
          targetX += Math.sin(pixel.seed) * runtime.kick * 35
          targetY += Math.cos(pixel.seed) * runtime.kick * 24
        }
        if (runtime.reduced) {
          pixel.dx = targetX; pixel.dy = targetY; pixel.vx = 0; pixel.vy = 0
        } else {
          pixel.vx = (pixel.vx + (targetX - pixel.dx) * 0.065 * dt) * 0.72 ** dt
          pixel.vy = (pixel.vy + (targetY - pixel.dy) * 0.065 * dt) * 0.72 ** dt
          pixel.dx += pixel.vx * dt; pixel.dy += pixel.vy * dt
        }
        ctx.fillStyle = pixel.part === 'meter' && Math.sin(time * 4 + pixel.v * 100) < -0.2 ? '#454632' : pixel.colour
        pixel.renderX = Math.round(pixel.x + pixel.dx + sway)
        pixel.renderY = Math.round(pixel.y + pixel.dy + float)
        pixel.renderAlpha = studioPixelOpacity(pixel, portal, runtime.portalExposure)
        ctx.globalAlpha = pixel.renderAlpha
        ctx.fillRect(pixel.renderX, pixel.renderY, Math.ceil(unit), Math.ceil(unit))
      }
      ctx.globalAlpha = 1
      drawPixelPets(ctx, pets, petsLayout, time, runtime.reduced, darkRef.current)
      runtime.kick *= 0.9 ** dt
      if (touched > 4) {
        if (pointer.active && now - pointer.movedAt < 150) interactionRef.current.lastAt = pointer.movedAt
        if (closest && now - pointer.movedAt < 100) audioRef.current?.play(closest.u, closest.v, closest.part)
      }
      const nextRevealed = portalVisible(interactionRef.current, now)
      if (nextRevealed !== revealedRef.current) { revealedRef.current = nextRevealed; setRevealed(nextRevealed) }
    }
    frame = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); intersection.disconnect()
      reduced.removeEventListener('change', onReduced); window.removeEventListener('scroll', onScroll)
      runtimeRef.current = null
    }
  }, [])

  useEffect(() => () => audioRef.current?.dispose(), [])

  const move = (event) => {
    const bounds = canvasRef.current.getBoundingClientRect()
    const pointer = runtimeRef.current?.pointer
    if (pointer) { pointer.x = event.clientX - bounds.left; pointer.y = event.clientY - bounds.top; pointer.active = true; pointer.movedAt = performance.now() }
    interactionRef.current.touch = event.pointerType !== 'mouse'
  }

  const wake = async (event) => {
    if (event?.clientX !== undefined) move(event)
    else interactionRef.current.touch = true
    interactionRef.current.lastAt = performance.now()
    reveal()
    if (runtimeRef.current) runtimeRef.current.kick = 1
    if (!soundEnabled) return
    if (!audioRef.current) audioRef.current = new PixelHeroAudio()
    audioRef.current.setEnabled(soundEnabled)
    try {
      const unlocked = await audioRef.current.unlock()
      if (unlocked) { setAwake(true); audioRef.current.play(0.5, 0.5) }
    } catch { setAwake(false) }
  }

  return (
    <div ref={shellRef} className={`pixel-hero-scene${ready ? ' ready' : ''}${revealed ? ' revealed' : ''}`}>
      {!ready && !failed && <span className="pixel-loading">Assembling the pixels…</span>}
      {failed && <span className="pixel-loading">Enter the studio below.</span>}
      <div className="pixel-studio-art" aria-hidden="true"><StudioWordmark /></div>
      <canvas ref={canvasRef} role="img" aria-label="Animated 2D pixel character of Vinayak Arora wearing dark sunglasses and headphones, mixing on two turntables. A pair of tablas, an analogue synth with colourful patch cables, and a guitar surround him. A tricolour beagle and a white-and-tabby cat with a very short tail groove nearby. Brush or tap the pixels to reveal the studio." onPointerMove={move} onPointerDown={wake} onPointerLeave={(event) => { if (runtimeRef.current) runtimeRef.current.pointer.active = false; if (event.pointerType === 'mouse') interactionRef.current.lastAt = -Infinity }} onPointerUp={(event) => { if (event.pointerType !== 'mouse' && runtimeRef.current) runtimeRef.current.pointer.active = false }} onPointerCancel={() => { if (runtimeRef.current) runtimeRef.current.pointer.active = false; interactionRef.current.lastAt = -Infinity }} />
      <a className="pixel-studio-portal" href="?view=studio" aria-label="Explore Studio: Enter the playroom" onFocus={focusPortal} onBlur={blurPortal} onPointerMove={move} onPointerEnter={(event) => { if (event.pointerType === 'mouse') { interactionRef.current.hovered = true; move(event); reveal() } }} onPointerLeave={() => { interactionRef.current.hovered = false; interactionRef.current.lastAt = performance.now(); if (runtimeRef.current) runtimeRef.current.pointer.active = false }}>
        <span>Enter the playroom<svg className="pixel-studio-chevron" viewBox="0 0 12 12" aria-hidden="true"><path d="M1 5h7V3h2v2h2v2h-2v2H8V7H1z" /></svg></span>
      </a>
      <div className="pixel-hero-instructions"><button type="button" data-sound-variant="random" onFocus={focusPortal} onBlur={blurPortal} onClick={() => wake()}>{revealed ? (soundEnabled && !awake ? 'Tap to hear the pixels' : 'Scatter the pixels') : 'Touch the pixels. Find the studio.'}<span aria-hidden="true">↗</span></button><span className="pixel-sound-state" aria-live="polite">{!soundEnabled ? 'Sound off' : awake ? 'Sound ready. Brush the pixels.' : 'Sound starts with a tap'}</span></div>
    </div>
  )
}
