// components/ShapePanel.jsx
import React from 'react'
import {
  Square,
  Circle,
  Triangle,
  Star,
  Pentagon,
  Hexagon,
  Octagon,
  Heart,
  Minus,
  SquareDashedBottom,
} from 'lucide-react'
import { useEditor } from '../context/EditorContext.jsx'
import { makeShape, SHAPES } from '../lib/shapes.js'

const ICONS = {
  square: Square,
  rounded: SquareDashedBottom,
  circle: Circle,
  triangle: Triangle,
  star: Star,
  pentagon: Pentagon,
  hexagon: Hexagon,
  octagon: Octagon,
  heart: Heart,
  line: Minus,
}

export default function ShapePanel() {
  const { addObject, getCenter } = useEditor()

  const add = (kind) => {
    const shape = makeShape(kind, getCenter())
    addObject(shape)
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {SHAPES.map(({ kind, label }) => {
          const Icon = ICONS[kind] || Square
          return (
            <button
              key={kind}
              onClick={() => add(kind)}
              title={label}
              className="group flex flex-col items-center gap-1.5 rounded-lg border border-ink-600
                         bg-ink-700 py-3 text-ink-300 transition hover:border-accent/60
                         hover:text-accent-soft hover:bg-ink-600"
            >
              <Icon size={22} strokeWidth={1.6} className="transition group-hover:scale-110" />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          )
        })}
      </div>
      <p className="text-[11px] text-ink-300 mt-3 leading-relaxed">
        Shapes drop into the center of your current view. Select two or more, then use{' '}
        <span className="text-slate-300">Combine</span> to weld or slice them.
      </p>
    </div>
  )
}
