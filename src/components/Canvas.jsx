// components/Canvas.jsx
import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as fabric from 'fabric'
import { useEditor } from '../context/EditorContext.jsx'
import { Plus, Minus, Maximize, Hand } from 'lucide-react'

const BOARD = 1152 // 12in @ 96dpi — a Cricut StandardGrip mat guide

export default function Canvas() {
  const elRef = useRef(null)
  const wrapRef = useRef(null)
  const canvasObjRef = useRef(null)
  const { registerCanvas } = useEditor()
  const [zoom, setZoom] = useState(1)
  const [spaceHeld, setSpaceHeld] = useState(false)

  const drawMat = useCallback((canvas) => {
    const ctx = canvas.getContext()
    const vpt = canvas.viewportTransform
    ctx.save()
    ctx.setTransform(vpt[0], vpt[1], vpt[2], vpt[3], vpt[4], vpt[5])
    // board
    ctx.fillStyle = 'rgba(255,255,255,0.04)'
    ctx.strokeStyle = 'rgba(123,162,255,0.35)'
    ctx.lineWidth = 1 / canvas.getZoom()
    ctx.beginPath()
    ctx.rect(0, 0, BOARD, BOARD)
    ctx.fill()
    ctx.stroke()
    // 1-inch grid
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'
    for (let i = 96; i < BOARD; i += 96) {
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i, BOARD)
      ctx.moveTo(0, i)
      ctx.lineTo(BOARD, i)
      ctx.stroke()
    }
    ctx.restore()
  }, [])

  const fitView = useCallback((canvas) => {
    const w = canvas.getWidth()
    const h = canvas.getHeight()
    const pad = 80
    const z = Math.min((w - pad) / BOARD, (h - pad) / BOARD)
    canvas.setZoom(z)
    const vpt = canvas.viewportTransform
    vpt[4] = (w - BOARD * z) / 2
    vpt[5] = (h - BOARD * z) / 2
    canvas.setViewportTransform(vpt)
    setZoom(z)
    canvas.requestRenderAll()
  }, [])

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = new fabric.Canvas(elRef.current, {
      width: wrap.clientWidth,
      height: wrap.clientHeight,
      backgroundColor: 'transparent',
      preserveObjectStacking: true,
      selection: true,
      fireRightClick: true,
      stopContextMenu: true,
    })
    canvasObjRef.current = canvas

    // Mat guide.
    canvas.on('after:render', () => drawMat(canvas))
    // Re-draw the mat under objects: easier to draw on 'before:render' so it sits behind.
    canvas.off('after:render')
    canvas.on('before:render', () => {
      // clear handled by fabric; we draw the mat right after clearing, before objects
    })
    canvas.on('after:render', () => {})
    // Use a dedicated overlay draw via contextTop is complex; draw mat behind by
    // hooking the lower render: simplest reliable approach is before:render clear + draw.
    const origRender = canvas.renderCanvas.bind(canvas)
    canvas.renderCanvas = function (ctx, objects) {
      this.clearContext(ctx)
      drawMat(this)
      origRender(ctx, objects)
    }

    // ---- Wheel zoom -------------------------------------------------------
    canvas.on('mouse:wheel', (opt) => {
      const e = opt.e
      e.preventDefault()
      e.stopPropagation()
      let z = canvas.getZoom()
      z *= 0.999 ** e.deltaY
      z = Math.min(Math.max(z, 0.05), 20)
      canvas.zoomToPoint(new fabric.Point(e.offsetX, e.offsetY), z)
      setZoom(z)
    })

    // ---- Space / middle-button panning -----------------------------------
    let isPanning = false
    let lastX = 0
    let lastY = 0
    let spaceDown = false

    canvas.on('mouse:down', (opt) => {
      const e = opt.e
      if (spaceDown || e.button === 1 || e.altKey) {
        isPanning = true
        canvas.selection = false
        canvas.setCursor('grabbing')
        lastX = e.clientX
        lastY = e.clientY
      }
    })
    canvas.on('mouse:move', (opt) => {
      if (!isPanning) return
      const e = opt.e
      const vpt = canvas.viewportTransform
      vpt[4] += e.clientX - lastX
      vpt[5] += e.clientY - lastY
      lastX = e.clientX
      lastY = e.clientY
      canvas.requestRenderAll()
    })
    canvas.on('mouse:up', () => {
      if (isPanning) {
        isPanning = false
        canvas.selection = true
        canvas.setCursor('default')
      }
    })

    const onKeyDown = (e) => {
      if (e.code === 'Space' && !e.repeat && e.target === document.body) {
        spaceDown = true
        setSpaceHeld(true)
        canvas.defaultCursor = 'grab'
        canvas.setCursor('grab')
      }
    }
    const onKeyUp = (e) => {
      if (e.code === 'Space') {
        spaceDown = false
        setSpaceHeld(false)
        canvas.defaultCursor = 'default'
        canvas.setCursor('default')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    // ---- Resize -----------------------------------------------------------
    const ro = new ResizeObserver(() => {
      canvas.setDimensions({ width: wrap.clientWidth, height: wrap.clientHeight })
      canvas.requestRenderAll()
    })
    ro.observe(wrap)

    registerCanvas(canvas)
    requestAnimationFrame(() => fitView(canvas))

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      ro.disconnect()
      canvas.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const applyZoom = (factor) => {
    const canvas = canvasObjRef.current
    if (!canvas) return
    let z = canvas.getZoom() * factor
    z = Math.min(Math.max(z, 0.05), 20)
    const c = new fabric.Point(canvas.getWidth() / 2, canvas.getHeight() / 2)
    canvas.zoomToPoint(c, z)
    setZoom(z)
  }

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full overflow-hidden workspace-grid"
      style={{ cursor: spaceHeld ? 'grab' : 'default' }}
    >
      <canvas ref={elRef} />

      {/* Zoom controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 panel px-1.5 py-1">
        <button className="icon-btn" onClick={() => applyZoom(1 / 1.2)} title="Zoom out">
          <Minus size={16} />
        </button>
        <span className="tabular w-14 text-center text-xs text-slate-300">
          {Math.round(zoom * 100)}%
        </span>
        <button className="icon-btn" onClick={() => applyZoom(1.2)} title="Zoom in">
          <Plus size={16} />
        </button>
        <div className="mx-1 h-5 w-px bg-ink-500" />
        <button
          className="icon-btn"
          onClick={() => fitView(canvasObjRef.current)}
          title="Fit to screen"
        >
          <Maximize size={16} />
        </button>
      </div>

      {/* Pan hint */}
      <div className="absolute bottom-4 right-4 panel px-3 py-2 text-[11px] text-ink-300 flex items-center gap-2">
        <Hand size={13} /> Hold Space / Alt to pan · Scroll to zoom
      </div>
    </div>
  )
}
