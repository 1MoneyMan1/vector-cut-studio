// lib/shapes.js
import * as fabric from 'fabric'

const DEFAULT_FILL = '#9aa4b2'

function base(extra) {
  return {
    fill: DEFAULT_FILL,
    stroke: null,
    strokeWidth: 0,
    objectCaching: false,
    originX: 'center',
    originY: 'center',
    ...extra,
  }
}

/** Build a regular polygon's points around the origin. */
function regularPolygonPoints(sides, radius) {
  const pts = []
  const offset = -Math.PI / 2 // point up
  for (let i = 0; i < sides; i++) {
    const a = offset + (i * 2 * Math.PI) / sides
    pts.push({ x: radius * Math.cos(a), y: radius * Math.sin(a) })
  }
  return pts
}

/** Build a star's points (alternating outer/inner radius). */
function starPoints(spikes, outer, inner) {
  const pts = []
  const step = Math.PI / spikes
  let rot = -Math.PI / 2
  for (let i = 0; i < spikes; i++) {
    pts.push({ x: Math.cos(rot) * outer, y: Math.sin(rot) * outer })
    rot += step
    pts.push({ x: Math.cos(rot) * inner, y: Math.sin(rot) * inner })
    rot += step
  }
  return pts
}

export function makeShape(kind, center = { x: 0, y: 0 }) {
  const pos = { left: center.x, top: center.y }
  switch (kind) {
    case 'square':
      return new fabric.Rect(base({ ...pos, width: 120, height: 120, rx: 0, ry: 0 }))
    case 'rounded':
      return new fabric.Rect(base({ ...pos, width: 140, height: 100, rx: 16, ry: 16 }))
    case 'circle':
      return new fabric.Circle(base({ ...pos, radius: 70 }))
    case 'triangle':
      return new fabric.Triangle(base({ ...pos, width: 130, height: 120 }))
    case 'star':
      return new fabric.Polygon(starPoints(5, 75, 32), base(pos))
    case 'pentagon':
      return new fabric.Polygon(regularPolygonPoints(5, 75), base(pos))
    case 'hexagon':
      return new fabric.Polygon(regularPolygonPoints(6, 75), base(pos))
    case 'octagon':
      return new fabric.Polygon(regularPolygonPoints(8, 75), base(pos))
    case 'line':
      return new fabric.Line([-80, 0, 80, 0], {
        ...base(pos),
        fill: null,
        stroke: '#e7eaf0',
        strokeWidth: 4,
      })
    case 'heart':
      return new fabric.Path(
        'M 0 -30 C -40 -75 -110 -35 0 45 C 110 -35 40 -75 0 -30 Z',
        base(pos)
      )
    default:
      return new fabric.Rect(base({ ...pos, width: 120, height: 120 }))
  }
}

export const SHAPES = [
  { kind: 'square', label: 'Square' },
  { kind: 'rounded', label: 'Rounded' },
  { kind: 'circle', label: 'Circle' },
  { kind: 'triangle', label: 'Triangle' },
  { kind: 'star', label: 'Star' },
  { kind: 'pentagon', label: 'Pentagon' },
  { kind: 'hexagon', label: 'Hexagon' },
  { kind: 'octagon', label: 'Octagon' },
  { kind: 'heart', label: 'Heart' },
  { kind: 'line', label: 'Line' },
]
