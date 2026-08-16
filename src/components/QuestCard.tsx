import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'

export default function QuestCard({ quest }: { quest: any }) {
  const isCompleted = quest.status === 'completed'

  if (isCompleted) {
    return (
      <div className="block bg-neutral-900/50 p-4 rounded-xl border border-neutral-800 opacity-60">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-medium text-lg text-neutral-500 line-through">{quest.title}</h3>
            <div className="flex gap-3 text-sm mt-1">
              <span className="text-neutral-500">Type: {quest.quest_type}</span>
              <span className="text-emerald-700 font-semibold">+{quest.xp_reward} {quest.attribute} XP</span>
            </div>
          </div>
          <CheckCircle2 className="w-6 h-6 text-emerald-600" />
        </div>
      </div>
    )
  }

  return (
    <Link 
      href={`/quest/${quest.id}`}
      className="block bg-neutral-900 p-4 rounded-xl border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/80 transition-all cursor-pointer"
    >
      <div>
        <h3 className="font-medium text-lg text-neutral-50">{quest.title}</h3>
        <div className="flex gap-3 text-sm mt-1">
          <span className="text-neutral-400">Type: {quest.quest_type}</span>
          <span className="text-emerald-500 font-semibold">+{quest.xp_reward} {quest.attribute} XP</span>
        </div>
      </div>
    </Link>
  )
}