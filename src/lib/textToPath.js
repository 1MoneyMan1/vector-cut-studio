// lib/textToPath.js
// -----------------------------------------------------------------------------
// Convert a fabric text object (IText / Textbox) into real glyph OUTLINES.
// Cutting machines need paths, not <text>, so this is essential for export and
// for the "Convert to Path" action (which also lets text take part in boolean
// ops, offsets, etc.).
//
// Strategy: reuse fabric's own measured layout (__charBounds + line offsets) so
// letter-spacing / alignment / multi-line match what the user sees, then stamp
// each glyph's outline from opentype.js at those positions.
// -----------------------------------------------------------------------------

import * as fabric from 'fabric'
import { loadOpentypeFont } from './fonts.js'

const isTextType = (t) => t === 'i-text' || t === 'text' || t === 'textbox'

export function isText(obj) {
  return obj && isTextType(obj.type)
}

/** Build the local-space (top-left origin, unscaled) glyph path data 'd'. */
function buildLocalPathData(obj, font) {
  const fontSize = obj.fontSize || 40
  const unitsPerEm = font.unitsPerEm || 1000
  const ascentPx = (font.ascender / unitsPerEm) * fontSize

  const lines = obj._textLines || (obj.text ? obj.text.split('\n').map((l) => l.split('')) : [])
  const charBounds = obj.__charBounds

  let dParts = []
  let lineTop = 0

  for (let li = 0; li < lines.length; li++) {
    const heightOfLine =
      typeof obj.getHeightOfLine === 'function'
        ? obj.getHeightOfLine(li)
        : fontSize * (obj.lineHeight || 1.16)
    const baseline = lineTop + ascentPx

    // Horizontal offset for text-align (center/right/justify).
    let lineLeft = 0
    try {
      if (typeof obj._getLineLeftOffset === 'function') lineLeft = obj._getLineLeftOffset(li) || 0
    } catch {
      lineLeft = 0
    }

    const chars = lines[li]
    let fallbackX = 0
    const letterSpacingPx = ((obj.charSpacing || 0) / 1000) * fontSize

    for (let ci = 0; ci < chars.length; ci++) {
      const ch = chars[ci]
      let x
      if (charBounds && charBounds[li] && charBounds[li][ci]) {
        x = lineLeft + charBounds[li][ci].left
      } else {
        x = lineLeft + fallbackX
        const adv = (font.charToGlyph(ch).advanceWidth / unitsPerEm) * fontSize
        fallbackX += adv + letterSpacingPx
      }
      if (ch && ch.trim() !== '') {
        const gp = font.getPath(ch, x, baseline, fontSize)
        const d = gp.toPathData(2)
        if (d) dParts.push(d)
      }
    }
    lineTop += heightOfLine
  }
  return dParts.join(' ')
}

/** Compose the SVG matrix that maps top-left-origin local glyph coords into
 *  absolute canvas coordinates, matching the text object's transform. */
function composeMatrix(obj) {
  const w = obj.width || 0
  const h = obj.height || 0
  const M = obj.calcTransformMatrix() // center-origin local -> canvas
  const T = [1, 0, 0, 1, -w / 2, -h / 2] // top-left -> center origin
  return fabric.util.multiplyTransformMatrices(M, T)
}

function styleAttrs(obj) {
  const fill = obj.fill && typeof obj.fill === 'string' ? obj.fill : '#000000'
  const stroke = obj.stroke && typeof obj.stroke === 'string' ? obj.stroke : 'none'
  const sw = obj.strokeWidth || 0
  return { fill, stroke, sw }
}

/**
 * Produce a standalone `<path .../>` SVG element string (with transform) that
 * reproduces the text object as outlines in absolute canvas coordinates.
 * Used directly by the SVG exporter.
 */
export async function textToSvgPathElement(obj) {
  const font = await loadOpentypeFont(obj.fontFamily || 'Roboto', 400)
  const d = buildLocalPathData(obj, font)
  if (!d) return ''
  const m = composeMatrix(obj)
  const { fill, stroke, sw } = styleAttrs(obj)
  const matrix = `matrix(${m.map((n) => +n.toFixed(4)).join(' ')})`
  const strokeAttr = stroke !== 'none' ? ` stroke="${stroke}" stroke-width="${sw}"` : ''
  return `<path d="${d}" transform="${matrix}" fill="${fill}"${strokeAttr} fill-rule="nonzero"/>`
}

/**
 * Convert a fabric text object into a fabric.Path object placed exactly over
 * the text. Returns the new fabric object (async). Caller swaps it in.
 */
export async function textToFabricPath(obj) {
  const font = await loadOpentypeFont(obj.fontFamily || 'Roboto', 400)
  const d = buildLocalPathData(obj, font)
  if (!d) throw new Error('No glyph outlines produced.')
  const m = composeMatrix(obj)
  const { fill, stroke, sw } = styleAttrs(obj)
  const matrix = `matrix(${m.map((n) => +n.toFixed(4)).join(',')})`
  const strokeAttr = stroke !== 'none' ? ` stroke="${stroke}" stroke-width="${sw}"` : ''
  const svg = `<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}" transform="${matrix}" fill="${fill}"${strokeAttr}/></svg>`
  const { objects } = await fabric.loadSVGFromString(svg)
  const valid = objects.filter(Boolean)
  if (valid.length === 0) throw new Error('Failed to vectorise text.')
  const result = valid.length === 1 ? valid[0] : fabric.util.groupSVGElements(valid)
  result.set({ objectCaching: false })
  return result
}
