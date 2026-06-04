// components/Toolbar.jsx
import React, { useState, useRef, useEffect } from 'react'
import {
  Undo2,
  Redo2,
  Copy,
  Trash2,
  Eraser,
  Scissors,
  Download,
  ChevronDown,
  Settings2,
} from 'lucide-react'
import { useEditor } from '../context/EditorContext.jsx'

export default function Toolbar() {
  const {
    undo,
    redo,
    canUndo,
    canRedo,
    duplicateSelected,
    deleteSelected,
    clearAll,
    exportSVG,
    selected,
  } = useEditor()

  const [menuOpen, setMenuOpen] = useState(false)
  const [useInches, setUseInches] = useState(true)
  const [dpi, setDpi] = useState(96)
  const menuRef = useRef(null)

  useEffect(() => {
    const onDoc = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const hasSelection = selected.length > 0

  const doExport = () => {
    exportSVG({ asInches: useInches, dpi: Number(dpi) || 96 })
    setMenuOpen(false)
  }

  return (
    <header className="flex items-center justify-between gap-3 px-4 h-14 border-b border-ink-600 bg-ink-800/90 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 pr-3 mr-1 border-r border-ink-600">
          <div className="h-7 w-7 rounded-lg bg-accent/20 grid place-items-center">
            <Scissors size={16} className="text-accent-soft" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-white">Vector Cut Studio</div>
            <div className="text-[10px] text-ink-300 -mt-0.5">design · weld · export</div>
          </div>
        </div>

        <button className="icon-btn" title="Undo (Ctrl+Z)" disabled={!canUndo} onClick={undo}>
          <Undo2 size={18} />
        </button>
        <button className="icon-btn" title="Redo (Ctrl+Y)" disabled={!canRedo} onClick={redo}>
          <Redo2 size={18} />
        </button>

        <div className="w-px h-6 bg-ink-600 mx-1" />

        <button
          className="icon-btn"
          title="Duplicate (Ctrl+D)"
          disabled={!hasSelection}
          onClick={duplicateSelected}
        >
          <Copy size={18} />
        </button>
        <button
          className="icon-btn"
          title="Delete (Del)"
          disabled={!hasSelection}
          onClick={deleteSelected}
        >
          <Trash2 size={18} />
        </button>
        <button
          className="icon-btn hover:text-signal-red"
          title="Clear canvas"
          onClick={() => {
            if (confirm('Clear the entire canvas? This cannot be undone except via Undo.'))
              clearAll()
          }}
        >
          <Eraser size={18} />
        </button>
      </div>

      <div className="relative" ref={menuRef}>
        <div className="flex items-stretch">
          <button className="btn-accent rounded-r-none pr-3" onClick={doExport}>
            <Download size={16} />
            Make It · Export SVG
          </button>
          <button
            className="btn-accent rounded-l-none border-l border-white/20 px-2"
            title="Export options"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <ChevronDown size={16} />
          </button>
        </div>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-72 panel p-3 z-30 animate-fade-in">
            <div className="flex items-center gap-2 mb-2 text-slate-200">
              <Settings2 size={15} />
              <span className="text-sm font-semibold">Export settings</span>
            </div>
            <label className="flex items-center justify-between py-1.5 text-sm text-slate-300">
              <span>Real-world units (inches)</span>
              <input
                type="checkbox"
                checked={useInches}
                onChange={(e) => setUseInches(e.target.checked)}
                className="accent-accent h-4 w-4"
              />
            </label>
            <label className="flex items-center justify-between py-1.5 text-sm text-slate-300">
              <span>Pixels per inch (DPI)</span>
              <input
                type="number"
                value={dpi}
                min={72}
                max={300}
                disabled={!useInches}
                onChange={(e) => setDpi(e.target.value)}
                className="field w-20 text-right disabled:opacity-40"
              />
            </label>
            <p className="text-[11px] leading-relaxed text-ink-300 mt-2">
              Text is converted to outlined paths automatically. The viewBox is cropped to your
              artwork. At 96&nbsp;DPI the on-screen mat (1152&nbsp;px) maps to a 12&nbsp;in cut.
            </p>
            <button className="btn-accent w-full mt-3" onClick={doExport}>
              <Download size={16} />
              Export now
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
