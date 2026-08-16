'use client'

import { useState, MouseEvent, TouchEvent, useEffect, useTransition } from 'react'
import { Lock, Unlock, CheckCircle2, X, ZoomIn, ZoomOut, Move, ArrowUp, ArrowDown, Trash2, Plus, Save, Loader2, Key, AlertTriangle } from 'lucide-react'
import { updateNodeSchema, unlockNode } from '@/app/actions'

export default function SkillTreeVisualizer({ trees, nodes, availableXp, currentAttribute }: { trees: any[], nodes: any[], availableXp: number, currentAttribute: string }) {
  const [localNodes, setLocalNodes] = useState(nodes)
  useEffect(() => setLocalNodes(nodes), [nodes])

  const [selectedNode, setSelectedNode] = useState<any | null>(null)
  const [modalTab, setModalTab] = useState<'curriculum' | 'resources'>('curriculum')
  const [editSchema, setEditSchema] = useState<any>({ sub_quests: [], resources: [] })
  
  const [isPending, startTransition] = useTransition()
  const [newSubquest, setNewSubquest] = useState('')
  const [newResTitle, setNewResTitle] = useState('')
  const [newResUrl, setNewResUrl] = useState('')

  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const handleMouseDown = (e: MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
  }
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return
    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
  }
  const handleMouseUp = () => setIsDragging(false)
  const handleMouseLeave = () => setIsDragging(false)

  const handleTouchStart = (e: TouchEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y })
  }
  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging) return
    setPosition({ x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y })
  }
  const handleTouchEnd = () => setIsDragging(false)

  const zoomIn = () => setScale(s => Math.min(s + 0.2, 2.5))
  const zoomOut = () => setScale(s => Math.max(s - 0.2, 0.4))
  const resetView = () => { setScale(1); setPosition({ x: 0, y: 0 }) }

  const getNodeProgress = (node: any) => {
    if (node.status === 'completed') return 100
    if (!node.dynamic_schema?.sub_quests?.length) {
      return (node.status === 'unlocked' || node.status === 'in_progress' || node.status === 'active') ? 100 : 0
    }
    const total = node.dynamic_schema.sub_quests.length
    const completed = node.dynamic_schema.sub_quests.filter((q: any) => q.completed).length
    return Math.round((completed / total) * 100)
  }

  const getPrereqError = (node: any) => {
    if (!node) return null
    const title = node.title || ''
    let prereqTitle = ''
    
    if (title.includes('Security & Hardware')) prereqTitle = 'Operating Systems'
    else if (title.includes('Data Analytics & AI/ML')) prereqTitle = 'Mathematical Foundations'
    else if (title.includes('Open Source')) prereqTitle = 'Version Control'
    
    if (!prereqTitle) return null

    const prereqNode = localNodes.find(n => n.title.includes(prereqTitle))
    if (!prereqNode) return null

    const progress = getNodeProgress(prereqNode)
    if (progress < 50) {
      return `Requires 50% completion of ${prereqTitle} (Currently ${progress}%)`
    }
    return null
  }

  const openModal = (node: any) => {
    setSelectedNode(node)
    
    let parsedSchema = node.dynamic_schema
    if (typeof parsedSchema === 'string') {
      try { parsedSchema = JSON.parse(parsedSchema) } catch(e) { parsedSchema = {} }
    }
    
    const safeSchema = {
      sub_quests: Array.isArray(parsedSchema?.sub_quests) ? parsedSchema.sub_quests : [],
      resources: Array.isArray(parsedSchema?.resources) ? parsedSchema.resources : []
    }

    setEditSchema(JSON.parse(JSON.stringify(safeSchema)))
    setModalTab('curriculum')
  }

  const handleSave = () => {
    startTransition(async () => {
      await updateNodeSchema(selectedNode.id, editSchema)
      setLocalNodes(current => current.map(n => n.id === selectedNode.id ? { ...n, dynamic_schema: editSchema } : n))
    })
  }

  const handleUnlock = () => {
    const prereqError = getPrereqError(selectedNode)
    if (prereqError || availableXp < selectedNode.xp_cost) return

    startTransition(async () => {
      await unlockNode(selectedNode.id, selectedNode.xp_cost, currentAttribute)
      setLocalNodes(current => current.map(n => n.id === selectedNode.id ? { ...n, status: 'unlocked' } : n))
      setSelectedNode({ ...selectedNode, status: 'unlocked' })
    })
  }

  const moveItem = (index: number, direction: 'up' | 'down', listType: 'sub_quests' | 'resources') => {
    const list = [...(editSchema[listType] || [])]
    if (direction === 'up' && index > 0) {
      [list[index - 1], list[index]] = [list[index], list[index - 1]]
    } else if (direction === 'down' && index < list.length - 1) {
      [list[index + 1], list[index]] = [list[index], list[index + 1]]
    }
    setEditSchema({ ...editSchema, [listType]: list })
  }

  const deleteItem = (index: number, listType: 'sub_quests' | 'resources') => {
    const list = (editSchema[listType] || []).filter((_: any, i: number) => i !== index)
    setEditSchema({ ...editSchema, [listType]: list })
  }

  const addSubquest = () => {
    if (!newSubquest.trim()) return
    const list = [...(editSchema.sub_quests || []), { title: newSubquest, completed: false }]
    setEditSchema({ ...editSchema, sub_quests: list })
    setNewSubquest('')
  }

  const addResource = () => {
    if (!newResTitle.trim()) return
    const list = [...(editSchema.resources || []), { title: newResTitle, url: newResUrl || '#' }]
    setEditSchema({ ...editSchema, resources: list })
    setNewResTitle('')
    setNewResUrl('')
  }

  const renderNode = (node: any, allNodes: any[]) => {
    const children = allNodes.filter(n => n.parent_node_id === node.id)
    const isCompleted = node.status === 'completed'
    const isUnlocked = node.status === 'unlocked' || node.status === 'in_progress' || node.status === 'active'
    const progress = getNodeProgress(node)

    return (
      <div key={node.id} className="flex items-center">
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); openModal(node); }}
            className={`flex flex-col items-center justify-center w-28 h-28 p-2 rounded-2xl border-2 transition-all hover:scale-105 z-10 relative shrink-0 ${
              isCompleted ? 'bg-emerald-950/80 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]' :
              isUnlocked ? 'bg-blue-950/80 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)] cursor-pointer' :
              'bg-neutral-900 border-neutral-700 opacity-80 cursor-pointer'
            }`}
          >
            <div className="mb-2">
              {isCompleted ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> :
               isUnlocked ? <Unlock className="w-5 h-5 text-blue-500" /> :
               <Lock className="w-5 h-5 text-neutral-500" />}
            </div>
            <span className={`text-[11px] font-bold text-center leading-tight line-clamp-2 ${isCompleted ? 'text-emerald-400' : isUnlocked ? 'text-blue-400' : 'text-neutral-500'}`}>
              {node.title}
            </span>
            {isUnlocked || isCompleted ? (
              <span className={`text-[10px] mt-2 font-mono bg-black/40 px-2 py-0.5 rounded ${isCompleted ? 'text-emerald-400' : 'text-neutral-400'}`}>
                {progress}%
              </span>
            ) : (
              <span className={`text-[10px] mt-2 font-mono bg-black/40 px-2 py-0.5 rounded flex items-center gap-1 ${availableXp >= (node.xp_cost || 0) ? 'text-blue-400' : 'text-neutral-500'}`}>
                <Key className="w-3 h-3" /> {node.xp_cost || 0}
              </span>
            )}
          </button>
          {children.length > 0 && <div className="absolute top-1/2 -right-8 w-8 h-[2px] bg-neutral-700 -translate-y-1/2 -z-10"></div>}
        </div>

        {children.length > 0 && (
          <div className="flex flex-col gap-8 ml-8 relative">
            {children.length > 1 && <div className="absolute left-0 top-14 bottom-14 w-[2px] bg-neutral-700 -translate-x-1/2"></div>}
            {children.map(child => (
              <div key={child.id} className="relative flex items-center pl-8">
                <div className="absolute left-0 w-8 h-[2px] bg-neutral-700 top-1/2 -translate-y-1/2 -z-10"></div>
                {renderNode(child, allNodes)}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const currentPrereqError = selectedNode ? getPrereqError(selectedNode) : null

  return (
    <div className="relative w-full h-full border border-neutral-800 rounded-2xl overflow-hidden bg-neutral-950">
       <div className="absolute bottom-4 right-4 z-40 flex gap-2 bg-neutral-900/80 backdrop-blur p-2 rounded-xl border border-neutral-800 shadow-xl">
         <button onClick={zoomOut} className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors"><ZoomOut className="w-5 h-5" /></button>
         <button onClick={resetView} className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors"><Move className="w-5 h-5" /></button>
         <button onClick={zoomIn} className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors"><ZoomIn className="w-5 h-5" /></button>
       </div>

       <div 
         className={`w-full h-full touch-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
         onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseLeave}
         onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
         style={{ backgroundImage: 'radial-gradient(#333 1px, transparent 1px)', backgroundSize: '40px 40px', backgroundPosition: `${position.x}px ${position.y}px` }}
       >
         <div className="origin-top-left transition-transform duration-75 ease-out p-10 md:p-20" style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`, width: 'max-content' }}>
           <div className="flex flex-col gap-24 md:gap-32">
             {trees.map(tree => {
                const treeNodes = localNodes.filter(n => n.tree_id === tree.id)
                const rootNodes = treeNodes.filter(n => !n.parent_node_id)
                return (
                   <div key={tree.id} className="flex flex-col gap-8 md:gap-10">
                     <div className="w-max max-w-[280px] md:max-w-none whitespace-normal">
                       <h2 className="text-xl md:text-3xl font-bold text-neutral-300 opacity-80">{tree.title}</h2>
                       <p className="text-[11px] md:text-sm text-neutral-500 mt-1 leading-relaxed">{tree.description}</p>
                     </div>
                     <div className="flex flex-col gap-12">
                       {rootNodes.map(root => renderNode(root, treeNodes))}
                       {rootNodes.length === 0 && <div className="w-28 h-28 border-2 border-dashed border-neutral-800 rounded-2xl flex items-center justify-center text-neutral-600 text-xs">Empty Branch</div>}
                     </div>
                   </div>
                )
             })}
           </div>
         </div>
       </div>

       {selectedNode && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setSelectedNode(null)}>
           <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-3xl p-0 relative max-h-[85dvh] overflow-hidden flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
             
             <div className="p-4 md:p-6 border-b border-neutral-800 flex justify-between items-start bg-neutral-950/50">
               <div>
                 <h3 className="text-xl md:text-2xl font-bold text-neutral-100 pr-8">{selectedNode.title}</h3>
                 <div className="flex flex-wrap gap-2 md:gap-3 mt-2 md:mt-3 items-center">
                   <span className={`px-2 py-1 text-[10px] md:text-xs font-bold rounded uppercase ${selectedNode.status === 'locked' ? 'bg-neutral-800 text-neutral-500' : 'bg-blue-900/50 text-blue-400'}`}>{selectedNode.status}</span>
                   <span className="px-2 py-1 text-[10px] md:text-xs font-bold rounded uppercase bg-neutral-800 text-emerald-400">+{selectedNode.xp_reward} XP</span>
                   {selectedNode.status === 'locked' && (
                     <span className="text-[10px] md:text-xs font-bold text-neutral-500 ml-2">Cost: {selectedNode.xp_cost || 0} XP</span>
                   )}
                 </div>
               </div>
               <div className="flex gap-2 md:gap-3 shrink-0">
                 {selectedNode.status === 'locked' ? (
                   <button 
                     onClick={handleUnlock} 
                     disabled={isPending || availableXp < (selectedNode.xp_cost || 0) || !!currentPrereqError} 
                     className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3 md:px-4 py-2 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 disabled:bg-neutral-800"
                   >
                     {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                     <span className="hidden md:inline">
                       {currentPrereqError ? 'Locked by Prerequisite' : availableXp < (selectedNode.xp_cost || 0) ? 'Not Enough XP' : 'Unlock Node'}
                     </span>
                   </button>
                 ) : (
                   <button onClick={handleSave} disabled={isPending} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3 md:px-4 py-2 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50">
                     {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                     <span className="hidden md:inline">Save</span>
                   </button>
                 )}
                 <button onClick={() => setSelectedNode(null)} className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"><X className="w-5 h-5 md:w-6 md:h-6" /></button>
               </div>
             </div>

             {selectedNode.status !== 'locked' ? (
               <>
                 <div className="flex overflow-x-auto hide-scrollbar border-b border-neutral-800 bg-neutral-950 shrink-0">
                   <button onClick={() => setModalTab('curriculum')} className={`px-4 md:px-6 py-3 md:py-4 font-semibold text-xs md:text-sm transition-colors border-b-2 whitespace-nowrap ${modalTab === 'curriculum' ? 'border-blue-500 text-blue-400' : 'border-transparent text-neutral-400 hover:text-neutral-200'}`}>Curriculum Editor</button>
                   <button onClick={() => setModalTab('resources')} className={`px-4 md:px-6 py-3 md:py-4 font-semibold text-xs md:text-sm transition-colors border-b-2 whitespace-nowrap ${modalTab === 'resources' ? 'border-blue-500 text-blue-400' : 'border-transparent text-neutral-400 hover:text-neutral-200'}`}>Resource Manager</button>
                 </div>

                 <div className="p-4 md:p-6 overflow-y-auto bg-neutral-900 flex-1">
                   {modalTab === 'curriculum' && (
                     <div className="space-y-4">
                       <div className="flex gap-2">
                         <input type="text" value={newSubquest} onChange={e => setNewSubquest(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSubquest()} placeholder="Add new milestone..." className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs md:text-sm text-neutral-200 focus:outline-none focus:border-blue-500" />
                         <button onClick={addSubquest} className="bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-2 rounded-lg transition-colors"><Plus className="w-4 h-4 md:w-5 md:h-5" /></button>
                       </div>
                       
                       <div className="space-y-2 mt-4 md:mt-6">
                         {(editSchema?.sub_quests || []).map((quest: any, i: number) => (
                           <div key={i} className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-3 bg-neutral-950 border border-neutral-800/50 p-2 md:p-3 rounded-xl group">
                             <div className="flex flex-row md:flex-col gap-2 md:gap-1 border-b md:border-b-0 md:border-r border-neutral-800 pb-2 md:pb-0 md:pr-3 w-full md:w-auto">
                               <button onClick={() => moveItem(i, 'up', 'sub_quests')} className="text-neutral-600 hover:text-neutral-300"><ArrowUp className="w-4 h-4" /></button>
                               <button onClick={() => moveItem(i, 'down', 'sub_quests')} className="text-neutral-600 hover:text-neutral-300"><ArrowDown className="w-4 h-4" /></button>
                               <button onClick={() => deleteItem(i, 'sub_quests')} className="text-neutral-600 hover:text-red-400 p-1 md:hidden ml-auto"><Trash2 className="w-4 h-4" /></button>
                             </div>
                             <textarea 
                               value={quest.title} 
                               onChange={e => {
                                 const newQuests = [...editSchema.sub_quests]
                                 newQuests[i].title = e.target.value
                                 setEditSchema({...editSchema, sub_quests: newQuests})
                               }}
                               className="flex-1 w-full bg-transparent border-none text-xs md:text-sm text-neutral-300 focus:outline-none focus:text-white resize-none min-h-[40px]"
                             />
                             <button onClick={() => deleteItem(i, 'sub_quests')} className="text-neutral-600 hover:text-red-400 p-2 hidden md:block"><Trash2 className="w-4 h-4" /></button>
                           </div>
                         ))}
                       </div>
                     </div>
                   )}

                   {modalTab === 'resources' && (
                     <div className="space-y-4">
                       <div className="flex flex-col md:flex-row gap-2">
                         <input type="text" value={newResTitle} onChange={e => setNewResTitle(e.target.value)} placeholder="Title" className="w-full md:w-1/3 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs md:text-sm text-neutral-200 focus:outline-none focus:border-blue-500" />
                         <div className="flex gap-2 w-full md:flex-1">
                           <input type="text" value={newResUrl} onChange={e => setNewResUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && addResource()} placeholder="URL Link" className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs md:text-sm text-neutral-200 focus:outline-none focus:border-blue-500" />
                           <button onClick={addResource} className="bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-2 rounded-lg transition-colors"><Plus className="w-4 h-4 md:w-5 md:h-5" /></button>
                         </div>
                       </div>
                       
                       <div className="space-y-2 mt-4 md:mt-6">
                         {(editSchema?.resources || []).map((res: any, i: number) => (
                           <div key={i} className="flex items-center gap-3 bg-neutral-950 border border-neutral-800/50 p-3 rounded-xl">
                             <div className="flex flex-col gap-1 border-r border-neutral-800 pr-3 shrink-0">
                               <button onClick={() => moveItem(i, 'up', 'resources')} className="text-neutral-600 hover:text-neutral-300"><ArrowUp className="w-4 h-4" /></button>
                               <button onClick={() => moveItem(i, 'down', 'resources')} className="text-neutral-600 hover:text-neutral-300"><ArrowDown className="w-4 h-4" /></button>
                             </div>
                             <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                               <input type="text" value={res.title} onChange={e => { const r = [...editSchema.resources]; r[i].title = e.target.value; setEditSchema({...editSchema, resources: r}) }} className="bg-transparent border-none text-xs md:text-sm font-semibold text-blue-400 focus:outline-none truncate w-full" />
                               <input type="text" value={res.url} onChange={e => { const r = [...editSchema.resources]; r[i].url = e.target.value; setEditSchema({...editSchema, resources: r}) }} className="bg-transparent border-none text-[10px] md:text-xs text-neutral-500 focus:outline-none truncate w-full" />
                             </div>
                             <button onClick={() => deleteItem(i, 'resources')} className="text-neutral-600 hover:text-red-400 p-2 shrink-0"><Trash2 className="w-4 h-4" /></button>
                           </div>
                         ))}
                       </div>
                     </div>
                   )}
                 </div>
               </>
             ) : (
               <div className="p-8 md:p-12 flex flex-col items-center justify-center text-center bg-neutral-900 flex-1">
                 <Lock className="w-16 h-16 text-neutral-800 mb-6" />
                 <h4 className="text-xl font-bold text-neutral-300 mb-2">Node Locked</h4>
                 <p className="text-neutral-500 max-w-sm mb-6">This node requires <span className="font-bold text-blue-400">{selectedNode.xp_cost || 0} INT XP</span> to unlock.</p>
                 
                 {currentPrereqError && (
                   <div className="bg-red-950/30 border border-red-900/50 text-red-400 p-3 rounded-lg mb-6 flex items-center gap-2 text-sm w-full max-w-md">
                     <AlertTriangle className="w-5 h-5 shrink-0" />
                     <span>{currentPrereqError}</span>
                   </div>
                 )}
                 
                 <div className="bg-neutral-950 p-4 md:p-5 rounded-xl border border-neutral-800 text-left w-full max-w-md shadow-inner">
                   <h5 className="text-[10px] md:text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Module Briefing & Prerequisites</h5>
                   <p className="text-xs md:text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">
                     {selectedNode.description || "No specific prerequisites required."}
                   </p>
                 </div>
               </div>
             )}
           </div>
         </div>
       )}
    </div>
  )
}