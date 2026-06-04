// lib/align.js
// Translation-based alignment so it works regardless of each object's origin.

function rectOf(obj) {
  const r = obj.getBoundingRect()
  return { left: r.left, top: r.top, width: r.width, height: r.height }
}

function unionRect(objects) {
  const rs = objects.map(rectOf)
  const left = Math.min(...rs.map((r) => r.left))
  const top = Math.min(...rs.map((r) => r.top))
  const right = Math.max(...rs.map((r) => r.left + r.width))
  const bottom = Math.max(...rs.map((r) => r.top + r.height))
  return { left, top, width: right - left, height: bottom - top }
}

function translate(obj, dx, dy) {
  obj.left += dx
  obj.top += dy
  obj.setCoords()
}

/** mode: left|centerH|right|top|middle|bottom */
export function alignObjects(objects, mode) {
  if (!objects || objects.length < 1) return
  const g = unionRect(objects)
  for (const obj of objects) {
    const r = rectOf(obj)
    switch (mode) {
      case 'left':
        translate(obj, g.left - r.left, 0)
        break
      case 'right':
        translate(obj, g.left + g.width - (r.left + r.width), 0)
        break
      case 'centerH':
        translate(obj, g.left + g.width / 2 - (r.left + r.width / 2), 0)
        break
      case 'top':
        translate(obj, 0, g.top - r.top)
        break
      case 'bottom':
        translate(obj, 0, g.top + g.height - (r.top + r.height))
        break
      case 'middle':
        translate(obj, 0, g.top + g.height / 2 - (r.top + r.height / 2))
        break
      default:
        break
    }
  }
}

/** axis: 'h' (horizontal) | 'v' (vertical) — distributes object centers evenly. */
export function distributeObjects(objects, axis) {
  if (!objects || objects.length < 3) return
  const items = objects.map((obj) => {
    const r = rectOf(obj)
    return { obj, cx: r.left + r.width / 2, cy: r.top + r.height / 2 }
  })
  if (axis === 'h') {
    items.sort((a, b) => a.cx - b.cx)
    const span = items[items.length - 1].cx - items[0].cx
    const step = span / (items.length - 1)
    items.forEach((it, i) => {
      const target = items[0].cx + step * i
      translate(it.obj, target - it.cx, 0)
    })
  } else {
    items.sort((a, b) => a.cy - b.cy)
    const span = items[items.length - 1].cy - items[0].cy
    const step = span / (items.length - 1)
    items.forEach((it, i) => {
      const target = items[0].cy + step * i
      translate(it.obj, 0, target - it.cy)
    })
  }
}
