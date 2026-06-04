// components/TextPanel.jsx
import React, { useState, useEffect, useCallback } from 'react'
import * as fabric from 'fabric'
import { Type, Spline, WandSparkles } from 'lucide-react'
import { useEditor } from '../context/EditorContext.jsx'
import { FONTS, ensureFontReady } from '../lib/fonts.js'
import { buildCurvedText } from '../lib/curveText.js'

const DEFAULT_FILL = '#9aa4b2'

// Pull the editable text-ish object out of the current selection, if any.
function activeTextObject(canvas) {
  if (!canvas) return null
  const o = canvas.getActiveObject()
  if (!o) return null
  if (o.type === 'i-text' || o.type === 'text' || o.type === 'textbox') return o
  if (o.type === 'group' && o.data?.kind === 'curvedText') return o
  return null
}

export default function TextPanel() {
  const { canvasRef, addObject, getCenter, saveHistory, refresh, selected, status } = useEditor()

  const [fontFamily, setFontFamily] = useState('Sora')
  const [fontSize, setFontSize] = useState(60)
  const [charSpacing, setCharSpacing] = useState(0)
  const [lineHeight, setLineHeight] = useState(1.16)
  const [fill, setFill] = useState(DEFAULT_FILL)
  const [curve, setCurve] = useState(0)

  // Sync the controls to whatever text object is selected.
  useEffect(() => {
    const t = activeTextObject(canvasRef.current)
    if (!t) return
    if (t.data?.kind === 'curvedText') {
      setFontFamily(t.data.fontFamily || 'Sora')
      setFontSize(Math.round(t.data.fontSize || 60))
      setCharSpacing(t.data.charSpacing || 0)
      setFill(t.data.fill || DEFAULT_FILL)
      setCurve(t.data.curve || 0)
    } else {
      setFontFamily(t.fontFamily || 'Sora')
      setFontSize(Math.round(t.fontSize || 60))
      setCharSpacing(t.charSpacing || 0)
      setLineHeight(t.lineHeight || 1.16)
      setFill(typeof t.fill === 'string' ? t.fill : DEFAULT_FILL)
      setCurve(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  const addText = useCallback(async () => {
    await ensureFontReady(fontFamily)
    const c = getCenter()
    const t = new fabric.IText('Your text', {
      left: c.x,
      top: c.y,
      originX: 'center',
      originY: 'center',
      fontFamily,
      fontSize,
      charSpacing,
      lineHeight,
      fill,
      editable: true,
      objectCaching: false,
    })
    addObject(t)
  }, [addObject, getCenter, fontFamily, fontSize, charSpacing, lineHeight, fill])

  // Apply a live property to the selected text object (straight text only).
  const applyProp = useCallback(
    async (patch, { font } = {}) => {
      const canvas = canvasRef.current
      const t = activeTextObject(canvas)
      if (!t) return
      if (font) await ensureFontReady(patch.fontFamily || fontFamily)

      if (t.data?.kind === 'curvedText') {
        // Rebuild the curved group with merged params.
        rebuildCurved(t, patch)
        return
      }
      t.set(patch)
      t.set('dirty', true)
      canvas.requestRenderAll()
      saveHistory()
      refresh()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fontFamily, saveHistory, refresh]
  )

  // Rebuild / create a curved group from a source object, preserving placement.
  const rebuildCurved = useCallback(
    (source, patch = {}) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const base =
        source.data?.kind === 'curvedText'
          ? source.data
          : {
              text: (source.text || 'Curved').split('\n').join(' '),
              fontFamily: source.fontFamily,
              fontSize: source.fontSize,
              fill: typeof source.fill === 'string' ? source.fill : DEFAULT_FILL,
              charSpacing: source.charSpacing || 0,
              curve: 0,
            }
      const params = { ...base, ...patch }

      // Returning to a straight curve restores an editable IText.
      if (Math.abs(params.curve) < 0.5) {
        const t = new fabric.IText(params.text, {
          left: source.left,
          top: source.top,
          angle: source.angle,
          scaleX: source.scaleX,
          scaleY: source.scaleY,
          originX: 'center',
          originY: 'center',
          fontFamily: params.fontFamily,
          fontSize: params.fontSize,
          charSpacing: params.charSpacing,
          fill: params.fill,
          editable: true,
          objectCaching: false,
        })
        canvas.remove(source)
        t.set('data', { id: `text_${Date.now()}` })
        canvas.add(t)
        canvas.setActiveObject(t)
        canvas.requestRenderAll()
        saveHistory()
        refresh()
        return
      }

      const group = buildCurvedText({
        ...params,
        left: source.left,
        top: source.top,
      })
      group.set({ angle: source.angle, scaleX: source.scaleX, scaleY: source.scaleY })
      group.set('data', { ...group.data, id: `curved_${Date.now()}` })
      canvas.remove(source)
      canvas.add(group)
      canvas.setActiveObject(group)
      canvas.requestRenderAll()
      saveHistory()
      refresh()
    },
    [canvasRef, saveHistory, refresh]
  )

  const onCurveChange = (val) => {
    setCurve(val)
    const t = activeTextObject(canvasRef.current)
    if (!t) {
      status('Select a text object to curve it.')
      return
    }
    rebuildCurved(t, { curve: val })
  }

  const hasText = !!activeTextObject(canvasRef.current)

  return (
    <div className="space-y-3">
      <button className="btn-soft w-full" onClick={addText}>
        <Type size={16} />
        Add Text
      </button>

      <div>
        <label className="section-label">Font</label>
        <select
          className="field w-full mt-1"
          value={fontFamily}
          style={{ fontFamily }}
          onChange={(e) => {
            const v = e.target.value
            setFontFamily(v)
            ensureFontReady(v).then(() => applyProp({ fontFamily: v }, { font: true }))
          }}
        >
          {FONTS.map((f) => (
            <option key={f.id} value={f.name} style={{ fontFamily: f.name }}>
              {f.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="section-label">Size</label>
          <input
            type="number"
            min={4}
            max={800}
            className="field w-full mt-1"
            value={fontSize}
            onChange={(e) => {
              const v = Number(e.target.value)
              setFontSize(v)
              applyProp({ fontSize: v })
            }}
          />
        </div>
        <div>
          <label className="section-label">Fill</label>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="color"
              className="h-9 w-10 rounded-md bg-ink-700 border border-ink-500 cursor-pointer"
              value={fill}
              onChange={(e) => {
                setFill(e.target.value)
                applyProp({ fill: e.target.value })
              }}
            />
            <input
              className="field w-full font-mono text-xs"
              value={fill}
              onChange={(e) => {
                setFill(e.target.value)
                applyProp({ fill: e.target.value })
              }}
            />
          </div>
        </div>
      </div>

      <div>
        <label className="section-label flex justify-between">
          <span>Letter spacing</span>
          <span className="text-ink-300 font-mono">{charSpacing}</span>
        </label>
        <input
          type="range"
          min={-200}
          max={800}
          step={10}
          className="w-full accent-accent mt-1"
          value={charSpacing}
          onChange={(e) => {
            const v = Number(e.target.value)
            setCharSpacing(v)
            applyProp({ charSpacing: v })
          }}
        />
      </div>

      <div>
        <label className="section-label flex justify-between">
          <span>Line height</span>
          <span className="text-ink-300 font-mono">{lineHeight.toFixed(2)}</span>
        </label>
        <input
          type="range"
          min={0.6}
          max={2.4}
          step={0.02}
          className="w-full accent-accent mt-1 disabled:opacity-40"
          value={lineHeight}
          disabled={!!activeTextObject(canvasRef.current)?.data?.kind}
          onChange={(e) => {
            const v = Number(e.target.value)
            setLineHeight(v)
            applyProp({ lineHeight: v })
          }}
        />
      </div>

      <div className="rounded-lg border border-ink-600 bg-ink-700/60 p-2.5">
        <label className="section-label flex justify-between items-center">
          <span className="flex items-center gap-1.5">
            <Spline size={13} /> Curve
          </span>
          <span className="text-ink-300 font-mono">{curve}</span>
        </label>
        <input
          type="range"
          min={-100}
          max={100}
          step={1}
          className="w-full accent-accent mt-1"
          value={curve}
          onChange={(e) => onCurveChange(Number(e.target.value))}
        />
        <div className="flex justify-between text-[10px] text-ink-300 mt-0.5">
          <span>frown</span>
          <span>flat</span>
          <span>smile</span>
        </div>
        {!hasText && (
          <p className="text-[11px] text-ink-300 mt-1.5 flex items-start gap-1">
            <WandSparkles size={12} className="mt-0.5 shrink-0" />
            Select a text object, then drag to curve it. Curving “bakes” the text — set curve back
            to 0 to edit the words again.
          </p>
        )}
      </div>
    </div>
  )
}
