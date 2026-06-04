// lib/booleanOps.js
// -----------------------------------------------------------------------------
// Geometry engine. Fabric.js is great at object management but has no real
// vector boolean math, so we use Paper.js *headlessly* as a pure geometry
// kernel: Fabric object -> SVG -> Paper PathItem -> boolean -> SVG path data
// -> new Fabric.Path. This correctly handles bezier curves, not just polygons.
// -----------------------------------------------------------------------------

import paper from 'paper'
import * as fabric from 'fabric'
import PaperOffset from 'paperjs-offset'

let scope = null

/** Lazily create a single reusable headless Paper.js scope. */
function getScope() {
  if (!scope) {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    scope = new paper.PaperScope()
    scope.setup(canvas)
  }
  scope.activate()
  // Start from a clean project every time to avoid leaks across calls.
  scope.project.clear()
  return scope
}

/** Find every Path / CompoundPath in an imported item tree (without
 *  descending into a CompoundPath's own child paths). */
function collectPaths(item, ps) {
  const out = []
  const walk = (it) => {
    if (!it) return
    if (it instanceof ps.CompoundPath || it instanceof ps.Path) {
      out.push(it)
      return
    }
    if (it.children) it.children.forEach(walk)
  }
  walk(item)
  return out
}

/** Unite an array of paper paths into a single PathItem. */
function uniteAll(paths) {
  if (paths.length === 0) return null
  let result = paths[0].clone({ insert: true })
  for (let i = 1; i < paths.length; i++) {
    const next = result.unite(paths[i])
    result.remove()
    result = next
  }
  return result
}

/** Convert ONE fabric object (shape, path, or group) into a single paper
 *  PathItem in absolute canvas coordinates. Returns null for non-vector
 *  objects (e.g. raster images, un-converted text). */
export function fabricToPaperPath(obj, ps) {
  // Fabric serialises the object with its full transform matrix baked into a
  // transform attribute, so importing it preserves absolute position.
  const inner = obj.toSVG()
  const svg = `<svg xmlns="http://www.w3.org/2000/svg">${inner}</svg>`
  const imported = ps.project.importSVG(svg, {
    expandShapes: true, // turn <rect>/<circle>/... into real Paths
    insert: true,
  })
  const paths = collectPaths(imported, ps)
  if (paths.length === 0) {
    imported.remove()
    return null
  }
  // A group / multi-path object is treated as one filled region.
  const united = paths.length === 1 ? paths[0].clone({ insert: true }) : uniteAll(paths)
  imported.remove()
  return united
}

/** Build a new fabric.Path from a paper PathItem, inheriting style from a
 *  donor fabric object. Coordinates are absolute (canvas space). */
function paperToFabric(pathItem, donor) {
  const d = pathItem.pathData
  if (!d || d.trim() === '') return null
  const path = new fabric.Path(d, {
    fill: donor.fill ?? '#9aa4b2',
    stroke: donor.stroke ?? null,
    strokeWidth: donor.strokeWidth ?? 0,
    fillRule: 'evenodd',
    objectCaching: false,
    paintFirst: 'fill',
  })
  return path
}

const OPS = {
  weld: (paths) => uniteAll(paths),
  intersect: (paths) =>
    paths.reduce((acc, p, i) => {
      if (i === 0) return p.clone({ insert: true })
      const next = acc.intersect(p)
      acc.remove()
      return next
    }, null),
  exclude: (paths) =>
    paths.reduce((acc, p, i) => {
      if (i === 0) return p.clone({ insert: true })
      const next = acc.exclude(p)
      acc.remove()
      return next
    }, null),
}

/**
 * Run a boolean operation on an ordered array of fabric objects.
 * `objects` MUST be ordered bottom -> top (canvas stacking order).
 *
 * - weld:      union of all
 * - intersect: overlapping region of all
 * - slice:     subtract the TOP object from the union of the rest
 * - exclude:   symmetric difference (XOR)
 *
 * Returns { path, error }. `path` is a new fabric.Path (caller adds it to the
 * canvas and removes the originals).
 */
export function booleanOp(operation, objects) {
  if (!objects || objects.length < 2) {
    return { path: null, error: 'Select at least two vector shapes.' }
  }
  const ps = getScope()
  const paperPaths = []
  let skipped = 0
  for (const obj of objects) {
    const pp = fabricToPaperPath(obj, ps)
    if (pp) paperPaths.push(pp)
    else skipped++
  }
  if (paperPaths.length < 2) {
    ps.project.clear()
    return {
      path: null,
      error:
        'Need at least two vector paths. Tip: convert text/images to paths first.',
    }
  }

  let resultItem = null
  try {
    if (operation === 'slice') {
      const top = paperPaths[paperPaths.length - 1]
      const rest = paperPaths.slice(0, -1)
      const base = uniteAll(rest)
      resultItem = base.subtract(top)
      base.remove()
    } else if (OPS[operation]) {
      resultItem = OPS[operation](paperPaths)
    } else {
      ps.project.clear()
      return { path: null, error: `Unknown operation: ${operation}` }
    }
  } catch (e) {
    ps.project.clear()
    return { path: null, error: `Geometry error: ${e.message}` }
  }

  const donor = objects[0]
  const fabricPath = resultItem ? paperToFabric(resultItem, donor) : null
  ps.project.clear()

  if (!fabricPath) {
    return { path: null, error: 'Operation produced an empty result.' }
  }
  return { path: fabricPath, error: skipped ? `${skipped} object(s) skipped (not vectors).` : null }
}

/**
 * Offset (contour) a single fabric object outward (positive) or inward
 * (negative) by `delta` pixels. Returns a new fabric.Path, or { error }.
 */
export function offsetPath(obj, delta, { join = 'round' } = {}) {
  const ps = getScope()
  const src = fabricToPaperPath(obj, ps)
  if (!src) {
    ps.project.clear()
    return { path: null, error: 'Offset needs a vector path (convert text/images first).' }
  }
  let offsetItem = null
  try {
    // paperjs-offset offsets a path producing a new outline path.
    offsetItem = PaperOffset.offset(src, delta, { join, insert: true })
  } catch (e) {
    ps.project.clear()
    return { path: null, error: `Offset failed: ${e.message}` }
  }
  const fabricPath = offsetItem ? paperToFabric(offsetItem, obj) : null
  ps.project.clear()
  if (!fabricPath) return { path: null, error: 'Offset produced no result.' }
  // Give offset a distinct look so the user sees the contour.
  fabricPath.set({
    fill: delta >= 0 ? 'rgba(91,140,255,0.0)' : obj.fill,
    stroke: obj.stroke || '#5b8cff',
    strokeWidth: obj.strokeWidth || 1,
  })
  if (delta >= 0) fabricPath.set({ fill: obj.fill ?? '#9aa4b2' })
  return { path: fabricPath, error: null }
}
