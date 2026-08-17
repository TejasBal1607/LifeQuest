'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, Circle, Loader2, Send, X, FileText, CheckSquare, Bookmark, CalendarClock, AlertCircle } from 'lucide-react'
import { completeSubQuest, postponeSubQuest } from '@/app/actions'

const attrStyles: Record<string, string> = {
  INT: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
  STR: 'text-red-400 border-red-500/30 bg-red-500/10',
  DEX: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
  CHA: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
}

export default function QuestCard({ quest }: { quest: any }) {
  const [isPending, startTransition] = useTransition()
  const [optimisticComplete, setOptimisticComplete] = useState(quest.isActuallyDone)
  const [showModal, setShowModal] = useState(false)
  const [notes, setNotes] = useState('')
  const [exerciseLogs, setExerciseLogs] = useState<Record<string, { weight: string, reps: string }>>({})
  
  const [stepChecks, setStepChecks] = useState<Record<number, boolean>>({})
  
  const [courseChecks, setCourseChecks] = useState<Record<number, boolean>>(
    quest.savedCheckedSteps?.reduce((acc: any, val: number) => ({...acc, [val]: true}), {}) || {}
  )

  const [postponeDate, setPostponeDate] = useState('')

  const isGym = !!quest.exercises
  const isProtocol = !!quest.protocolSteps
  const isCourse = !!quest.courseSteps
  const isFood = quest.nodeTitle.toLowerCase().includes('nutrition') || quest.nodeTitle.toLowerCase().includes('food') || quest.nodeTitle.toLowerCase().includes('macro')
  const isINT = quest.attribute === 'INT'
  const isDone = optimisticComplete || quest.isActuallyDone

  const allProtocolStepsChecked = isProtocol ? quest.protocolSteps.every((_: any, i: number) => stepChecks[i]) : true
  const protocolCheckedCount = isProtocol ? quest.protocolSteps.filter((_: any, i: number) => stepChecks[i]).length : 0
  
  const allCourseStepsChecked = isCourse ? quest.courseSteps.every((_: any, i: number) => courseChecks[i]) : true
  const courseCheckedCount = isCourse ? quest.courseSteps.filter((_: any, i: number) => courseChecks[i]).length : 0

  const canComplete = !isPending && allProtocolStepsChecked

  const openModal = () => {
    if (!isDone && !isPending) {
      setShowModal(true)
    }
  }

  const handleExerciseChange = (exercise: string, field: 'weight' | 'reps', value: string) => {
    setExerciseLogs(prev => ({
      ...prev,
      [exercise]: { ...prev[exercise], [field]: value }
    }))
  }

  const handlePostpone = () => {
    if (!postponeDate || isPending) return
    startTransition(async () => {
      await postponeSubQuest(quest.nodeId, quest.questIndex, postponeDate)
      setShowModal(false)
    })
  }

  const executeCompletion = () => {
    if (isDone || !canComplete) return
    
    const isPartial = isCourse && !allCourseStepsChecked

    if (!isPartial) {
      setOptimisticComplete(true)
    }
    setShowModal(false)
    
    let metadata: any = { log: notes }
    if (isGym) metadata.exerciseLogs = exerciseLogs
    if (isCourse) metadata.checkedSteps = Object.keys(courseChecks).filter(k => courseChecks[Number(k)]).map(Number)
    
    startTransition(async () => {
      await completeSubQuest(quest.nodeId, quest.questIndex, quest.attribute, quest.nodeReward, metadata, isGym || isProtocol, quest.dailyReward, isPartial)
    })
  }

  const isPartialState = isCourse && !allCourseStepsChecked
  const buttonText = isProtocol && !allProtocolStepsChecked ? 'Check all steps to finish' : isPartialState ? 'Save Progress' : 'Log & Complete'

  return (
    <>
      <div 
        onClick={openModal}
        className={`flex flex-col p-3 md:p-4 rounded-xl border transition-all ${
          isDone ? 'bg-neutral-900 border-neutral-800 opacity-50' : 
          quest.isRollover ? 'bg-red-950/20 border-red-900/50 hover:border-red-700/50 cursor-pointer' : 
          'bg-neutral-900/50 border-neutral-800 hover:border-neutral-700 cursor-pointer'
        }`}
      >
        <div className="flex items-start gap-3 md:gap-4">
          <div className="mt-0.5 shrink-0 text-neutral-500 hover:text-emerald-500 transition-colors">
            {isPending ? <Loader2 className="w-5 h-5 animate-spin text-emerald-500" /> :
             isDone ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : 
             <Circle className="w-5 h-5" />}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[9px] md:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${attrStyles[quest.attribute] || attrStyles.INT}`}>
                {quest.attribute}
              </span>
              <span className="text-[10px] md:text-xs text-neutral-500 truncate">{quest.nodeTitle}</span>
              {quest.isRollover && !isDone && (
                <span className="text-[9px] text-red-400 border border-red-500/30 bg-red-500/10 px-1.5 rounded flex items-center gap-1">
                  <AlertCircle className="w-2.5 h-2.5" /> Rollover Penalty Applied
                </span>
              )}
            </div>
            <h3 className={`text-xs md:text-sm font-medium ${isDone ? 'text-neutral-500 line-through' : 'text-neutral-200'}`}>
              {quest.title}
            </h3>
            
            {isProtocol && !isDone && (
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
                  <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${(protocolCheckedCount / quest.protocolSteps.length) * 100}%` }} />
                </div>
                <span className="text-[10px] text-neutral-500 font-mono font-bold">{protocolCheckedCount}/{quest.protocolSteps.length}</span>
              </div>
            )}

            {isCourse && !isDone && (
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
                  <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${(courseCheckedCount / quest.courseSteps.length) * 100}%` }} />
                </div>
                <span className="text-[10px] text-neutral-500 font-mono font-bold">{courseCheckedCount}/{quest.courseSteps.length}</span>
              </div>
            )}
          </div>
          
          <div className="shrink-0 text-right">
            <div className="text-[10px] md:text-xs font-bold text-emerald-500">+{(isGym || isProtocol || isCourse) ? 'Multi' : quest.dailyReward} XP</div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowModal(false)}>
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg flex flex-col shadow-2xl max-h-[85dvh]" onClick={e => e.stopPropagation()}>
            
            <div className="p-4 md:p-5 border-b border-neutral-800 flex justify-between items-start bg-neutral-950/50 rounded-t-2xl">
              <div>
                <span className={`inline-block mb-2 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${attrStyles[quest.attribute] || attrStyles.INT}`}>
                  {quest.attribute} • {quest.nodeTitle}
                </span>
                <h3 className="text-lg md:text-xl font-bold text-neutral-100 pr-4">{quest.title}</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 md:p-6 overflow-y-auto flex-1 hide-scrollbar">
              <div className="mb-6">
                <h4 className="text-[10px] font-bold uppercase text-neutral-500 mb-2 flex items-center gap-1.5">
                  <FileText className="w-3 h-3" /> Module Briefing
                </h4>
                <p className="text-xs md:text-sm text-neutral-300 leading-relaxed bg-neutral-950 p-3 rounded-lg border border-neutral-800/50">
                  {quest.nodeDescription}
                </p>
              </div>

              {isGym && (
                <div className="space-y-3 mb-6">
                  <h4 className="text-[10px] font-bold uppercase text-neutral-500 mb-2 tracking-wider">Exercise Execution Log</h4>
                  {quest.exercises.map((ex: string, i: number) => (
                    <div key={i} className="flex flex-col gap-1.5 bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                      <span className="text-xs text-neutral-300 font-semibold">{ex}</span>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="text" placeholder="Weight (e.g. +10kg)" onChange={(e) => handleExerciseChange(ex, 'weight', e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500 outline-none transition-colors" />
                        <input type="text" placeholder="Reps (e.g. 3x10)" onChange={(e) => handleExerciseChange(ex, 'reps', e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500 outline-none transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {isProtocol && (
                <div className="space-y-3 mb-6">
                  <h4 className="text-[10px] font-bold uppercase text-neutral-500 mb-2 tracking-wider flex items-center gap-1.5">
                    <CheckSquare className="w-3 h-3" /> Protocol Checklist
                  </h4>
                  {quest.protocolSteps.map((step: string, i: number) => (
                    <label key={i} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${stepChecks[i] ? 'bg-emerald-950/20 border-emerald-900/50' : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'}`}>
                      <div className="mt-0.5 relative flex items-center justify-center shrink-0">
                        <input type="checkbox" checked={!!stepChecks[i]} onChange={(e) => setStepChecks(prev => ({...prev, [i]: e.target.checked}))} className="appearance-none w-5 h-5 border-2 border-neutral-700 rounded bg-neutral-900 checked:bg-emerald-500 checked:border-emerald-500 transition-colors peer" />
                        <CheckCircle2 className="w-3.5 h-3.5 text-white absolute opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
                      </div>
                      <span className={`text-xs md:text-sm transition-colors ${stepChecks[i] ? 'text-neutral-500 line-through' : 'text-neutral-300'}`}>{step}</span>
                    </label>
                  ))}
                </div>
              )}

              {isCourse && (
                <div className="space-y-3 mb-6">
                  <h4 className="text-[10px] font-bold uppercase text-neutral-500 mb-2 tracking-wider flex items-center gap-1.5">
                    <CheckSquare className="w-3 h-3" /> Syllabus Topics
                  </h4>
                  {quest.courseSteps.map((step: string, i: number) => (
                    <label key={i} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${courseChecks[i] ? 'bg-blue-950/20 border-blue-900/50' : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'}`}>
                      <div className="mt-0.5 relative flex items-center justify-center shrink-0">
                        <input type="checkbox" checked={!!courseChecks[i]} onChange={(e) => setCourseChecks(prev => ({...prev, [i]: e.target.checked}))} className="appearance-none w-5 h-5 border-2 border-neutral-700 rounded bg-neutral-900 checked:bg-blue-500 checked:border-blue-500 transition-colors peer" />
                        <CheckCircle2 className="w-3.5 h-3.5 text-white absolute opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
                      </div>
                      <span className={`text-xs md:text-sm transition-colors ${courseChecks[i] ? 'text-neutral-500 line-through' : 'text-neutral-300'}`}>{step}</span>
                    </label>
                  ))}
                </div>
              )}

              <div>
                <h4 className="text-[10px] font-bold uppercase text-neutral-500 mb-2 tracking-wider">
                  {isGym ? "Form Analysis & Fatigue Notes" : isFood ? "Macro & Nutrition Breakdown" : isINT ? "Execution Notes / Quiz Answers" : "Log Details"}
                </h4>
                <textarea 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)} 
                  placeholder={isGym ? "Log technique constraints or physical fatigue." : isFood ? "e.g., Paneer wrap, ~30g protein. Moderate fats." : isINT ? "Paste your answers, code snippets, or learning summaries here." : "Add completion details..."} 
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-3 text-xs md:text-sm text-white focus:border-emerald-500 outline-none resize-y min-h-[100px] transition-colors" 
                />
              </div>
            </div>

            <div className="p-4 md:p-5 border-t border-neutral-800 bg-neutral-950/50 flex flex-col md:flex-row justify-between items-center gap-3 rounded-b-2xl">
              
              <div className="flex items-center gap-2 w-full md:w-auto">
                <input 
                  type="date" 
                  value={postponeDate}
                  onChange={(e) => setPostponeDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]} 
                  className="bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs rounded-lg px-2 py-2 focus:border-neutral-600 outline-none w-full md:w-auto"
                />
                <button 
                  onClick={handlePostpone}
                  disabled={!postponeDate || isPending}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-neutral-400 bg-neutral-900 border border-neutral-800 rounded-lg hover:text-white hover:border-neutral-600 disabled:opacity-50 transition-colors"
                >
                  <CalendarClock className="w-3.5 h-3.5" /> Postpone
                </button>
              </div>

              <div className="flex justify-end gap-3 w-full md:w-auto">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 text-xs md:text-sm font-bold text-neutral-400 hover:text-white transition-colors">
                  Cancel
                </button>
                <button 
                  onClick={executeCompletion} 
                  disabled={!canComplete}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all shadow-lg ${
                    canComplete 
                      ? isPartialState 
                          ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20' 
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20'
                      : 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700'
                  }`}
                >
                  {isPartialState ? <Bookmark className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                  <span>{buttonText}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  )
}