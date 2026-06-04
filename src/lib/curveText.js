// lib/curveText.js
// Lay out characters along a circular arc. `curve` is -100..100
// (positive = smile / concave-up, negative = frown, 0 = straight).
import * as fabric from 'fabric'

export function buildCurvedText(opts) {
  const {
    text = 'Curved',
    fontFamily = 'Sora',
    fontSize = 60,
    fill = '#9aa4b2',
    charSpacing = 0,
    curve = 0,
    left = 0,
    top = 0,
  } = opts

  const chars = Array.from(text)
  const spacing = (charSpacing / 1000) * fontSize
  const measures = chars.map((ch) => {
    const t = new fabric.Text(ch === ' ' ? '\u00A0' : ch, { fontFamily, fontSize })
    return Math.max(t.width, fontSize * 0.28)
  })
  const widths = measures.map((w) => w + spacing)
  const totalW = widths.reduce((a, b) => a + b, 0)

  const makeChar = (ch, x, y, angleDeg) =>
    new fabric.Text(ch, {
      fontFamily,
      fontSize,
      fill,
      originX: 'center',
      originY: 'center',
      left: x,
      top: y,
      angle: angleDeg,
      objectCaching: false,
    })

  const objs = []

  if (Math.abs(curve) < 0.5) {
    let x = -totalW / 2
    for (let i = 0; i < chars.length; i++) {
      const cx = x + widths[i] / 2
      x += widths[i]
      if (chars[i].trim() !== '') objs.push(makeChar(chars[i], cx, 0, 0))
    }
  } else {
    const maxAngle = Math.PI * (Math.abs(curve) / 100) // up to 180°
    const R = totalW / maxAngle
    const smile = curve > 0
    let acc = 0
    for (let i = 0; i < chars.length; i++) {
      const centerLen = acc + widths[i] / 2
      acc += widths[i]
      const theta = centerLen / R - maxAngle / 2
      let x, y, angleDeg
      if (smile) {
        x = R * Math.sin(theta)
        y = R * (Math.cos(theta) - 1)
        angleDeg = (theta * 180) / Math.PI
      } else {
        x = R * Math.sin(theta)
        y = R * (1 - Math.cos(theta))
        angleDeg = (-theta * 180) / Math.PI
      }
      if (chars[i].trim() !== '') objs.push(makeChar(chars[i], x, y, angleDeg))
    }
  }

  if (objs.length === 0) objs.push(makeChar(' ', 0, 0, 0))

  const group = new fabric.Group(objs, {
    originX: 'center',
    originY: 'center',
    left,
    top,
    objectCaching: false,
  })
  // Persist parameters so a slider can rebuild the curve later.
  group.set('data', { kind: 'curvedText', text, fontFamily, fontSize, fill, charSpacing, curve })
  return group
}
