// context/EditorContext.jsx
import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useEffect,
} from 'react'
import * as fabric from 'fabric'
import { booleanOp, offsetPath } from '../lib/booleanOps.js'
import { isText, textToFabricPath } from '../lib/textToPath.js'
import { alignObjects, distributeObjects } from '../lib/align.js'
import { exportCanvasToSVG, downloadSVG } from '../lib/svgExport.js'

const EditorContext = createContext(null)
export const useEditor = () => useContext(EditorContext)

// Custom object props that must survive (de)serialization.
export const SERIALIZE_PROPS = [
  'name',
  'data',
  'selectable',
  'evented',
  'visible',
  'lockMovementX',
  'lockMovementY',
  'lockRotation',
  'lockScalingX',
  'lockScalingY',
  'hasControls',
  'hasBorders',
  'fillRule',
  'paintFirst',
]

const STORAGE_KEY = 'vcs:autosave:v1'
let UID = 1
const nextId = () => `obj_${UID++}`

export function EditorProvider({ children }) {
  const canvasRef = useRef(null)
  const [, force] = useState(0)
  const refresh = useCallback(() => force((n) => n + 1), [])

  const [selected, setSelected] = useState([])
  const [statusMsg, setStatusMsg] = useState(null)

  // ---- History ------------------------------------------------------------
  const undoStack = useRef([])
  const redoStack = useRef([])
  const restoring = useRef(false)
  const [histVer, setHistVer] = useState(0)

  const serialize = useCallback(() => {
    const c = canvasRef.current
    if (!c) return null
    return JSON.stringify(c.toJSON(SERIALIZE_PROPS))
  }, [])

  const saveHistory = useCallback(() => {
    if (restoring.current) return
    const snap = serialize()
    if (snap == null) return
    const stack = undoStack.current
    if (stack[stack.length - 1] === snap) return
    stack.push(snap)
    if (stack.length > 60) stack.shift()
    redoStack.current = []
    setHistVer((v) => v + 1)
    // Autosave alongside history.
    try {
      localStorage.setItem(STORAGE_KEY, snap)
    } catch {
      /* quota — ignore */
    }
  }, [serialize])

  const loadState = useCallback(
    async (json) => {
      const c = canvasRef.current
      if (!c || !json) return
      restoring.current = true
      await c.loadFromJSON(json)
      c.requestRenderAll()
      restoring.current = false
      setSelected([])
      refresh()
    },
    [refresh]
  )

  const undo = useCallback(async () => {
    const stack = undoStack.current
    if (stack.length <= 1) return
    const current = stack.pop()
    redoStack.current.push(current)
    await loadState(stack[stack.length - 1])
    setHistVer((v) => v + 1)
  }, [loadState])

  const redo = useCallback(async () => {
    if (redoStack.current.length === 0) return
    const snap = redoStack.current.pop()
    undoStack.current.push(snap)
    await loadState(snap)
    setHistVer((v) => v + 1)
  }, [loadState])

  const canUndo = undoStack.current.length > 1
  const canRedo = redoStack.current.length > 0

  // ---- Canvas registration ------------------------------------------------
  const registerCanvas = useCallback(
    (canvas) => {
      canvasRef.current = canvas

      const syncSelection = () => setSelected(canvas.getActiveObjects())
      canvas.on('selection:created', syncSelection)
      canvas.on('selection:updated', syncSelection)
      canvas.on('selection:cleared', () => setSelected([]))

      const onChange = () => {
        saveHistory()
        refresh()
      }
      canvas.on('object:added', onChange)
      canvas.on('object:removed', onChange)
      canvas.on('object:modified', onChange)
      canvas.on('object:skewing', refresh)
      canvas.on('object:scaling', refresh)
      canvas.on('object:moving', refresh)
      canvas.on('object:rotating', refresh)

      // Attempt to restore autosaved project; otherwise seed initial history.
      let restored = false
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          restoring.current = true
          canvas.loadFromJSON(saved).then(() => {
            canvas.requestRenderAll()
            restoring.current = false
            undoStack.current = [saved]
            setHistVer((v) => v + 1)
            refresh()
          })
          restored = true
        }
      } catch {
        /* ignore */
      }
      if (!restored) {
        // Seed baseline snapshot.
        setTimeout(() => {
          undoStack.current = [serialize()]
          setHistVer((v) => v + 1)
        }, 0)
      }
    },
    [refresh, saveHistory, serialize]
  )

  // ---- Helpers ------------------------------------------------------------
  const getCenter = useCallback(() => {
    const c = canvasRef.current
    if (!c) return { x: 0, y: 0 }
    const vpt = c.viewportTransform
    const zoom = c.getZoom()
    return {
      x: (c.getWidth() / 2 - vpt[4]) / zoom,
      y: (c.getHeight() / 2 - vpt[5]) / zoom,
    }
  }, [])

  const addObject = useCallback(
    (obj, { select = true } = {}) => {
      const c = canvasRef.current
      if (!c) return
      if (!obj.name) obj.set('name', obj.type)
      obj.set('data', { ...(obj.data || {}), id: obj.data?.id || nextId() })
      c.add(obj)
      if (select) {
        c.setActiveObject(obj)
        setSelected([obj])
      }
      c.requestRenderAll()
    },
    []
  )

  const status = useCallback((msg, ms = 2600) => {
    setStatusMsg(msg)
    if (ms) setTimeout(() => setStatusMsg((m) => (m === msg ? null : m)), ms)
  }, [])

  // ---- Editing actions ----------------------------------------------------
  const deleteSelected = useCallback(() => {
    const c = canvasRef.current
    if (!c) return
    const objs = c.getActiveObjects()
    if (!objs.length) return
    objs.forEach((o) => c.remove(o))
    c.discardActiveObject()
    setSelected([])
    c.requestRenderAll()
  }, [])

  const duplicateSelected = useCallback(async () => {
    const c = canvasRef.current
    if (!c) return
    const active = c.getActiveObject()
    if (!active) return
    const cloned = await active.clone(SERIALIZE_PROPS)
    cloned.set({
      left: (active.left || 0) + 16,
      top: (active.top || 0) + 16,
      data: { id: nextId() },
    })
    c.discardActiveObject()
    if (cloned.type === 'activeselection') {
      cloned.canvas = c
      cloned.forEachObject((o) => {
        o.set('data', { id: nextId() })
        c.add(o)
      })
      cloned.setCoords()
    } else {
      c.add(cloned)
    }
    c.setActiveObject(cloned)
    c.requestRenderAll()
  }, [])

  const reorder = useCallback(
    (mode) => {
      const c = canvasRef.current
      if (!c) return
      const obj = c.getActiveObject()
      if (!obj) return
      if (mode === 'front') c.bringObjectToFront(obj)
      if (mode === 'back') c.sendObjectToBack(obj)
      if (mode === 'forward') c.bringObjectForward(obj)
      if (mode === 'backward') c.sendObjectBackwards(obj)
      c.requestRenderAll()
      saveHistory()
      refresh()
    },
    [refresh, saveHistory]
  )

  const groupSelected = useCallback(() => {
    const c = canvasRef.current
    if (!c) return
    const active = c.getActiveObject()
    if (!active || active.type !== 'activeselection') return
    const group = new fabric.Group(active.removeAll(), { data: { id: nextId() } })
    c.add(group)
    c.setActiveObject(group)
    c.requestRenderAll()
    saveHistory()
    refresh()
  }, [refresh, saveHistory])

  const ungroupSelected = useCallback(() => {
    const c = canvasRef.current
    if (!c) return
    const active = c.getActiveObject()
    if (!active || active.type !== 'group') return
    const items = active.removeAll()
    c.remove(active)
    items.forEach((o) => {
      o.set('data', { id: nextId() })
      c.add(o)
    })
    const sel = new fabric.ActiveSelection(items, { canvas: c })
    c.setActiveObject(sel)
    c.requestRenderAll()
    saveHistory()
    refresh()
  }, [refresh, saveHistory])

  // Boolean ops --------------------------------------------------------------
  const runBoolean = useCallback(
    (operation) => {
      const c = canvasRef.current
      if (!c) return
      const active = c.getActiveObjects()
      if (active.length < 2) {
        status('Select two or more shapes first.')
        return
      }
      // Order bottom -> top using canvas stacking.
      const all = c.getObjects()
      const ordered = active
        .slice()
        .sort((a, b) => all.indexOf(a) - all.indexOf(b))
      c.discardActiveObject()
      const { path, error } = booleanOp(operation, ordered)
      if (error && !path) {
        status(error)
        c.requestRenderAll()
        return
      }
      ordered.forEach((o) => c.remove(o))
      path.set('data', { id: nextId() })
      path.set('name', operation)
      c.add(path)
      c.setActiveObject(path)
      c.requestRenderAll()
      saveHistory()
      refresh()
      if (error) status(error)
      else status(`${operation} complete.`)
    },
    [refresh, saveHistory, status]
  )

  const runOffset = useCallback(
    (delta) => {
      const c = canvasRef.current
      if (!c) return
      const obj = c.getActiveObject()
      if (!obj || obj.type === 'activeselection') {
        status('Select a single shape to offset.')
        return
      }
      const { path, error } = offsetPath(obj, delta)
      if (error) {
        status(error)
        return
      }
      path.set('data', { id: nextId() })
      path.set('name', 'offset')
      c.add(path)
      c.setActiveObject(path)
      c.requestRenderAll()
      saveHistory()
      refresh()
      status(`Offset ${delta > 0 ? '+' : ''}${delta}px created.`)
    },
    [refresh, saveHistory, status]
  )

  const convertTextToPath = useCallback(async () => {
    const c = canvasRef.current
    if (!c) return
    const objs = c.getActiveObjects().filter(isText)
    if (objs.length === 0) {
      status('Select a text object to convert.')
      return
    }
    c.discardActiveObject()
    const created = []
    for (const t of objs) {
      try {
        const p = await textToFabricPath(t)
        p.set('data', { id: nextId() })
        p.set('name', 'text-path')
        c.remove(t)
        c.add(p)
        created.push(p)
      } catch (e) {
        status(`Convert failed: ${e.message}`)
      }
    }
    if (created.length) {
      const sel =
        created.length === 1
          ? created[0]
          : new fabric.ActiveSelection(created, { canvas: c })
      c.setActiveObject(sel)
    }
    c.requestRenderAll()
    saveHistory()
    refresh()
  }, [refresh, saveHistory, status])

  const align = useCallback(
    (mode) => {
      const c = canvasRef.current
      if (!c) return
      const objs = c.getActiveObjects()
      if (objs.length < 1) return
      c.discardActiveObject()
      alignObjects(objs, mode)
      const sel = new fabric.ActiveSelection(objs, { canvas: c })
      c.setActiveObject(sel)
      c.requestRenderAll()
      saveHistory()
      refresh()
    },
    [refresh, saveHistory]
  )

  const distribute = useCallback(
    (axis) => {
      const c = canvasRef.current
      if (!c) return
      const objs = c.getActiveObjects()
      if (objs.length < 3) {
        status('Distribute needs 3+ objects.')
        return
      }
      c.discardActiveObject()
      distributeObjects(objs, axis)
      const sel = new fabric.ActiveSelection(objs, { canvas: c })
      c.setActiveObject(sel)
      c.requestRenderAll()
      saveHistory()
      refresh()
    },
    [refresh, saveHistory, status]
  )

  const setLayerProp = useCallback(
    (obj, prop, value) => {
      const c = canvasRef.current
      if (!c || !obj) return
      obj.set(prop, value)
      if (prop === 'visible' && value === false) {
        if (c.getActiveObjects().includes(obj)) c.discardActiveObject()
      }
      obj.set('dirty', true)
      c.requestRenderAll()
      saveHistory()
      refresh()
    },
    [refresh, saveHistory]
  )

  const selectObject = useCallback((obj) => {
    const c = canvasRef.current
    if (!c || !obj) return
    if (obj.visible === false || obj.selectable === false) return
    c.setActiveObject(obj)
    setSelected([obj])
    c.requestRenderAll()
  }, [])

  const exportSVG = useCallback(
    async (opts) => {
      const c = canvasRef.current
      if (!c) return
      try {
        const svg = await exportCanvasToSVG(c, opts)
        downloadSVG(svg, 'cut-design.svg')
        status('SVG exported — open it in the Cricut app to cut.')
      } catch (e) {
        status(`Export failed: ${e.message}`)
      }
    },
    [status]
  )

  const clearAll = useCallback(() => {
    const c = canvasRef.current
    if (!c) return
    c.remove(...c.getObjects())
    c.discardActiveObject()
    setSelected([])
    c.requestRenderAll()
    saveHistory()
    refresh()
  }, [refresh, saveHistory])

  const value = {
    canvasRef,
    registerCanvas,
    refresh,
    selected,
    setSelected,
    selectObject,
    getCenter,
    addObject,
    deleteSelected,
    duplicateSelected,
    reorder,
    groupSelected,
    ungroupSelected,
    runBoolean,
    runOffset,
    convertTextToPath,
    align,
    distribute,
    setLayerProp,
    exportSVG,
    clearAll,
    saveHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    histVer,
    statusMsg,
    status,
  }

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
}
