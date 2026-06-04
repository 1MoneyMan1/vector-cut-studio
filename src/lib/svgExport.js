// lib/svgExport.js
// -----------------------------------------------------------------------------
// Assemble the whole canvas into a clean, cutting-machine-friendly SVG:
//   - every text object is converted to vector outlines (no <text>)
//   - the viewBox is cropped to the design bounds (+padding)
//   - optional real-world width/height (inches) so the Cricut app sizes it right
//   - well-formatted, minimal markup
// -----------------------------------------------------------------------------

import { isText, textToSvgPathElement } from './textToPath.js'

function unionBounds(objects) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const o of objects) {
    const r = o.getBoundingRect()
    minX = Math.min(minX, r.left)
    minY = Math.min(minY, r.top)
    maxX = Math.max(maxX, r.left + r.width)
    maxY = Math.max(maxY, r.top + r.height)
  }
  if (!isFinite(minX)) return { left: 0, top: 0, width: 100, height: 100 }
  return { left: minX, top: minY, width: maxX - minX, height: maxY - minY }
}

/**
 * @param {fabric.Canvas} canvas
 * @param {object} opts { padding=12, asInches=true, dpi=96, decimals=3 }
 * @returns {Promise<string>} svg markup
 */
export async function exportCanvasToSVG(canvas, opts = {}) {
  const { padding = 12, asInches = true, dpi = 96 } = opts

  const objects = canvas
    .getObjects()
    .filter((o) => o.visible !== false && o.excludeFromExport !== true)

  if (objects.length === 0) {
    throw new Error('Nothing to export — the canvas is empty.')
  }

  const parts = []
  for (const obj of objects) {
    if (isText(obj)) {
      const el = await textToSvgPathElement(obj)
      if (el) parts.push('  ' + el)
    } else {
      // fabric serialises each object with its transform baked in.
      const svg = obj.toSVG()
      parts.push(
        '  ' + svg.replace(/\n\s*/g, ' ').trim()
      )
    }
  }

  const b = unionBounds(objects)
  const vbX = b.left - padding
  const vbY = b.top - padding
  const vbW = b.width + padding * 2
  const vbH = b.height + padding * 2

  let sizeAttrs
  if (asInches) {
    const wIn = (vbW / dpi).toFixed(3)
    const hIn = (vbH / dpi).toFixed(3)
    sizeAttrs = `width="${wIn}in" height="${hIn}in"`
  } else {
    sizeAttrs = `width="${vbW.toFixed(2)}px" height="${vbH.toFixed(2)}px"`
  }

  const header =
    `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
    `version="1.1" ${sizeAttrs} ` +
    `viewBox="${vbX.toFixed(3)} ${vbY.toFixed(3)} ${vbW.toFixed(3)} ${vbH.toFixed(3)}">`

  return `${header}\n${parts.join('\n')}\n</svg>\n`
}

/** Trigger a local download of an SVG string. */
export function downloadSVG(svgString, filename = 'design.svg') {
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.svg') ? filename : `${filename}.svg`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
