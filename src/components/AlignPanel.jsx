// components/AlignPanel.jsx
import React from 'react'
import {
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  AlignHorizontalSpaceBetween,
  AlignVerticalSpaceBetween,
} from 'lucide-react'
import { useEditor } from '../context/EditorContext.jsx'

export default function AlignPanel() {
  const { align, distribute, selected } = useEditor()
  const count = selected.length

  const A = ({ icon: Icon, mode, title }) => (
    <button className="icon-btn" title={title} onClick={() => align(mode)}>
      <Icon size={17} />
    </button>
  )
  const D = ({ icon: Icon, axis, title }) => (
    <button className="icon-btn" title={title} onClick={() => distribute(axis)}>
      <Icon size={17} />
    </button>
  )

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-1">
        <A icon={AlignStartVertical} mode="left" title="Align left" />
        <A icon={AlignCenterVertical} mode="centerH" title="Align center (horizontal)" />
        <A icon={AlignEndVertical} mode="right" title="Align right" />
        <div className="w-px h-6 bg-ink-600" />
        <A icon={AlignStartHorizontal} mode="top" title="Align top" />
        <A icon={AlignCenterHorizontal} mode="middle" title="Align middle (vertical)" />
        <A icon={AlignEndHorizontal} mode="bottom" title="Align bottom" />
      </div>
      <div className="flex items-center gap-1">
        <D icon={AlignHorizontalSpaceBetween} axis="h" title="Distribute horizontally" />
        <D icon={AlignVerticalSpaceBetween} axis="v" title="Distribute vertically" />
        <span className="text-[11px] text-ink-300 ml-2">
          {count < 2
            ? 'Select 2+ to align'
            : count < 3
            ? 'Select 3+ to distribute'
            : `${count} objects selected`}
        </span>
      </div>
    </div>
  )
}
