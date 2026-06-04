// components/PropertiesPanel.jsx
import React, { useState } from 'react'
import { Lock, Unlock, RotateCw, MousePointerSquareDashed } from 'lucide-react'
import { useEditor } from '../context/EditorContext.jsx'

const r2 = (n) => Math.round(n * 10) / 10

export default function PropertiesPanel() {
  const { canvasRef, selected, saveHistory, refresh } = useEditor()
  const [aspectLock, setAspectLock] = useState(true)

  const c = canvasRef.current
  const obj = c?.getActiveObject()

  if (!obj) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-6 text-ink-300">
        <MousePointerSquareDashed size={26} className="mb-2 opacity-70" />
        <p className="text-[12.5px]">Select an object to edit its position, size, and color.</p>
      </div>
    )
  }

  const bbox = obj.getBoundingRect()
  const w = obj.getScaledWidth()
  const h = obj.getScaledHeight()
  const angle = obj.angle || 0
  const fillVal = typeof obj.fill === 'string' ? obj.fill : ''

  const commit = () => {
    obj.setCoords()
    c.requestRenderAll()
    saveHistory()
    refresh()
  }

  const setX = (v) => {
    const nb = obj.getBoundingRect()
    obj.left += Number(v) - nb.left
    commit()
  }
  const setY = (v) => {
    const nb = obj.getBoundingRect()
    obj.top += Number(v) - nb.top
    commit()
  }
  const setW = (v) => {
    const newW = Math.max(1, Number(v))
    const factor = newW / w
    obj.scaleX = (obj.scaleX || 1) * (newW / w)
    if (aspectLock) obj.scaleY = (obj.scaleY || 1) * factor
    commit()
  }
  const setH = (v) => {
    const newH = Math.max(1, Number(v))
    const factor = newH / h
    obj.scaleY = (obj.scaleY || 1) * (newH / h)
    if (aspectLock) obj.scaleX = (obj.scaleX || 1) * factor
    commit()
  }
  const setAngle = (v) => {
    obj.rotate(Number(v) || 0)
    commit()
  }
  const setFill = (v) => {
    obj.set('fill', v)
    obj.set('dirty', true)
    commit()
  }

  const Field = ({ label, value, onChange, step = 1 }) => (
    <div>
      <label className="section-label">{label}</label>
      <input
        type="number"
        step={step}
        className="field w-full mt-1"
        defaultValue={r2(value)}
        key={`${label}-${r2(value)}`}
        onBlur={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
      />
    </div>
  )

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Field label="X" value={bbox.left} onChange={setX} />
        <Field label="Y" value={bbox.top} onChange={setY} />
      </div>

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Field label="W" value={w} onChange={setW} />
        </div>
        <button
          className={`icon-btn mb-0.5 ${aspectLock ? 'icon-btn-active' : ''}`}
          title={aspectLock ? 'Aspect ratio locked' : 'Aspect ratio unlocked'}
          onClick={() => setAspectLock((v) => !v)}
        >
          {aspectLock ? <Lock size={16} /> : <Unlock size={16} />}
        </button>
        <div className="flex-1">
          <Field label="H" value={h} onChange={setH} />
        </div>
      </div>

      <div>
        <label className="section-label flex items-center gap-1.5">
          <RotateCw size={13} /> Rotation
        </label>
        <div className="flex items-center gap-2 mt-1">
          <input
            type="range"
            min={0}
            max={360}
            value={Math.round(angle)}
            onChange={(e) => setAngle(e.target.value)}
            className="w-full accent-accent"
          />
          <input
            type="number"
            className="field w-16 text-right"
            value={Math.round(angle)}
            onChange={(e) => setAngle(e.target.value)}
          />
        </div>
      </div>

      {fillVal !== '' && (
        <div>
          <label className="section-label">Fill color</label>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="color"
              className="h-9 w-10 rounded-md bg-ink-700 border border-ink-500 cursor-pointer"
              value={fillVal || '#000000'}
              onChange={(e) => setFill(e.target.value)}
            />
            <input
              className="field w-full font-mono text-xs"
              value={fillVal}
              onChange={(e) => setFill(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
