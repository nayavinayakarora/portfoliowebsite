import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { SiteAudioEngine } from './audioEngine'

const signalLinks = [
  { label: 'Instagram', href: 'https://www.instagram.com/vinayak.arora/' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/vinayak-arora-26735312b/' },
  { label: 'Buy Me a Coffee', href: 'https://buymeacoffee.com/vinayakarora' },
  {
    label: 'Resume PDF',
    href: 'https://media.journoportfolio.com/users/413008/uploads/935497f9-de02-4171-a069-57d961a23c8e.pdf',
  },
]

const featuredCollections = [
  {
    id: 'personal',
    label: 'Personal Projects',
    eyebrow: 'Original music, synthesis, and experiments',
    intro:
      'Original works across synthesis, songwriting, immersive listening, and research-led experimentation.',
    items: [
      {
        title: 'Masters Project Overview',
        date: 'September 20, 2024',
        role: 'Research overview',
        blurb: 'A project overview tying together the larger Master’s body of work.',
        href: 'https://youtu.be/9kBb9KZOvAk',
        image:
          'https://media.journoportfolio.com/users/413008/images/2042128a-db1f-40c3-8294-86221857efec_max-600.jpg',
      },
      {
        title: 'Synth Fest',
        date: 'September 19, 2024',
        role: 'Modular and self-built instruments',
        blurb:
          'A performance-focused synthesis piece using Max patches, VCV Rack calibration, and modular systems.',
        href: 'https://youtu.be/hEikqy9pQBQ',
        image:
          'https://media.journoportfolio.com/users/413008/images/f29f706d-db7a-43cb-8017-cb24a036127e_max-600.jpg',
      },
      {
        title: 'Mata-e-Gair (Binaural)',
        date: 'September 19, 2024',
        role: 'Immersive listening piece',
        blurb: 'A headphone-first binaural work built around immersive spatial perception.',
        href: 'https://youtu.be/LzFbgUhEbPE?si=rRX86RfLbKTybPD0',
        image:
          'https://media.journoportfolio.com/users/413008/images/3e785a6f-36cf-4065-b8f4-957030c7fe14_max-600.jpg',
      },
      {
        title: 'Bassify',
        date: 'September 18, 2024',
        role: 'Max instrument design',
        blurb:
          'A bass-vocal harmonizer built in Max using pitch detection, synthesis, polyphony, and effects.',
        href: 'https://youtu.be/dJiPfBLYSCg',
        image:
          'https://media.journoportfolio.com/users/413008/images/84b25610-7db8-4917-a92b-fcb86a7e5a09_max-600.jpg',
      },
      {
        title: 'Innerspace Sound Design Overview',
        date: 'September 18, 2024',
        role: 'Game audio process',
        blurb:
          'An overview of creating and implementing sound design and music for the FPS game Innerspace.',
        href: 'https://youtu.be/FBYeA4uXRlI',
        image:
          'https://media.journoportfolio.com/users/413008/images/4f848926-7a5d-4589-839f-d169d3a0143c_max-600.jpg',
      },
      {
        title: 'Kaafile Bahaaron Ke',
        date: 'September 18, 2024',
        role: 'Analogue production study',
        blurb:
          'A making-of exploration covering composition, arrangement, production, mixing, and mastering.',
        href: 'https://youtu.be/RD__mfZLgRo',
        image:
          'https://media.journoportfolio.com/users/413008/images/a668a488-cb1e-4620-ae21-f339ea5d6719_max-600.jpg',
      },
      {
        title: 'Fuzzy Cuddly Scrampadoodlicious',
        date: 'January 10, 2023',
        role: 'Original release',
        blurb: 'An official YouTube Topic release from your original catalog.',
        href: 'https://www.youtube.com/watch?v=I9PoD2GzJ-Q&ab_channel=VinayakArora-Topic',
        image:
          'https://media.journoportfolio.com/users/413008/images/63b481c8-bfca-43f1-9c0d-cc0c9ff0a667_max-600.jpg',
      },
      {
        title: 'F*ck You (feat. Apoorva Malik & Khushi Pallavi)',
        date: 'April 4, 2022',
        role: 'Official audio',
        blurb: 'A direct link to the official audio release on YouTube.',
        href: 'https://youtu.be/BxttGECt_iI',
        image:
          'https://media.journoportfolio.com/users/413008/images/c8136e2d-519a-47ce-9517-47da8b35b3d9_max-600.jpg',
      },
      {
        title: 'Aadmi Bann Zara',
        date: 'August 21, 2021',
        role: 'Debut single',
        blurb:
          'A debut single with streaming links to Apple Music, Spotify, and Amazon Music.',
        href: 'https://youtu.be/V_6hWmnEj_o',
        image:
          'https://media.journoportfolio.com/users/413008/images/b835e32f-478f-454d-ad75-65073d436ee3_max-600.jpg',
        supportingLinks: [
          {
            label: 'Apple Music',
            href: 'https://music.apple.com/in/album/aadmi-bann-zara/1581182881?i=1581182882',
          },
          {
            label: 'Spotify',
            href: 'https://open.spotify.com/track/2pZwlQWIfXTNZaNU5SRpOX?si=3556345b8f8b4ae2',
          },
          {
            label: 'Amazon Music',
            href: 'https://music.amazon.in/albums/B09CLQY8VV?trackAsin=B09CLRYB5H&ref=dm_sh_ZVg5cYuythbPqiLVhIpE6AY2u',
          },
        ],
      },
    ],
  },
  {
    id: 'moving-picture',
    label: 'Moving Picture',
    eyebrow: 'Film, fashion, ads, and screen-led sound work',
    intro:
      'Selected sound design, score, foley, and audio integration work for screen-based projects.',
    items: [
      {
        title: 'Innerspace Gameplay - Game Audio and Music Portfolio',
        date: 'June 23, 2024',
        role: 'Gameplay reel',
        blurb: 'Sound design, music composition, and audio integration using Logic Pro X, Unity, and FMOD.',
        href: 'https://youtu.be/0yA1k-tsfcQ',
        image:
          'https://media.journoportfolio.com/users/413008/images/922f0611-d611-4daa-8002-44ca80f203c2_max-600.jpg',
      },
      {
        title: 'VR Video | Fashion',
        date: 'March 21, 2024',
        role: 'Sound design for VR',
        blurb: 'A fashion-focused VR sound design piece.',
        href: 'https://youtu.be/GUIdbRZ8I54',
        image:
          'https://media.journoportfolio.com/users/413008/images/4181fce5-6970-4193-bfd7-73201d3d8dc7_max-600.jpg',
      },
      {
        title: 'Short Film Khwaab',
        date: 'May 10, 2021',
        role: 'Score, sound design, and foley',
        blurb: 'Score, sound design, and foley for a client short film via TeevraMa Studio.',
        href: 'https://www.youtube.com/watch?v=-mc0_TlhVhc',
        image:
          'https://media.journoportfolio.com/users/413008/images/2ce15937-124c-4410-ac6d-835afb8fd88f_max-600.jpg',
      },
      {
        title: 'Sound Design / Foley',
        date: 'May 10, 2021',
        role: 'Portfolio recreation',
        blurb: 'A portfolio sound design remake for a famous ad campaign.',
        href: 'https://www.youtube.com/watch?v=HHn6owNK-Uw',
        image:
          'https://media.journoportfolio.com/users/413008/images/1d7f229d-a4ad-4f55-9a84-b4510a601b9d_max-600.jpg',
      },
      {
        title: 'Digital Ad - Sound Design and Mix',
        date: 'May 10, 2021',
        role: 'Ad sound redesign',
        blurb: 'A full redesign of a famous ad’s sonic identity and mix.',
        href: 'https://www.youtube.com/watch?v=uLXB5mLphvI',
        image:
          'https://media.journoportfolio.com/users/413008/images/7d95c1aa-c367-4ad3-8ec9-cb7f2abac1b0_max-600.jpg',
      },
    ],
  },
  {
    id: 'students',
    label: 'Student Performances',
    eyebrow: 'Mentoring and recital work',
    intro:
      'Mentored performances and recital work shaped through artist development, direction, and production.',
    items: [
      {
        title: 'Kriti Sethia covers Easy on Me',
        date: 'October 15, 2022',
        role: 'Fall recital 2022',
        blurb: 'A 13-year-old student performance produced, shot, recorded, and mixed through your studio ecosystem.',
        href: 'https://youtu.be/MQY2nrHHRk0',
        image:
          'https://media.journoportfolio.com/users/413008/images/ac9d59b2-d0fc-4486-a5b5-bdf2c74cd6bb_max-600.jpg',
        supportingLinks: [{ label: 'TeevraMa Studio', href: 'https://www.instagram.com/teevramastudio/' }],
      },
      {
        title: 'Crazy (Cover) | Summer Recital 22',
        date: 'June 21, 2022',
        role: 'Student performance',
        blurb: 'A recital cover highlighting mentorship and performance polish.',
        href: 'https://youtu.be/P5D4mGURCR8',
        image:
          'https://media.journoportfolio.com/users/413008/images/2493f1b5-baa3-441f-a2fc-42bced574459_max-600.jpg',
        supportingLinks: [{ label: 'TeevraMa Studio', href: 'https://www.instagram.com/teevramastudio/' }],
      },
    ],
  },
]

const games = [
  {
    title: 'Cluck Yeah',
    note: 'Download via Gamegrafter’s Collective.',
    image: 'https://media.journoportfolio.com/users/413008/images/102e8c4b-1218-4730-a589-6ff3c68b8e87.png',
    links: [
      {
        label: 'Play Store',
        href: 'https://play.google.com/store/apps/details?id=com.GamecraftersCollective.CluckYeah&pcampaignid=web_share',
      },
      {
        label: 'App Store',
        href: 'https://apps.apple.com/in/app/cluck-yeah-endless-flyer/id6737695893',
      },
    ],
  },
]

const listeningRoom = {
  playlist: 'https://open.spotify.com/embed/playlist/4ajl5hUTFsev0qqEiJrmhQ?si=ee606a00f17a4473&utm_source=oembed',
  vocalArrangements: [
    'https://open.spotify.com/embed/track/5Uzx2UcwkheIqUAJy9HpBw?si=ea1ccd864f5a46ef&utm_source=oembed',
    'https://open.spotify.com/embed/track/1YQxlAnSeIaKb7POP2y6Vm?si=c7395d40999d4e68&utm_source=oembed',
    'https://open.spotify.com/embed/track/7cX2eDkTm0RRpcQOyhkbO0?si=4fb5fb9d8%2B4fd4530&utm_source=oembed',
    'https://open.spotify.com/embed/track/4Jdktu4oqI3YQDAaAeE24R?si=2d49f85948464a19&utm_source=oembed',
  ],
  liveVideos: [
    {
      title: 'Queen Acapella | Tribute to Freddie Mercury | Live at TEDX IIIT Delhi',
      href: 'https://www.youtube.com/embed/--2P_crmRKI?feature=oembed',
    },
    {
      title: 'Linkin Park Acapella | A tribute to Chester Bennington | Live at TEDXDTU',
      href: 'https://www.youtube.com/embed/LpYtlVjOlk0?feature=oembed',
    },
    {
      title: 'Vinayak and Manas - Khwaja Mere Khwaja',
      href: 'https://www.youtube.com/embed/Zl6tg2QAb6A?feature=oembed',
    },
    {
      title: 'AR Rahman - Tu Hi Re (Live)',
      href: 'https://www.youtube.com/embed/A1YpkFZY008?feature=oembed',
    },
  ],
  audioMasters: [
    'https://open.spotify.com/embed/track/3XncC2LfuurDCrljYLRSsk?si=3a4bf2d5b79c4f90&utm_source=oembed',
    'https://open.spotify.com/embed/track/3yNi20rdbNlZiJ3WJ90KCm?si=04125b2d1a1%2B640a6&utm_source=oembed',
    'https://open.spotify.com/embed/track/6iCRkCjvcftrvalseM67VX?si=c4b1a6346d7e4%2B4fb&utm_source=oembed',
  ],
  production: [
    'https://open.spotify.com/embed/track/2Irmz3r0YhxeqgvfePAYlp?si=33e126f415684e04&utm_source=oembed',
    'https://open.spotify.com/embed/track/435ZpMDOMhgTovMiG7HW0y?si=67c3479625c041fb&utm_source=oembed',
    'https://open.spotify.com/embed/track/6Bzjz8l59MJUPMW1doUGMu?si=e05a205064724ad6&utm_source=oembed',
    'https://open.spotify.com/embed/track/1XqFhInrkxdsWiv6KGPrnw?si=062678ec002%2B04169&utm_source=oembed',
    'https://open.spotify.com/embed/track/6y2a5Xx2FWw5503LFYe4ej?si=20fcd9459aff%2B4ee8&utm_source=oembed',
  ],
}

const services = [
  'Sound Design',
  'Music Production',
  'Music Composition',
  'Mixing',
  'Mastering',
  'Dolby Atmos Mixing',
  'Game Sound Design',
  'Game Music',
]

const STORAGE_SOUND = 'vinay-portfolio-sound-enabled'
const STORAGE_EXPERIENCE = 'vinay-portfolio-experience-mode'

function App() {
  const shellRef = useRef(null)
  const engineRef = useRef(null)
  const [activeCollection, setActiveCollection] = useState(featuredCollections[0].id)
  const [activeAudioPanel, setActiveAudioPanel] = useState('vocal')
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem(STORAGE_SOUND) === 'true')
  const [experienceMode, setExperienceMode] = useState(() => localStorage.getItem(STORAGE_EXPERIENCE) === 'true')
  const [activeSection, setActiveSection] = useState('top')

  const ensureEngine = () => {
    if (!engineRef.current) {
      try {
        engineRef.current = new SiteAudioEngine()
      } catch (error) {
        console.error('Audio engine init failed:', error)
        return null
      }
    }
    return engineRef.current
  }

  useEffect(() => {
    const shell = shellRef.current
    if (!shell) {
      return undefined
    }

    const handlePointerMove = (event) => {
      const { clientX, clientY } = event
      shell.style.setProperty('--spotlight-x', `${clientX}px`)
      shell.style.setProperty('--spotlight-y', `${clientY}px`)
    }

    window.addEventListener('pointermove', handlePointerMove)
    return () => window.removeEventListener('pointermove', handlePointerMove)
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_SOUND, String(soundEnabled))
    if (engineRef.current) {
      engineRef.current.setEnabled(soundEnabled).catch((error) => {
        console.error('Audio enable failed:', error)
        setSoundEnabled(false)
      })
    }
  }, [soundEnabled])

  useEffect(() => {
    localStorage.setItem(STORAGE_EXPERIENCE, String(experienceMode))
    engineRef.current?.setExperienceMode(experienceMode)
  }, [experienceMode])

  useEffect(() => {
    engineRef.current?.setSection(activeSection)
  }, [activeSection])

  useEffect(() => {
    const ids = ['top', 'featured', 'listening-room', 'games', 'services', 'contact']
    const elements = ids.map((id) => document.getElementById(id)).filter(Boolean)

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]

        if (visible?.target?.id) {
          setActiveSection(visible.target.id)
        }
      },
      { threshold: [0.2, 0.45, 0.65] },
    )

    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [])

  useEffect(
    () => () => {
      engineRef.current?.dispose()
    },
    [],
  )

  const activeSectionData = useMemo(
    () => featuredCollections.find((section) => section.id === activeCollection) ?? featuredCollections[0],
    [activeCollection],
  )

  const audioPanels = useMemo(
    () => ({
      vocal: listeningRoom.vocalArrangements,
      masters: listeningRoom.audioMasters,
      production: listeningRoom.production,
      live: listeningRoom.liveVideos,
    }),
    [],
  )

  const audioTitles = {
    vocal: 'Vocal Arrangements & A capella Pieces',
    masters: 'Audio Masters',
    production: 'Production, Mix & Masters',
    live: 'Live Videos',
  }

  const attachHover = (index = 0) => ({
    onMouseEnter: () => engineRef.current?.playHover(index),
    onFocus: () => engineRef.current?.playHover(index),
  })

  const handleSoundToggle = async () => {
    const engine = ensureEngine()
    if (!engine) return
    const nextValue = !soundEnabled
    try {
      await engine.setEnabled(nextValue)
      setSoundEnabled(nextValue)
    } catch (error) {
      console.error('Sound toggle failed:', error)
      setSoundEnabled(false)
    }
  }

  const handleExperienceToggle = () => {
    const engine = ensureEngine()
    if (!engine) return
    engine.playFeedback('experience')
    setExperienceMode((current) => !current)
  }

  const handleNavClick = () => {
    ensureEngine()?.playNav()
  }

  const handleActionClick = () => {
    ensureEngine()?.playClick()
  }

  const handleCollectionSwitch = (sectionId) => {
    ensureEngine()?.playDropdown()
    setActiveCollection(sectionId)
  }

  const handleAudioSwitch = (panel) => {
    ensureEngine()?.playDropdown()
    setActiveAudioPanel(panel)
  }

  return (
    <div className="portfolio-shell" ref={shellRef}>
      <div className="audio-dock">
        <button
          type="button"
          className={`audio-chip${soundEnabled ? ' active' : ''}`}
          onClick={handleSoundToggle}
        >
          {soundEnabled ? 'Sound On' : 'Sound Off'}
        </button>
        <button
          type="button"
          className={`audio-chip secondary${experienceMode ? ' active' : ''}`}
          onClick={handleExperienceToggle}
        >
          {experienceMode ? 'Ambient Mode' : 'Ambient Off'}
        </button>
      </div>

      <header className="site-header">
        <a className="brand" href="#top" aria-label="Vinay Arora portfolio home" onClick={handleNavClick} {...attachHover(0)}>
          <span className="brand-mark">VA</span>
          <span className="brand-copy">
            <strong>Vinay Arora</strong>
            <span>Composer, producer, sound designer</span>
          </span>
        </a>

        <nav className="site-nav" aria-label="Primary">
          {[
            ['Featured', '#featured'],
            ['Listening Room', '#listening-room'],
            ['Games', '#games'],
            ['Services', '#services'],
            ['Contact', '#contact'],
          ].map(([label, href], index) => (
            <a key={label} href={href} onClick={handleNavClick} {...attachHover(index + 1)}>
              {label}
            </a>
          ))}
        </nav>
      </header>

      <main>
        <section className="hero-section" id="top">
          <div className="hero-copy">
            <p className="eyebrow">Composer, producer, sound designer</p>
            <h1>Music, sound, teaching, and interactive audio in one cinematic portfolio.</h1>
            <p className="hero-text">
              Vinay Arora works across music production, sound design, teaching, and game audio. The
              portfolio brings together original releases, visual-media work, student performances,
              and interactive audio projects in one place.
            </p>

            <div className="hero-actions">
              <a className="primary-button" href="#featured" onClick={handleActionClick} {...attachHover(2)}>
                View featured work
              </a>
              <a className="secondary-button" href="#contact" onClick={handleActionClick} {...attachHover(3)}>
                Get in touch
              </a>
            </div>

            <div className="hero-stats" aria-label="Portfolio focus">
              <article {...attachHover(4)}>
                <strong>4</strong>
                <span>creative lanes</span>
              </article>
              <article {...attachHover(5)}>
                <strong>20+</strong>
                <span>projects and destinations</span>
              </article>
              <article {...attachHover(6)}>
                <strong>FMOD</strong>
                <span>to songwriting</span>
              </article>
            </div>
          </div>

          <div className="hero-visual">
            <div className="signal-panel" {...attachHover(7)}>
              <p className="panel-label">Live signal</p>
              <h2>From game audio systems to vocal releases and teaching reels.</h2>
              <div className="signal-track">
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
              <div className="signal-links">
                {signalLinks.map((item, index) => (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    onClick={handleActionClick}
                    {...attachHover(index + 8)}
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="featured-section" id="featured">
          <div className="section-heading">
            <p className="eyebrow">Featured work</p>
            <h2>Switch between your major bodies of work without leaving the page.</h2>
          </div>

          <div className="filter-bar" role="tablist" aria-label="Portfolio sections">
            {featuredCollections.map((section, index) => (
              <button
                key={section.id}
                type="button"
                className={`filter-chip${section.id === activeCollection ? ' active' : ''}`}
                onClick={() => handleCollectionSwitch(section.id)}
                {...attachHover(index + 12)}
              >
                {section.label}
              </button>
            ))}
          </div>

          <div className="active-collection">
            <div className="collection-copy">
              <p className="collection-eyebrow">{activeSectionData.eyebrow}</p>
              <h3>{activeSectionData.label}</h3>
              <p>{activeSectionData.intro}</p>
            </div>

            <div className="collection-grid">
              {activeSectionData.items.map((item, index) => (
                <article className="work-card" key={item.title} {...attachHover(index + 20)}>
                  <div className="work-cover" style={{ backgroundImage: `url(${item.image})` }}>
                    <span>{item.role}</span>
                  </div>
                  <div className="work-copy">
                    <div className="work-meta">
                      <strong>{item.title}</strong>
                      <span>{item.date}</span>
                    </div>
                    <p>{item.blurb}</p>
                    <div className="work-links">
                      <a href={item.href} target="_blank" rel="noreferrer" onClick={handleActionClick}>
                        Open project
                      </a>
                      {item.supportingLinks?.map((link) => (
                        <a
                          key={link.label}
                          href={link.href}
                          target="_blank"
                          rel="noreferrer"
                          onClick={handleActionClick}
                        >
                          {link.label}
                        </a>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="listening-section" id="listening-room">
          <div className="section-heading">
            <p className="eyebrow">Listening room</p>
            <h2>Listen across vocal arrangements, masters, production work, and live performance.</h2>
          </div>

          <div className="playlist-shell">
            <article className="playlist-panel" {...attachHover(32)}>
              <p className="panel-label">Spotify playlist</p>
              <h3>Listen on Spotify</h3>
              <iframe
                title="Vinay Arora Spotify playlist"
                src={listeningRoom.playlist}
                width="100%"
                height="352"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
              />
            </article>

            <article className="playlist-panel compact" {...attachHover(33)}>
              <p className="panel-label">Aadmi Bann Zara</p>
              <h3>Streaming destinations</h3>
              <div className="support-link-grid">
                {featuredCollections[0].items
                  .find((item) => item.title === 'Aadmi Bann Zara')
                  ?.supportingLinks?.map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      onClick={handleActionClick}
                    >
                      {link.label}
                    </a>
                  ))}
              </div>
            </article>
          </div>

          <div className="audio-switcher">
            <div className="filter-bar" role="tablist" aria-label="Audio collections">
              {[
                ['vocal', 'Vocal Arrangements'],
                ['masters', 'Audio Masters'],
                ['production', 'Production / Mix'],
                ['live', 'Live Videos'],
              ].map(([value, label], index) => (
                <button
                  key={value}
                  type="button"
                  className={`filter-chip${activeAudioPanel === value ? ' active' : ''}`}
                  onClick={() => handleAudioSwitch(value)}
                  {...attachHover(index + 34)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="embed-section">
              <div className="collection-copy">
                <p className="collection-eyebrow">Interactive media wall</p>
                <h3>{audioTitles[activeAudioPanel]}</h3>
              </div>

              <div className={`embed-grid${activeAudioPanel === 'live' ? ' video-grid' : ''}`}>
                {audioPanels[activeAudioPanel].map((item, index) =>
                  typeof item === 'string' ? (
                    <iframe
                      key={item}
                      title={`${activeAudioPanel}-${index}`}
                      src={item}
                      width="100%"
                      height="152"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                    />
                  ) : (
                    <article className="video-card" key={item.href} {...attachHover(index + 40)}>
                      <iframe
                        title={item.title}
                        src={item.href}
                        width="100%"
                        height="220"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                      />
                      <p>{item.title}</p>
                    </article>
                  ),
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="games-section" id="games">
          <div className="section-heading">
            <p className="eyebrow">Games</p>
            <h2>Download and explore released interactive work.</h2>
          </div>

          <div className="games-grid">
            {games.map((game, index) => (
              <article className="game-card" key={game.title} {...attachHover(index + 48)}>
                <div className="game-art">
                  <img src={game.image} alt={game.title} />
                </div>
                <div className="game-copy">
                  <p className="panel-label">Gamegrafter&apos;s Collective</p>
                  <h3>{game.title}</h3>
                  <p>{game.note}</p>
                  <div className="work-links">
                    {game.links.map((link) => (
                      <a
                        key={link.label}
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                        onClick={handleActionClick}
                      >
                        {link.label}
                      </a>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="services-section" id="services">
          <div className="services-copy">
            <p className="eyebrow">Services</p>
            <h2>Sound, music, mixing, mastering, and game-audio services.</h2>
            <p>
              Available for collaborations across artists, studios, films, games, and education-led
              creative work.
            </p>
          </div>

          <div className="services-grid">
            {services.map((service, index) => (
              <article className="service-card" key={service} {...attachHover(index + 52)}>
                <span>Signal</span>
                <strong>{service}</strong>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="site-footer" id="contact">
        <div className="footer-copy">
          <p className="eyebrow">Contact & links</p>
          <h2>Connect across music, collaboration, teaching, and studio work.</h2>
        </div>

        <div className="footer-links">
          {signalLinks.map((item, index) => (
            <a
              key={item.label}
              href={item.href}
              target="_blank"
              rel="noreferrer"
              onClick={handleActionClick}
              {...attachHover(index + 60)}
            >
              {item.label}
            </a>
          ))}
          <a
            href="https://www.instagram.com/teevramastudio/"
            target="_blank"
            rel="noreferrer"
            onClick={handleActionClick}
            {...attachHover(64)}
          >
            TeevraMa Studio
          </a>
        </div>
      </footer>
    </div>
  )
}

export default App
