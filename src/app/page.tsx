import { createClient } from '@/utils/supabase/server'
import { Activity, Brain, Swords, Zap, CalendarDays } from 'lucide-react'
import Link from 'next/link'
import QuestCard from '@/components/QuestCard'

export default async function CommandCenter() {
  const supabase = await createClient()
  
  const [ { data: stats }, { data: allQuests } ] = await Promise.all([
    supabase.from('user_stats').select('*').single(),
    supabase.from('active_quests').select('*')
  ])
  
  const quests = allQuests ? [...allQuests].sort((a, b) => {
    if (a.status === 'completed' && b.status !== 'completed') return 1
    if (a.status !== 'completed' && b.status === 'completed') return -1
    return 0
  }) : []

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 p-6">
      <header className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">LifeQuest</h1>
          <p className="text-neutral-400">Command Center</p>
        </div>
        <div className="text-right flex flex-col items-end gap-2">
          <div>
            <div className="text-3xl font-bold text-emerald-500">Lv {stats?.level || 1}</div>
            <div className="text-sm text-neutral-400">{stats?.total_xp || 0} XP</div>
          </div>
          <Link href="/history" className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-emerald-500 transition-colors">
            <CalendarDays className="w-4 h-4" />
            <span>Activity Log</span>
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-800">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="text-blue-500 w-5 h-5" />
            <span className="font-semibold">INT</span>
          </div>
          <div className="text-2xl">{stats?.int_xp || 0}</div>
        </div>
        <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-800">
          <div className="flex items-center gap-2 mb-2">
            <Swords className="text-red-500 w-5 h-5" />
            <span className="font-semibold">STR</span>
          </div>
          <div className="text-2xl">{stats?.str_xp || 0}</div>
        </div>
        <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-800">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="text-yellow-500 w-5 h-5" />
            <span className="font-semibold">DEX</span>
          </div>
          <div className="text-2xl">{stats?.dex_xp || 0}</div>
        </div>
        <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-800">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="text-purple-500 w-5 h-5" />
            <span className="font-semibold">CHA</span>
          </div>
          <div className="text-2xl">{stats?.cha_xp || 0}</div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4 border-b border-neutral-800 pb-2">The Daily Ledger</h2>
        <div className="space-y-3">
          {quests.map((quest) => (
            <QuestCard key={quest.id} quest={quest} />
          ))}
          {quests.length === 0 && (
            <div className="text-neutral-500 text-center py-6">No active quests for today.</div>
          )}
        </div>
      </section>
    </div>
  )
}