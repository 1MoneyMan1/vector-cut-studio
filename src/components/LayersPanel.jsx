// components/LayersPanel.jsx
import React from 'react'
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ChevronsUp,
  ChevronsDown,
  ChevronUp,
  ChevronDown,
  Group,
  Ungroup,
  Type,
  Image as ImageIcon,
  Spline,
  Square,
} from 'lucide-react'
import { useEditor } from '../context/EditorContext.jsx'

function typeIcon(o) {
  if (o.type === 'i-text' || o.type === 'text' || o.type === 'textbox') return Type
  if (o.type === 'image') return ImageIcon
  if (o.type === 'path') return Spline
  if (o.type === 'group') return o.data?.kind === 'curvedText' ? Spline : Group
  return Square
}

function labelFor(o) {
  if (o.data?.kind === 'curvedText') return `Curved “${(o.data.text || '').slice(0, 14)}”`
  if (o.type === 'i-text' || o.type === 'text' || o.type === 'textbox')
    return `“${(o.text || '').split('\n')[0].slice(0, 16) || 'text'}”`
  return o.name || o.type
}

export default function LayersPanel() {
  const {
    canvasRef,
    selected,
    selectObject,
    setLayerProp,
    reorder,
    groupSelected,
    ungroupSelected,
    histVer, // eslint-disable-line no-unused-vars
  } = useEditor()

  const c = canvasRef.current
  const objects = c ? c.getObjects() : []
  const layers = [...objects].reverse() // top-most first
  const activeIds = new Set(selected.map((o) => o.data?.id))
  const active = c?.getActiveObject()
  const isMultiSel = active?.type === 'activeselection'
  const isGroup = active?.type === 'group'

  return (
    <div className="flex flex-col min-h-0">
      <div className="flex items-center gap-1 mb-2">
        <button className="icon-btn" title="Bring to front" onClick={() => reorder('front')}>
          <ChevronsUp size={16} />
        </button>
        <button className="icon-btn" title="Bring forward" onClick={() => reorder('forward')}>
          <ChevronUp size={16} />
        </button>
        <button className="icon-btn" title="Send backward" onClick={() => reorder('backward')}>
          <ChevronDown size={16} />
        </button>
        <button className="icon-btn" title="Send to back" onClick={() => reorder('back')}>
          <ChevronsDown size={16} />
        </button>
        <div className="w-px h-6 bg-ink-600 mx-1" />
        <button
          className="icon-btn disabled:opacity-30"
          title="Group selection"
          disabled={!isMultiSel}
          onClick={groupSelected}
        >
          <Group size={16} />
        </button>
        <button
          className="icon-btn disabled:opacity-30"
          title="Ungroup"
          disabled={!isGroup}
          onClick={ungroupSelected}
        >
          <Ungroup size={16} />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1 space-y-1">
        {layers.length === 0 && (
          <p className="text-[12px] text-ink-300 px-1 py-4 text-center">
            No layers yet. Add a shape, text, or import a file.
          </p>
        )}
        {layers.map((o) => {
          const Icon = typeIcon(o)
          const isActive = activeIds.has(o.data?.id)
          const locked = o.lockMovementX && o.lockMovementY
          return (
            <div
              key={o.data?.id || o.__uid || Math.random()}
              onClick={() => selectObject(o)}
              className={`group flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer
                          border transition ${
                            isActive
                              ? 'border-accent/60 bg-accent/10'
                              : 'border-transparent hover:bg-ink-700'
                          }`}
            >
              <Icon size={15} className={isActive ? 'text-accent-soft' : 'text-ink-300'} />
              <span
                className={`flex-1 truncate text-[12.5px] ${
                  o.visible === false ? 'text-ink-300 line-through' : 'text-slate-200'
                }`}
              >
                {labelFor(o)}
              </span>
              <button
                className="text-ink-300 hover:text-white opacity-60 group-hover:opacity-100"
                title={o.visible === false ? 'Show' : 'Hide'}
                onClick={(e) => {
                  e.stopPropagation()
                  setLayerProp(o, 'visible', o.visible === false)
                }}
              >
                {o.visible === false ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button
                className="text-ink-300 hover:text-white opacity-60 group-hover:opacity-100"
                title={locked ? 'Unlock' : 'Lock'}
                onClick={(e) => {
                  e.stopPropagation()
                  const lock = !locked
                  setLayerProp(o, 'lockMovementX', lock)
                  setLayerProp(o, 'lockMovementY', lock)
                  setLayerProp(o, 'lockRotation', lock)
                  setLayerProp(o, 'lockScalingX', lock)
                  setLayerProp(o, 'lockScalingY', lock)
                  setLayerProp(o, 'selectable', !lock)
                }}
              >
                {locked ? <Lock size={14} /> : <Unlock size={14} />}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
