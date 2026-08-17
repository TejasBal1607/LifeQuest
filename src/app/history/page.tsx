import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import HistoryCalendar from '@/components/HistoryCalendar'

export default async function HistoryPage() {
  const supabase = await createClient()

  // Fetch all nodes that have JSONB schema data
  const { data: nodes } = await supabase.from('tree_nodes').select('*, skill_trees(attribute)').not('dynamic_schema', 'is', 'null')

  const historyData: any[] = []

  ;(nodes || []).forEach(node => {
    let schema = typeof node.dynamic_schema === 'string' ? JSON.parse(node.dynamic_schema) : node.dynamic_schema
    const subQuests = Array.isArray(schema?.sub_quests) ? schema.sub_quests : []

    const isGym = node.title.toLowerCase().includes('push') || node.title.toLowerCase().includes('pull') || node.title.toLowerCase().includes('legs') || node.title.toLowerCase().includes('arms') || node.title.toLowerCase().includes('body') || node.title.toLowerCase().includes('recovery')
    const isProtocol = node.title.toLowerCase().includes('protocol 1') || node.title.toLowerCase().includes('protocol 2')
    const attr = node.skill_trees?.attribute || 'INT'

    // Calculate XP accurately for history
    let dailyReward = 50
    if (attr === 'STR') {
      if (isProtocol || node.title.toLowerCase().includes('maintenance')) dailyReward = 20
      else if (node.title.toLowerCase().includes('nutrition') || node.title.toLowerCase().includes('macro')) dailyReward = 25
      else if (isGym) dailyReward = 120
    } else if (attr === 'DEX') {
      if (node.title.toLowerCase().includes('spanish')) dailyReward = 30
      else if (node.title.toLowerCase().includes('literary') || node.title.toLowerCase().includes('reading')) dailyReward = 50
      else dailyReward = 80
    } else {
      dailyReward = 100
    }

    if (isGym) {
      // Group gym exercises by date
      const completedExercises = subQuests.filter((q: any) => q.completed && q.metadata?.loggedAt)
      const gymByDate: Record<string, any[]> = {}
      
      completedExercises.forEach((q:any) => {
        const dateObj = new Date(q.metadata.loggedAt)
        const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`
        if (!gymByDate[dateStr]) gymByDate[dateStr] = []
        gymByDate[dateStr].push(q)
      })

      Object.entries(gymByDate).forEach(([dateStr, questsForDay]) => {
        historyData.push({
          id: `${node.id}-${dateStr}`,
          title: node.title,
          attribute: attr,
          xp_reward: dailyReward,
          logged_date: dateStr,
          status: 'completed',
          isGym: true,
          exercises: questsForDay.map(q => ({ name: q.title, data: q.metadata?.exerciseLogs?.[q.title] || null })),
          logText: questsForDay[0].metadata?.log || ''
        })
      })
    } else {
      subQuests.forEach((q: any, i: number) => {
        if (q.completed && q.metadata?.loggedAt) {
          const dateObj = new Date(q.metadata.loggedAt)
          const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`
          historyData.push({
            id: `${node.id}-${i}`,
            title: q.title,
            nodeTitle: node.title,
            attribute: attr,
            xp_reward: dailyReward,
            logged_date: dateStr,
            status: 'completed',
            isGym: false,
            logText: q.metadata?.log || ''
          })
        }
      })
    }
  })

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 p-4 md:p-6 max-w-screen-md mx-auto">
      <header className="mb-6 flex items-center gap-4">
        <Link href="/" className="p-2 md:p-3 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-neutral-400 hover:text-white transition-colors shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-0.5">Activity Calendar</h1>
          <p className="text-xs text-neutral-400">Your permanent historical ledger.</p>
        </div>
      </header>

      <main>
        <HistoryCalendar historyData={historyData} />
      </main>
    </div>
  )
}