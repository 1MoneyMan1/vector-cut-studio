// components/ImportPanel.jsx
import React, { useRef, useState, useCallback } from 'react'
import * as fabric from 'fabric'
import { Upload, Image as ImageIcon, Wand2, Loader2 } from 'lucide-react'
import { useEditor } from '../context/EditorContext.jsx'
import { traceImageToFabricPath } from '../lib/trace.js'

function readFileAsText(file) {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result)
    r.onerror = rej
    r.readAsText(file)
  })
}
function readFileAsDataURL(file) {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result)
    r.onerror = rej
    r.readAsDataURL(file)
  })
}
function loadImageEl(src) {
  return new Promise((res, rej) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => res(img)
    img.onerror = rej
    img.src = src
  })
}

export default function ImportPanel() {
  const { canvasRef, addObject, getCenter, status, saveHistory, refresh } = useEditor()
  const inputRef = useRef(null)

  const [raster, setRaster] = useState(null) // { src, w, h }
  const [threshold, setThreshold] = useState(128)
  const [invert, setInvert] = useState(false)
  const [tracing, setTracing] = useState(false)

  const handleFiles = useCallback(
    async (files) => {
      const file = files?.[0]
      if (!file) return
      const center = getCenter()

      try {
        if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
          const text = await readFileAsText(file)
          const { objects } = await fabric.loadSVGFromString(text)
          const valid = (objects || []).filter(Boolean)
          if (!valid.length) {
            status('No drawable elements found in that SVG.')
            return
          }
          const obj =
            valid.length === 1
              ? valid[0]
              : fabric.util.groupSVGElements(valid, {})
          obj.set({ left: center.x, top: center.y, originX: 'center', originY: 'center' })
          obj.setCoords()
          addObject(obj)
          status('SVG imported.')
        } else if (file.type.startsWith('image/')) {
          const dataUrl = await readFileAsDataURL(file)
          const img = await fabric.FabricImage.fromURL(dataUrl, { crossOrigin: 'anonymous' })
          // Scale large images down to fit comfortably on the mat.
          const maxSide = 520
          const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
          img.set({
            left: center.x,
            top: center.y,
            originX: 'center',
            originY: 'center',
            scaleX: scale,
            scaleY: scale,
          })
          addObject(img)
          setRaster({ src: dataUrl, w: img.width, h: img.height })
          status('Image imported — trace it below to make it cuttable.')
        } else {
          status('Unsupported file. Use SVG, PNG, or JPG.')
        }
      } catch (e) {
        status(`Import failed: ${e.message}`)
      }
    },
    [addObject, getCenter, status]
  )

  const onPick = (e) => {
    handleFiles(e.target.files)
    e.target.value = '' // allow re-importing the same file
  }

  const runTrace = useCallback(async () => {
    if (!raster) return
    setTracing(true)
    try {
      const imgEl = await loadImageEl(raster.src)
      const path = traceImageToFabricPath(imgEl, { threshold, invert })
      const center = getCenter()
      path.set({ left: center.x, top: center.y, originX: 'center', originY: 'center' })
      path.setCoords()
      addObject(path)
      status('Traced to vector path. Tune threshold and re-trace if needed.')
      saveHistory()
      refresh()
    } catch (e) {
      status(e.message || 'Trace failed.')
    } finally {
      setTracing(false)
    }
  }, [raster, threshold, invert, addObject, getCenter, status, saveHistory, refresh])

  return (
    <div className="space-y-3">
      <button
        className="w-full rounded-xl border border-dashed border-ink-500 bg-ink-700/50 py-6
                   flex flex-col items-center gap-2 text-ink-300 hover:border-accent/60
                   hover:text-accent-soft transition"
        onClick={() => inputRef.current?.click()}
      >
        <Upload size={22} />
        <span className="text-sm font-medium">Upload SVG · PNG · JPG</span>
        <span className="text-[11px] text-ink-300">click to browse</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".svg,image/svg+xml,image/png,image/jpeg"
        className="hidden"
        onChange={onPick}
      />

      {raster && (
        <div className="rounded-lg border border-ink-600 bg-ink-700/60 p-3 space-y-2.5 animate-fade-in">
          <div className="flex items-center gap-2 text-slate-200">
            <ImageIcon size={15} />
            <span className="text-sm font-semibold">Trace raster → vector</span>
          </div>
          <img
            src={raster.src}
            alt="preview"
            className="w-full h-24 object-contain rounded-md bg-ink-900 border border-ink-600"
          />
          <div>
            <label className="section-label flex justify-between">
              <span>Threshold</span>
              <span className="font-mono text-ink-300">{threshold}</span>
            </label>
            <input
              type="range"
              min={1}
              max={254}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full accent-accent mt-1"
            />
          </div>
          <label className="flex items-center justify-between text-sm text-slate-300">
            <span>Invert (trace light areas)</span>
            <input
              type="checkbox"
              checked={invert}
              onChange={(e) => setInvert(e.target.checked)}
              className="accent-accent h-4 w-4"
            />
          </label>
          <button className="btn-accent w-full" onClick={runTrace} disabled={tracing}>
            {tracing ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
            {tracing ? 'Tracing…' : 'Trace to vector'}
          </button>
          <p className="text-[11px] text-ink-300 leading-relaxed">
            Tracing detects solid outer shapes (interior holes are ignored). Best with high-contrast
            black-on-white art. The original image stays on the canvas as a printable layer.
          </p>
        </div>
      )}
    </div>
  )
}
