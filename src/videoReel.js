const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/

export function youtubeVideoId(value) {
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase().replace(/^www\./, '')
    if (!['youtube.com', 'youtube-nocookie.com', 'youtu.be'].includes(host)) return null
    const parts = url.pathname.split('/').filter(Boolean)
    const id = host === 'youtu.be' ? parts[0] : ['embed', 'shorts', 'live'].includes(parts[0]) ? parts[1] : url.pathname === '/watch' ? url.searchParams.get('v') : null
    return VIDEO_ID.test(id ?? '') ? id : null
  } catch {
    return null
  }
}

export function collectReelVideos(items) {
  const seen = new Set()
  return items.flatMap((item) => {
    const id = youtubeVideoId(item.href)
    if (!id || seen.has(id)) return []
    seen.add(id)
    return [{ id, title: item.title, category: item.category || 'From the collection', href: `https://www.youtube.com/watch?v=${id}`, image: item.image || `https://i.ytimg.com/vi/${id}/hqdefault.jpg` }]
  })
}

export function shuffleReelVideos(videos, avoidFirstId, random = Math.random) {
  const result = [...videos]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  if (result.length > 1 && result[0].id === avoidFirstId) [result[0], result[1]] = [result[1], result[0]]
  return result
}

export function reelIndex(scrollTop, height, count) {
  if (height <= 0 || count < 1) return 0
  return Math.min(count - 1, Math.max(0, Math.round(scrollTop / height)))
}

export function reelEmbedUrl(id) {
  if (!VIDEO_ID.test(id)) throw new Error('Invalid YouTube video ID')
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0`
}
