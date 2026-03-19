import { useEffect, useRef, useState } from 'react'

const SPECTRUM_BANDS = 32

export function useAudioReactive(enabled) {
  const audioDataRef = useRef({
    active: false,
    level: 0,
    bass: 0,
    spectrum: Array.from({ length: SPECTRUM_BANDS }, () => 0),
  })

  const [status, setStatus] = useState('Audio reactive mode: off')

  useEffect(() => {
    if (!enabled) {
      audioDataRef.current.active = false
      setStatus('Audio reactive mode: off')
      return undefined
    }

    if (!navigator?.mediaDevices?.getUserMedia) {
      setStatus('Audio reactive mode unavailable on this browser')
      audioDataRef.current.active = false
      return undefined
    }

    let cancelled = false
    let stream = null
    let context = null
    let analyser = null
    let source = null
    let frame = 0
    let frequencyData = null

    const update = () => {
      if (cancelled || !analyser || !frequencyData) return

      analyser.getByteFrequencyData(frequencyData)

      let sum = 0
      for (let index = 0; index < frequencyData.length; index += 1) {
        sum += frequencyData[index]
      }
      const overall = sum / (frequencyData.length * 255)

      let bassSum = 0
      const bassBins = Math.max(1, Math.floor(frequencyData.length * 0.12))
      for (let index = 0; index < bassBins; index += 1) {
        bassSum += frequencyData[index]
      }
      const bass = bassSum / (bassBins * 255)

      const binsPerBand = Math.max(1, Math.floor(frequencyData.length / SPECTRUM_BANDS))
      for (let band = 0; band < SPECTRUM_BANDS; band += 1) {
        let bandSum = 0
        let count = 0
        const start = band * binsPerBand
        const end = Math.min(frequencyData.length, start + binsPerBand)
        for (let index = start; index < end; index += 1) {
          bandSum += frequencyData[index]
          count += 1
        }
        const incoming = count ? bandSum / (count * 255) : 0
        audioDataRef.current.spectrum[band] = (audioDataRef.current.spectrum[band] * 0.82) + (incoming * 0.18)
      }

      audioDataRef.current.level = (audioDataRef.current.level * 0.8) + (overall * 0.2)
      audioDataRef.current.bass = (audioDataRef.current.bass * 0.78) + (bass * 0.22)
      audioDataRef.current.active = true
      frame = window.requestAnimationFrame(update)
    }

    const boot = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        })

        if (cancelled) return

        context = new window.AudioContext()
        analyser = context.createAnalyser()
        analyser.fftSize = 256
        analyser.smoothingTimeConstant = 0.84

        source = context.createMediaStreamSource(stream)
        source.connect(analyser)

        frequencyData = new Uint8Array(analyser.frequencyBinCount)
        setStatus('Audio reactive mode: listening to microphone')
        update()
      } catch {
        setStatus('Microphone access denied, running in cinematic idle mode')
        audioDataRef.current.active = false
      }
    }

    boot()

    return () => {
      cancelled = true
      if (frame) window.cancelAnimationFrame(frame)
      if (source) source.disconnect()
      if (stream) stream.getTracks().forEach((track) => track.stop())
      if (context) context.close()
      audioDataRef.current.active = false
    }
  }, [enabled])

  return { audioDataRef, status }
}
