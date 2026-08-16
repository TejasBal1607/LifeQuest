'use client'

import { useState } from 'react'

export default function HistoryCalendar({ historyData }: { historyData: any[] }) {
  const [selectedDate, setSelectedDate] = useState<number | null>(null)

  const daysInAugust = Array.from({ length: 31 }, (_, i) => i + 1)
  const augustStartDay = 6 

  const getQuestsForDay = (day: number) => {
    const dateString = `2026-08-${day.toString().padStart(2, '0')}`
    return historyData.filter(q => q.logged_date === dateString)
  }

  const selectedQuests = selectedDate ? getQuestsForDay(selectedDate) : []
  const selectedXp = selectedQuests.reduce((sum, q) => sum + q.xp_reward, 0)

  return (
    <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-800">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">August 2026</h2>
        <span className="text-sm text-neutral-400">Activity Log</span>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-6 text-center">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
          <div key={day} className="text-xs font-semibold text-neutral-500">{day}</div>
        ))}
        
        {Array.from({ length: augustStartDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {daysInAugust.map(day => {
          const dayQuests = getQuestsForDay(day)
          const hasCompleted = dayQuests.some(q => q.status === 'completed')
          const hasMissed = dayQuests.some(q => q.status === 'missed')
          
          let bgClass = "bg-neutral-950 hover:bg-neutral-800 border-transparent"
          if (hasCompleted) bgClass = "bg-emerald-900/40 text-emerald-400 border-emerald-800/50 hover:bg-emerald-800/50"
          if (hasMissed && !hasCompleted) bgClass = "bg-red-900/40 text-red-400 border-red-800/50 hover:bg-red-800/50"
          
          const isSelected = selectedDate === day

          return (
            <button
              key={day}
              onClick={() => setSelectedDate(day)}
              className={`aspect-square flex items-center justify-center rounded-lg border text-sm font-medium transition-all ${bgClass} ${isSelected ? 'ring-2 ring-emerald-500 border-transparent' : ''}`}
            >
              {day}
            </button>
          )
        })}
      </div>

      {selectedDate && (
        <div className="pt-4 border-t border-neutral-800">
          <div className="flex justify-between items-end mb-3">
            <h3 className="font-semibold text-lg">August {selectedDate}</h3>
            <span className="text-emerald-500 font-bold">+{selectedXp} XP</span>
          </div>
          
          {selectedQuests.length > 0 ? (
            <div className="space-y-2">
              {selectedQuests.map(q => (
                <div key={q.id} className="flex justify-between items-center bg-neutral-950 p-3 rounded-lg border border-neutral-800/50">
                  <span className={`text-sm ${q.status === 'completed' ? 'text-neutral-200' : 'text-neutral-500 line-through'}`}>
                    {q.title}
                  </span>
                  <span className="text-xs font-semibold text-neutral-500">
                    {q.status === 'completed' ? `+${q.xp_reward} ${q.attribute}` : 'Missed'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-sm text-neutral-500 bg-neutral-950 rounded-lg">
              No data recorded for this date.
            </div>
          )}
        </div>
      )}
    </div>
  )
}