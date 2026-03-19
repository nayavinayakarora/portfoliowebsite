import { useMemo, useState } from 'react'
import { HeroScene } from './HeroScene'
import { useAudioReactive } from '../../useAudioReactive'

const layers = [
  {
    title: 'Released Music',
    description: 'Outer orbit where finished work radiates outward into the portfolio.',
  },
  {
    title: 'Sound Design',
    description: 'Waveform membranes, timbral sculpting, and detail-rich sonic surfaces.',
  },
  {
    title: 'Game Audio',
    description: 'Interactive nodes where systems adapt, respond, and stay alive in motion.',
  },
  {
    title: 'Research',
    description: 'Frequency shells and spatial experiments that inform the broader practice.',
  },
  {
    title: 'Identity Core',
    description: 'The innermost intelligence where composition, teaching, and technology converge.',
  },
]

export function LivingSoundHero() {
  const [audioReactiveEnabled, setAudioReactiveEnabled] = useState(false)
  const { audioDataRef, status } = useAudioReactive(audioReactiveEnabled)

  const heroActions = useMemo(
    () => [
      { label: 'Explore featured work', href: '#featured', primary: true },
      { label: 'Jump to contact', href: '#contact', primary: false },
    ],
    [],
  )

  return (
    <section className="entity-page" aria-labelledby="living-sound-title">
      <div className="entity-scroll-shell">
        <section className="entity-hero-sticky" id="top">
          <HeroScene
            audioDataRef={audioDataRef}
            audioReactiveEnabled={audioReactiveEnabled}
          />

          <div className="entity-overlay">
            <p className="entity-kicker">Cinematic 3D Hero</p>
            <h1 id="living-sound-title">The Living Sound Entity</h1>
            <p className="entity-subtitle">
              A living musical intelligence visualized as a connected organism of composition,
              sound design, game audio, research, teaching, and technology.
            </p>

            <div className="entity-actions">
              {heroActions.map((action) => (
                <a
                  key={action.label}
                  className={action.primary ? 'entity-action primary' : 'entity-action'}
                  href={action.href}
                >
                  {action.label}
                </a>
              ))}
            </div>

            <button
              type="button"
              className={`audio-toggle${audioReactiveEnabled ? ' active' : ''}`}
              onClick={() => setAudioReactiveEnabled((current) => !current)}
            >
              {audioReactiveEnabled ? 'Disable Audio Reactive' : 'Enable Audio Reactive'}
            </button>
            <p className="audio-status">{status}</p>
          </div>
        </section>

        <section className="entity-depth-track" aria-label="Living Sound Entity layers">
          {layers.map((layer) => (
            <article key={layer.title} className="layer-panel">
              <p className="layer-step">{layer.title}</p>
              <p className="layer-text">{layer.description}</p>
            </article>
          ))}
        </section>
      </div>
    </section>
  )
}
