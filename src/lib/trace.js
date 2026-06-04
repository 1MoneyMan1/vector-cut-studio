// lib/trace.js
// -----------------------------------------------------------------------------
// Two jobs:
//   1) Import a raster (PNG/JPG) as a printable fabric image (default).
//   2) Optional "trace": binarise by threshold then extract outline contours
//      (Moore-neighbour boundary tracing) and emit a fabric.Path. Outer
//      contours only — interior holes are not cut. Good for logos/silhouettes.
// The pure functions (binarize / traceContours / contoursToPath) are
// DOM-free so they can be unit-tested.
// -----------------------------------------------------------------------------

import * as fabric from 'fabric'

/** Luminance + alpha threshold -> Uint8Array grid (1 = filled/dark). */
export function binarize(data, w, h, threshold = 128, invert = false) {
  const out = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4]
    const g = data[i * 4 + 1]
    const b = data[i * 4 + 2]
    const a = data[i * 4 + 3]
    const lum = 0.299 * r + 0.587 * g + 0.114 * b
    let filled = a > 16 && lum < threshold
    if (invert) filled = a > 16 && lum >= threshold
    out[i] = filled ? 1 : 0
  }
  return out
}

const at = (grid, w, h, x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : grid[y * w + x])

// Moore neighbourhood, clockwise from top-left.
const MOORE = [
  [-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0],
]

/** Trace outer contours of all filled blobs. Returns array of point arrays. */
export function traceContours(grid, w, h, minPerimeter = 8) {
  const contours = []
  const started = new Uint8Array(w * h) // boundary start points already used

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x
      if (!grid[idx]) continue
      // A start pixel: filled, with empty to the left (i.e. left edge of a blob).
      if (at(grid, w, h, x - 1, y) === 1) continue
      if (started[idx]) continue

      const contour = []
      let cx = x
      let cy = y
      // Direction we came from (backtrack) — start having come from the left.
      let backDir = 6 // index into MOORE pointing left-ish; we begin search after it
      let safety = 0
      const maxSteps = w * h * 4

      do {
        contour.push({ x: cx, y: cy })
        started[cy * w + cx] = 1
        // Search clockwise starting just after the backtrack direction.
        let found = false
        for (let k = 0; k < 8; k++) {
          const dir = (backDir + 1 + k) % 8
          const nx = cx + MOORE[dir][0]
          const ny = cy + MOORE[dir][1]
          if (at(grid, w, h, nx, ny) === 1) {
            // New backtrack points from the new pixel back to current.
            backDir = (dir + 4) % 8
            cx = nx
            cy = ny
            found = true
            break
          }
        }
        if (!found) break // isolated pixel
        safety++
      } while ((cx !== x || cy !== y) && safety < maxSteps)

      if (contour.length >= minPerimeter) contours.push(contour)
    }
  }
  return contours
}

/** Douglas–Peucker simplification. */
function simplify(points, eps = 1.2) {
  if (points.length < 3) return points
  const sqDist = (p, a, b) => {
    const dx = b.x - a.x
    const dy = b.y - a.y
    if (dx === 0 && dy === 0) return (p.x - a.x) ** 2 + (p.y - a.y) ** 2
    const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)
    const px = a.x + t * dx
    const py = a.y + t * dy
    return (p.x - px) ** 2 + (p.y - py) ** 2
  }
  const dp = (pts, first, last, out) => {
    let maxD = 0
    let index = -1
    for (let i = first + 1; i < last; i++) {
      const d = sqDist(pts[i], pts[first], pts[last])
      if (d > maxD) {
        maxD = d
        index = i
      }
    }
    if (maxD > eps * eps && index !== -1) {
      dp(pts, first, index, out)
      out.push(pts[index])
      dp(pts, index, last, out)
    }
  }
  const out = [points[0]]
  dp(points, 0, points.length - 1, out)
  out.push(points[points.length - 1])
  return out
}

/** Build an SVG path 'd' (compound) from contours, scaled back to source px. */
export function contoursToPath(contours, scale = 1, eps = 1.2) {
  const parts = []
  for (const c of contours) {
    const s = simplify(c, eps)
    if (s.length < 3) continue
    let d = `M ${(s[0].x * scale).toFixed(2)} ${(s[0].y * scale).toFixed(2)}`
    for (let i = 1; i < s.length; i++) {
      d += ` L ${(s[i].x * scale).toFixed(2)} ${(s[i].y * scale).toFixed(2)}`
    }
    d += ' Z'
    parts.push(d)
  }
  return parts.join(' ')
}

// ---- DOM-dependent helpers -------------------------------------------------

function imageToGrid(imgEl, maxDim, threshold, invert) {
  const iw = imgEl.naturalWidth || imgEl.width
  const ih = imgEl.naturalHeight || imgEl.height
  const scale = Math.min(1, maxDim / Math.max(iw, ih))
  const w = Math.max(1, Math.round(iw * scale))
  const h = Math.max(1, Math.round(ih * scale))
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  ctx.drawImage(imgEl, 0, 0, w, h)
  const { data } = ctx.getImageData(0, 0, w, h)
  const grid = binarize(data, w, h, threshold, invert)
  return { grid, w, h, invScale: 1 / scale }
}

/** Trace an <img> element into a fabric.Path. */
export function traceImageToFabricPath(imgEl, opts = {}) {
  const { threshold = 128, invert = false, maxDim = 700, simplifyEps = 1.4, fill = '#9aa4b2' } = opts
  const { grid, w, h, invScale } = imageToGrid(imgEl, maxDim, threshold, invert)
  const contours = traceContours(grid, w, h)
  if (contours.length === 0) throw new Error('No shapes found — try a different threshold.')
  const d = contoursToPath(contours, invScale, simplifyEps)
  if (!d) throw new Error('Trace produced no path.')
  const path = new fabric.Path(d, {
    fill,
    stroke: null,
    strokeWidth: 0,
    fillRule: 'evenodd',
    objectCaching: false,
    originX: 'center',
    originY: 'center',
  })
  return path
}
