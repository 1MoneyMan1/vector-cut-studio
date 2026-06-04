// App.jsx
import React, { useState } from 'react'
import {
  Shapes,
  Type,
  ImagePlus,
  SlidersHorizontal,
  AlignCenter,
  Layers as LayersIcon,
  Combine,
} from 'lucide-react'
import Toolbar from './components/Toolbar.jsx'
import Canvas from './components/Canvas.jsx'
import ShapePanel from './components/ShapePanel.jsx'
import TextPanel from './components/TextPanel.jsx'
import ImportPanel from './components/ImportPanel.jsx'
import LayersPanel from './components/LayersPanel.jsx'
import PropertiesPanel from './components/PropertiesPanel.jsx'
import AlignPanel from './components/AlignPanel.jsx'
import BooleanPanel from './components/BooleanPanel.jsx'
import { useEditor } from './context/EditorContext.jsx'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts.js'

const LEFT_TABS = [
  { id: 'shapes', label: 'Shapes', icon: Shapes, Panel: ShapePanel },
  { id: 'text', label: 'Text', icon: Type, Panel: TextPanel },
  { id: 'import', label: 'Import', icon: ImagePlus, Panel: ImportPanel },
]

function Section({ icon: Icon, title, children, className = '' }) {
  return (
    <section className={`panel p-3 ${className}`}>
      <div className="flex items-center gap-2 mb-2.5">
        <Icon size={15} className="text-accent-soft" />
        <h2 className="text-[12px] font-semibold uppercase tracking-wider text-slate-200">
          {title}
        </h2>
      </div>
      {children}
    </section>
  )
}

function StatusToast() {
  const { statusMsg } = useEditor()
  if (!statusMsg) return null
  return (
    <div className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 z-40">
      <div className="panel px-4 py-2 text-sm text-slate-100 shadow-float animate-fade-in">
        {statusMsg}
      </div>
    </div>
  )
}

export default function App() {
  const [leftTab, setLeftTab] = useState('shapes')
  useKeyboardShortcuts()

  const ActivePanel = LEFT_TABS.find((t) => t.id === leftTab)?.Panel || ShapePanel

  return (
    <div className="h-screen w-screen flex flex-col bg-ink-900 text-slate-200 overflow-hidden">
      <Toolbar />

      <div className="flex-1 min-h-0 flex">
        {/* Left rail: icon switcher + active add-panel */}
        <div className="flex min-h-0">
          <nav className="w-14 shrink-0 border-r border-ink-600 bg-ink-800 flex flex-col items-center py-3 gap-1">
            {LEFT_TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                title={label}
                onClick={() => setLeftTab(id)}
                className={`flex flex-col items-center gap-1 w-12 py-2 rounded-lg transition ${
                  leftTab === id
                    ? 'bg-accent/15 text-accent-soft'
                    : 'text-ink-300 hover:text-slate-200 hover:bg-ink-700'
                }`}
              >
                <Icon size={20} />
                <span className="text-[9px] font-medium">{label}</span>
              </button>
            ))}
          </nav>
          <aside className="w-72 shrink-0 border-r border-ink-600 bg-ink-800/60 overflow-y-auto p-3">
            <ActivePanel />
          </aside>
        </div>

        {/* Center: workspace */}
        <main className="flex-1 min-w-0 relative">
          <Canvas />
          <StatusToast />
        </main>

        {/* Right rail: inspector */}
        <aside className="w-80 shrink-0 border-l border-ink-600 bg-ink-800/60 flex flex-col min-h-0">
          <div className="p-3 space-y-3 overflow-y-auto flex flex-col min-h-0 flex-1">
            <Section icon={SlidersHorizontal} title="Properties">
              <PropertiesPanel />
            </Section>
            <Section icon={AlignCenter} title="Align & Distribute">
              <AlignPanel />
            </Section>
            <Section icon={Combine} title="Combine">
              <BooleanPanel />
            </Section>
            <Section icon={LayersIcon} title="Layers" className="flex-1 min-h-[180px] flex flex-col">
              <LayersPanel />
            </Section>
          </div>
        </aside>
      </div>
    </div>
  )
}
