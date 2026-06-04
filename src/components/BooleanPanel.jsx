// components/BooleanPanel.jsx
import React, { useState } from 'react'
import { Combine, Scissors, SquareDot, Diff, Spline, Type } from 'lucide-react'
import { useEditor } from '../context/EditorContext.jsx'

const TextIcon = Type

export default function BooleanPanel() {
  const { runBoolean, runOffset, convertTextToPath, selected } = useEditor()
  const [offset, setOffset] = useState(12)

  const multi = selected.length >= 2
  const single = selected.length === 1

  const Op = ({ icon: Icon, op, label, hint }) => (
    <button
      className="flex items-center gap-2 rounded-lg border border-ink-600 bg-ink-700 px-2.5 py-2
                 text-left hover:border-accent/60 hover:bg-ink-600 disabled:opacity-40
                 disabled:hover:border-ink-600 disabled:hover:bg-ink-700 transition"
      disabled={!multi}
      title={hint}
      onClick={() => runBoolean(op)}
    >
      <Icon size={17} className="text-accent-soft shrink-0" />
      <span className="text-[12.5px] text-slate-200">{label}</span>
    </button>
  )

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Op icon={Combine} op="weld" label="Weld" hint="Unite into one solid shape" />
        <Op icon={Scissors} op="slice" label="Slice" hint="Subtract the top shape from the bottom" />
        <Op icon={SquareDot} op="intersect" label="Intersect" hint="Keep only the overlap" />
        <Op icon={Diff} op="exclude" label="Exclude" hint="Keep everything except the overlap" />
      </div>

      <div className="rounded-lg border border-ink-600 bg-ink-700/60 p-2.5">
        <label className="section-label flex items-center gap-1.5">
          <Spline size={13} /> Offset / Contour
        </label>
        <div className="flex items-center gap-2 mt-1.5">
          <input
            type="range"
            min={-60}
            max={60}
            value={offset}
            onChange={(e) => setOffset(Number(e.target.value))}
            className="w-full accent-accent"
          />
          <input
            type="number"
            className="field w-16 text-right"
            value={offset}
            onChange={(e) => setOffset(Number(e.target.value))}
          />
        </div>
        <button
          className="btn-soft w-full mt-2 disabled:opacity-40"
          disabled={!single}
          onClick={() => runOffset(offset)}
        >
          Create offset ({offset > 0 ? `+${offset}` : offset}px)
        </button>
      </div>

      <button className="btn-soft w-full" onClick={convertTextToPath}>
        <TextIcon size={16} />
        Convert text to path
      </button>

      <p className="text-[11px] text-ink-300 leading-relaxed">
        Boolean ops need <span className="text-slate-300">2+ vector shapes</span>. Text and images
        aren’t paths — convert text first (button above). Offset works on a single selected path.
      </p>
    </div>
  )
}
