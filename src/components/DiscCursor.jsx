import { useEffect, useRef } from 'react'
import './DiscCursor.css'
import { CD_CURSOR_PIXELS } from './discCursorArt'

const NATIVE_TARGETS = 'input:not([type="range"]), textarea, select, [contenteditable]:not([contenteditable="false"]), iframe, :disabled, [aria-disabled="true"]'
const CLICK_TARGETS = 'a[href], button, summary, input[type="range"], [role="button"], [role="tab"], canvas'

export function DiscCursor() {
  const cursorRef = useRef(null)

  useEffect(() => {
    const cursor = cursorRef.current
    const root = document.documentElement
    const enabled = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 760px) and (forced-colors: none)')
    let frame = 0
    let x = 0
    let y = 0
    let overControl = false

    const hide = () => {
      cancelAnimationFrame(frame)
      frame = 0
      cursor.dataset.visible = 'false'
      cursor.dataset.pressed = 'false'
      delete root.dataset.discCursorActive
    }
    const paint = () => {
      frame = 0
      cursor.style.transform = `translate3d(${x - 17}px, ${y - 17}px, 0)`
      cursor.dataset.interactive = String(overControl)
      cursor.dataset.visible = 'true'
      root.dataset.discCursorActive = 'true'
    }
    const move = (event) => {
      if (!enabled.matches || event.pointerType !== 'mouse' || !(event.target instanceof Element) || event.target.closest(NATIVE_TARGETS)) {
        hide()
        return
      }
      x = event.clientX
      y = event.clientY
      overControl = Boolean(event.target.closest(CLICK_TARGETS))
      if (!frame) frame = requestAnimationFrame(paint)
    }
    const press = (event) => {
      if (event.pointerType !== 'mouse') { hide(); return }
      if (cursor.dataset.visible === 'true') cursor.dataset.pressed = 'true'
    }
    const release = () => { cursor.dataset.pressed = 'false' }
    const keyboard = (event) => { if (event.key === 'Tab' || event.key === 'Escape') hide() }
    const exit = (event) => { if (!event.relatedTarget || (event.relatedTarget instanceof Element && event.relatedTarget.closest('iframe'))) hide() }
    const visibility = () => { if (document.hidden) hide() }

    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerdown', press, { passive: true })
    window.addEventListener('pointerup', release, { passive: true })
    window.addEventListener('pointercancel', hide)
    window.addEventListener('blur', hide)
    window.addEventListener('keydown', keyboard)
    document.addEventListener('pointerout', exit)
    document.addEventListener('visibilitychange', visibility)
    enabled.addEventListener('change', hide)
    return () => {
      hide()
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerdown', press)
      window.removeEventListener('pointerup', release)
      window.removeEventListener('pointercancel', hide)
      window.removeEventListener('blur', hide)
      window.removeEventListener('keydown', keyboard)
      document.removeEventListener('pointerout', exit)
      document.removeEventListener('visibilitychange', visibility)
      enabled.removeEventListener('change', hide)
    }
  }, [])

  return (
    <div ref={cursorRef} className="disc-cursor" data-visible="false" aria-hidden="true">
      <svg className="disc-cursor-ring" viewBox="0 0 34 34" shapeRendering="crispEdges">
        {CD_CURSOR_PIXELS.map(pixel => <rect key={`${pixel.x}-${pixel.y}`} x={pixel.x} y={pixel.y} width="2" height="2" fill={pixel.colour} fillOpacity={pixel.opacity} />)}
      </svg>
      <span className="disc-cursor-dot" />
    </div>
  )
}
