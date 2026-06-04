// lib/fonts.js
// -----------------------------------------------------------------------------
// Fonts are served from the Fontsource CDN (jsDelivr). We use it for two things:
//   1) Display CSS so fabric can render the font on the canvas.
//   2) Real .ttf files that opentype.js can parse into glyph outlines, which is
//      how we convert text -> vector paths for cutting-machine-ready SVG export.
// (Google Fonts' CSS endpoint serves woff2 to browsers, which opentype.js can't
//  parse, so Fontsource's static .ttf files are the reliable path here.)
// -----------------------------------------------------------------------------

import opentype from 'opentype.js'

// Curated, popular families available on Fontsource. `id` is the Fontsource slug.
export const FONTS = [
  { name: 'Sora', id: 'sora' },
  { name: 'Inter', id: 'inter' },
  { name: 'Roboto', id: 'roboto' },
  { name: 'Open Sans', id: 'open-sans' },
  { name: 'Lato', id: 'lato' },
  { name: 'Montserrat', id: 'montserrat' },
  { name: 'Poppins', id: 'poppins' },
  { name: 'Oswald', id: 'oswald' },
  { name: 'Raleway', id: 'raleway' },
  { name: 'Nunito', id: 'nunito' },
  { name: 'Merriweather', id: 'merriweather' },
  { name: 'Playfair Display', id: 'playfair-display' },
  { name: 'Lora', id: 'lora' },
  { name: 'PT Serif', id: 'pt-serif' },
  { name: 'Bebas Neue', id: 'bebas-neue' },
  { name: 'Pacifico', id: 'pacifico' },
  { name: 'Dancing Script', id: 'dancing-script' },
  { name: 'Caveat', id: 'caveat' },
  { name: 'Lobster', id: 'lobster' },
  { name: 'Great Vibes', id: 'great-vibes' },
  { name: 'Satisfy', id: 'satisfy' },
  { name: 'Sacramento', id: 'sacramento' },
  { name: 'Permanent Marker', id: 'permanent-marker' },
  { name: 'Anton', id: 'anton' },
  { name: 'Righteous', id: 'righteous' },
  { name: 'Abril Fatface', id: 'abril-fatface' },
  { name: 'Comfortaa', id: 'comfortaa' },
  { name: 'Quicksand', id: 'quicksand' },
  { name: 'Josefin Sans', id: 'josefin-sans' },
  { name: 'Archivo Black', id: 'archivo-black' },
  { name: 'JetBrains Mono', id: 'jetbrains-mono' },
]

const idByName = Object.fromEntries(FONTS.map((f) => [f.name, f.id]))

const CSS_BASE = 'https://cdn.jsdelivr.net/fontsource/css'
const TTF_BASE = 'https://cdn.jsdelivr.net/fontsource/fonts'

const cssLoaded = new Set()
const otCache = new Map() // family name -> Promise<opentype.Font>

/** Inject the Fontsource display stylesheet for a family (idempotent). */
export function loadFontCss(name) {
  const id = idByName[name]
  if (!id || cssLoaded.has(id)) return
  cssLoaded.add(id)
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = `${CSS_BASE}/${id}@latest/index.css`
  document.head.appendChild(link)
}

/** Wait until the browser has actually loaded glyphs for the family so fabric
 *  measures/render it correctly. */
export async function ensureFontReady(name, weight = 400) {
  loadFontCss(name)
  if (document.fonts && document.fonts.load) {
    try {
      await document.fonts.load(`${weight} 32px "${name}"`)
      await document.fonts.ready
    } catch {
      /* non-fatal */
    }
  }
}

/** Load & parse a family's regular .ttf with opentype.js (cached). */
export function loadOpentypeFont(name, weight = 400) {
  const id = idByName[name]
  if (!id) return Promise.reject(new Error(`Unknown font: ${name}`))
  const key = `${id}-${weight}`
  if (otCache.has(key)) return otCache.get(key)
  const url = `${TTF_BASE}/${id}@latest/latin-${weight}-normal.ttf`
  const p = fetch(url)
    .then((r) => {
      if (!r.ok) throw new Error(`Font fetch failed (${r.status})`)
      return r.arrayBuffer()
    })
    .then((buf) => opentype.parse(buf))
  otCache.set(key, p)
  return p
}
