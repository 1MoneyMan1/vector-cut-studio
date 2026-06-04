// hooks/useKeyboardShortcuts.js
// Global editor shortcuts. We deliberately ignore key events while the user is
// typing in a form field or editing an IText, so text entry is never hijacked.
import { useEffect, useRef } from 'react'
import * as fabric from 'fabric'
import { useEditor } from '../context/EditorContext.jsx'
import { SERIALIZE_PROPS } from '../context/EditorContext.jsx'

function isTypingTarget(e) {
  const el = e.target
  if (!el) return false
  const tag = (el.tagName || '').toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
  if (el.isContentEditable) return true
  return false
}

export function useKeyboardShortcuts() {
  const { canvasRef, undo, redo, deleteSelected, refresh, saveHistory } = useEditor()
  // Internal clipboard of serialized fabric objects (survives across paste).
  const clipboard = useRef(null)

  useEffect(() => {
    const onKey = async (e) => {
      const c = canvasRef.current
      if (!c) return

      // If editing text inside the canvas, let the IText handle everything.
      const active = c.getActiveObject()
      if (active && active.isEditing) return
      if (isTypingTarget(e)) return

      const mod = e.metaKey || e.ctrlKey
      const key = e.key.toLowerCase()

      // Undo / Redo
      if (mod && key === 'z' && !e.shiftKey) {
        e.preventDefault()
        await undo()
        return
      }
      if ((mod && key === 'y') || (mod && key === 'z' && e.shiftKey)) {
        e.preventDefault()
        await redo()
        return
      }

      // Copy
      if (mod && key === 'c') {
        const obj = c.getActiveObject()
        if (!obj) return
        e.preventDefault()
        const cloned = await obj.clone(SERIALIZE_PROPS)
        clipboard.current = cloned
        return
      }

      // Paste
      if (mod && key === 'v') {
        if (!clipboard.current) return
        e.preventDefault()
        const cloned = await clipboard.current.clone(SERIALIZE_PROPS)
        c.discardActiveObject()
        cloned.set({
          left: (cloned.left || 0) + 24,
          top: (cloned.top || 0) + 24,
          data: { id: `paste_${Date.now()}` },
        })
        if (cloned.type === 'activeselection') {
          cloned.canvas = c
          cloned.forEachObject((o) => c.add(o))
          cloned.setCoords()
        } else {
          c.add(cloned)
        }
        c.setActiveObject(cloned)
        c.requestRenderAll()
        // Keep the clipboard pointing at the original so repeated pastes cascade.
        clipboard.current.set({
          left: (clipboard.current.left || 0) + 24,
          top: (clipboard.current.top || 0) + 24,
        })
        saveHistory()
        refresh()
        return
      }

      // Duplicate (Ctrl/Cmd + D)
      if (mod && key === 'd') {
        const obj = c.getActiveObject()
        if (!obj) return
        e.preventDefault()
        const cloned = await obj.clone(SERIALIZE_PROPS)
        c.discardActiveObject()
        cloned.set({
          left: (cloned.left || 0) + 24,
          top: (cloned.top || 0) + 24,
          data: { id: `dup_${Date.now()}` },
        })
        if (cloned.type === 'activeselection') {
          cloned.canvas = c
          cloned.forEachObject((o) => c.add(o))
          cloned.setCoords()
        } else {
          c.add(cloned)
        }
        c.setActiveObject(cloned)
        c.requestRenderAll()
        saveHistory()
        refresh()
        return
      }

      // Delete
      if (key === 'delete' || key === 'backspace') {
        const obj = c.getActiveObject()
        if (!obj) return
        e.preventDefault()
        deleteSelected()
        return
      }

      // Select all (Ctrl/Cmd + A)
      if (mod && key === 'a') {
        e.preventDefault()
        const objs = c.getObjects().filter((o) => o.selectable !== false && o.visible !== false)
        if (!objs.length) return
        c.discardActiveObject()
        const sel = new fabric.ActiveSelection(objs, { canvas: c })
        c.setActiveObject(sel)
        c.requestRenderAll()
        refresh()
        return
      }

      // Nudge with arrow keys
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        const obj = c.getActiveObject()
        if (!obj) return
        e.preventDefault()
        const step = e.shiftKey ? 10 : 1
        if (key === 'arrowup') obj.top -= step
        if (key === 'arrowdown') obj.top += step
        if (key === 'arrowleft') obj.left -= step
        if (key === 'arrowright') obj.left += step
        obj.setCoords()
        c.requestRenderAll()
        refresh()
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [canvasRef, undo, redo, deleteSelected, refresh, saveHistory])
}
