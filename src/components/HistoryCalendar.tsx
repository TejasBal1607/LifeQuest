'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, FileText, ChevronDown } from 'lucide-react'

const attrStyles: Record<string, string> = {
  INT: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
  STR: 'text-red-400 border-red-500/30 bg-red-500/10',
  DEX: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
  CHA: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
}

export default function HistoryCalendar({ historyData }: { historyData: any[] }) {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const [selectedDate, setSelectedDate] = useState<string | null>(todayString)

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startDay = new Date(year, month, 1).getDay()
  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })

  const getQuestsForDay = (dateString: string) => {
    return historyData.filter(q => q.logged_date === dateString)
  }

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1))

  const selectedQuests = selectedDate ? getQuestsForDay(selectedDate) : []
  const selectedXp = selectedQuests.reduce((sum, q) => sum + (q.xp_reward || 0), 0)

  return (
    <div className="bg-neutral-900/50 p-4 md:p-6 rounded-2xl border border-neutral-800">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-neutral-100">{monthName}</h2>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="p-2 bg-neutral-950 border border-neutral-800 hover:bg-neutral-800 rounded-lg transition-colors text-neutral-400 hover:text-white"><ChevronLeft className="w-5 h-5" /></button>
          <button onClick={nextMonth} className="p-2 bg-neutral-950 border border-neutral-800 hover:bg-neutral-800 rounded-lg transition-colors text-neutral-400 hover:text-white"><ChevronRight className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 md:gap-2 mb-6 text-center">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
          <div key={day} className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-2">{day}</div>
        ))}
        
        {Array.from({ length: startDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const dayQuests = getQuestsForDay(dateString)
          const hasCompleted = dayQuests.length > 0
          const isSelected = selectedDate === dateString
          const isToday = dateString === todayString

          let bgClass = "bg-neutral-950 hover:bg-neutral-800 border-neutral-800/50 text-neutral-400"
          if (hasCompleted) bgClass = "bg-emerald-900/40 text-emerald-400 border-emerald-800/50 hover:bg-emerald-800/50"
          
          return (
            <button
              key={day}
              onClick={() => setSelectedDate(dateString)}
              className={`aspect-square flex flex-col items-center justify-center rounded-xl border text-sm font-medium transition-all ${bgClass} ${isSelected ? 'ring-2 ring-emerald-500 border-transparent shadow-[0_0_15px_rgba(16,185,129,0.2)] text-white' : ''} ${isToday && !isSelected ? 'ring-1 ring-neutral-500' : ''}`}
            >
              <span>{day}</span>
              {hasCompleted && <span className="text-[8px] mt-0.5 opacity-70 font-bold hidden md:block">+{dayQuests.reduce((s,q)=>s+q.xp_reward,0)}</span>}
            </button>
          )
        })}
      </div>

      {selectedDate && (
        <div className="pt-6 border-t border-neutral-800/50">
          <div className="flex justify-between items-end mb-4">
            <div>
                <h3 className="font-bold text-lg text-neutral-200">Daily Ledger</h3>
                <span className="text-xs text-neutral-500">{new Date(selectedDate).toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
            </div>
            {selectedXp > 0 && (
              <span className="text-emerald-500 font-bold bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20 text-sm">+{selectedXp} XP</span>
            )}
          </div>
          
          {selectedQuests.length > 0 ? (
            <div className="space-y-3">
              {selectedQuests.map(q => (
                <div key={q.id} className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${attrStyles[q.attribute] || attrStyles.INT}`}>
                          {q.attribute}
                        </span>
                        <span className="text-xs text-neutral-400 font-semibold">{q.title}</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-500">+{q.xp_reward}</span>
                  </div>
                  
                  {q.items && q.items.length > 0 && (
                    <div className="flex flex-col gap-1.5 mt-4 mb-2">
                      {q.items.map((item: any, i: number) => (
                        <div key={i} className="bg-neutral-900 p-2.5 rounded-lg border border-neutral-800 flex justify-between items-center text-xs">
                          <span className="text-neutral-300 leading-tight pr-2">{item.name}</span>
                          {q.isGym && item.data && (
                            <span className="font-mono text-emerald-400 shrink-0 ml-2 whitespace-nowrap">
                              {item.data.weight} | {item.data.reps}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {q.logText && (
                    <details className="mt-3 group">
                      <summary className="flex items-center gap-2 cursor-pointer bg-neutral-900/80 p-3 rounded-lg border border-neutral-800 hover:bg-neutral-800 transition-colors list-none [&::-webkit-details-marker]:hidden">
                        <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="text-xs font-semibold text-neutral-300">View AI Analysis & Logs</span>
                        <ChevronDown className="w-4 h-4 text-neutral-500 ml-auto group-open:rotate-180 transition-transform" />
                      </summary>
                      <div className="p-3 mt-1.5 bg-neutral-950 rounded-lg border border-neutral-800/80 shadow-inner">
                        <p className="text-xs text-neutral-400 whitespace-pre-wrap leading-relaxed">{q.logText}</p>
                      </div>
                    </details>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-sm text-neutral-500 bg-neutral-950 rounded-xl border border-neutral-800 border-dashed">
              No activity recorded for this date.
            </div>
          )}
        </div>
      )}
    </div>
  )
}