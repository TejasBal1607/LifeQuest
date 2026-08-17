import { createClient } from '@/utils/supabase/server'
import { Activity, Brain, Swords, Zap, CalendarDays, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import QuestCard from '@/components/QuestCard'
import LedgerManager from '@/components/LedgerManager'

// We EXPORT this type so QuestCard can use it
export type QuestData = {
  id: string; nodeId: string; questIndex: number; nodeTitle: string; title: string;
  nodeDescription: string; attribute: string; nodeReward: number; dailyReward: number;
  isActuallyDone: boolean; exercises?: string[]; protocolSteps?: string[];
  courseSteps?: string[]; savedCheckedSteps?: number[];
  scheduledDate?: string; postponedTo?: string; isRollover?: boolean;
}

export default async function CommandCenter() {
  const supabase = await createClient()
  
  const [ { data: stats }, { data: allFetchedNodes } ] = await Promise.all([
    supabase.from('user_stats').select('*').single(),
    supabase.from('tree_nodes').select('*, skill_trees(attribute)').in('status', ['in_progress', 'completed'])
  ])
  
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const dayOfWeek = today.getDay()
  const dayOfMonth = today.getDate()
  const currentDayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek]

  // STEP 1: Map raw data
  const rawQuests = (allFetchedNodes || []).map(node => {
    let schema = typeof node.dynamic_schema === 'string' ? JSON.parse(node.dynamic_schema) : node.dynamic_schema
    const subQuests = Array.isArray(schema?.sub_quests) ? schema.sub_quests : []
    if (subQuests.length === 0) return null

    const isGym = node.title.toLowerCase().includes('push') || node.title.toLowerCase().includes('pull') || node.title.toLowerCase().includes('legs') || node.title.toLowerCase().includes('arms') || node.title.toLowerCase().includes('body') || node.title.toLowerCase().includes('recovery')
    const isProtocol = node.title.toLowerCase().includes('protocol 1') || node.title.toLowerCase().includes('protocol 2')
    
    const todayCompletedIndex = subQuests.findIndex((q: any) => q.completed && q.metadata?.loggedAt?.startsWith(todayStr))
    const doneToday = todayCompletedIndex !== -1

    if (node.status === 'completed' && !doneToday) return null

    const attr = node.skill_trees?.attribute || 'INT'
    
    let calculatedReward = 50
    if (attr === 'STR') {
      if (isProtocol || node.title.toLowerCase().includes('maintenance')) calculatedReward = 20
      else if (node.title.toLowerCase().includes('nutrition') || node.title.toLowerCase().includes('macro')) calculatedReward = 25
      else if (isGym) calculatedReward = 120
    } else if (attr === 'DEX') {
      if (node.title.toLowerCase().includes('spanish')) calculatedReward = 30
      else if (node.title.toLowerCase().includes('literary') || node.title.toLowerCase().includes('reading')) calculatedReward = 50
      else calculatedReward = 80
    } else calculatedReward = 100

    const activeIndex = doneToday ? todayCompletedIndex : subQuests.findIndex((q: any) => !q.completed)
    if (activeIndex === -1) return null

    const metadata = subQuests[activeIndex].metadata || {}
    let displayTitle = subQuests[activeIndex].title
    let parsedSteps = undefined

    if (!isGym && !isProtocol && (attr === 'INT' || attr === 'CHA' || (attr === 'DEX' && !node.title.toLowerCase().includes('spanish')))) {
      const sepMatch = displayTitle.match(/(?:—| - |:\s+)/)
      if (sepMatch) {
        const parts = displayTitle.split(sepMatch[0])
        displayTitle = parts[0].trim()
        const remainder = parts.slice(1).join(sepMatch[0]).trim()
        parsedSteps = remainder.split(/[;,]\s+/).map((s:string) => s.trim().charAt(0).toUpperCase() + s.trim().slice(1)).filter(Boolean)
        if (parsedSteps.length === 0 && remainder) parsedSteps = [remainder.charAt(0).toUpperCase() + remainder.slice(1)]
      }
    }

    return {
      id: `${node.id}-${activeIndex}`, nodeId: node.id, questIndex: activeIndex,
      nodeTitle: node.skill_trees?.title || node.title, title: isGym || isProtocol ? node.title : displayTitle,
      nodeDescription: node.description || 'No module briefing provided.',
      attribute: attr, nodeReward: node.xp_reward || 0, dailyReward: calculatedReward,
      isActuallyDone: doneToday,
      exercises: isGym ? subQuests.map((q: any) => q.title) : undefined,
      protocolSteps: isProtocol ? subQuests.map((q: any) => q.title) : undefined,
      courseSteps: parsedSteps, savedCheckedSteps: metadata.checkedSteps || [],
      scheduledDate: metadata.scheduledDate, postponedTo: metadata.postponedTo, isRollover: metadata.isRollover
    } as QuestData
  })

  // STEP 2: Filter nulls cleanly (Resolves the 'allQuests' TS Error)
  const allQuests: QuestData[] = rawQuests.filter((q): q is QuestData => q !== null)

  const missedQuests = allQuests.filter((q: QuestData) => !q.isActuallyDone && q.scheduledDate && q.scheduledDate < todayStr && q.postponedTo !== todayStr)
  const forceQuests = allQuests.filter((q: QuestData) => q.postponedTo === todayStr || q.isRollover)
  const validNormalQuests = allQuests.filter((q: QuestData) => !q.postponedTo || q.postponedTo <= todayStr)

  const hasTitle = (q: QuestData, titles: string[]) => titles.some(t => (q.nodeTitle + ' ' + q.title).toLowerCase().includes(t.toLowerCase()))

  const scheduledQuests: QuestData[] = []
  scheduledQuests.push(...validNormalQuests.filter((q: QuestData) => q.attribute === 'INT' && hasTitle(q, ['foundation', 'object-oriented', 'data structure', 'operating system'])).slice(0, 2))
  scheduledQuests.push(...validNormalQuests.filter((q: QuestData) => hasTitle(q, ['spanish'])).slice(0, 1))
  scheduledQuests.push(...validNormalQuests.filter((q: QuestData) => q.attribute === 'STR' && hasTitle(q, ['protocol', 'maintenance', 'nutrition', 'food', 'macro'])))
  if (dayOfWeek !== 0) scheduledQuests.push(...validNormalQuests.filter((q: QuestData) => q.attribute === 'STR' && !!q.exercises && q.title.toLowerCase().includes(currentDayName.toLowerCase())).slice(0, 1))
  scheduledQuests.push(...validNormalQuests.filter((q: QuestData) => q.attribute === 'INT' && !hasTitle(q, ['foundation', 'object-oriented', 'data structure', 'operating system'])).slice(0, 1))
  if (dayOfWeek % 2 === 0 && dayOfWeek !== 0) scheduledQuests.push(...validNormalQuests.filter((q: QuestData) => q.attribute === 'CHA').slice(0, 1))
  if (dayOfWeek % 2 !== 0) scheduledQuests.push(...validNormalQuests.filter((q: QuestData) => q.attribute === 'DEX' && hasTitle(q, ['fretboard', 'campfire', 'electric'])).slice(0, 1))
  
  const deduplicatedScheduled = scheduledQuests.filter((sq: QuestData) => !forceQuests.some((fq: QuestData) => fq.nodeId === sq.nodeId))
  const remainingSlots = Math.max(0, 10 - forceQuests.length)
  
  const finalQuests = [...forceQuests, ...deduplicatedScheduled.slice(0, remainingSlots)]
    .sort((a, b) => Number(a.isActuallyDone) - Number(b.isActuallyDone))

  const activeCount = finalQuests.filter((q: QuestData) => !q.isActuallyDone).length
  const totalXp = (stats?.int_xp || 0) + (stats?.str_xp || 0) + (stats?.dex_xp || 0) + (stats?.cha_xp || 0)
  const currentLevel = Math.floor(Math.sqrt(totalXp / 100)) + 1
  const currentLevelBaseXp = Math.pow(currentLevel - 1, 2) * 100
  const nextLevelTotalXp = Math.pow(currentLevel, 2) * 100
  const progressPercentage = Math.min(100, Math.max(0, ((totalXp - currentLevelBaseXp) / (nextLevelTotalXp - currentLevelBaseXp)) * 100))

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 p-3 md:p-5 max-w-screen-xl mx-auto">
      <LedgerManager finalQuests={finalQuests} missedQuests={missedQuests} todayStr={todayStr} />
      
      <header className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-0.5">LifeQuest</h1>
          <p className="text-xs text-neutral-400">Command Center</p>
        </div>
        <div className="flex flex-col items-end">
          <div className="text-right mb-1.5 flex items-baseline gap-2">
            <div className="text-xs text-neutral-500 font-mono uppercase tracking-widest hidden md:block">Total XP: {totalXp}</div>
            <div className="text-2xl font-bold text-emerald-500">Lv {currentLevel}</div>
          </div>
          <Link href="/history" className="flex items-center gap-1.5 text-[10px] text-neutral-400 hover:text-emerald-500 transition-colors bg-neutral-900 px-2 py-1 rounded-md border border-neutral-800">
            <CalendarDays className="w-3 h-3" /> <span>Activity Log</span>
          </Link>
        </div>
      </header>

      <div className="mb-8">
        <div className="flex justify-between text-[10px] text-neutral-500 mb-1.5 font-mono">
          <span>{currentLevelBaseXp} XP</span>
          <span>{nextLevelTotalXp} XP</span>
        </div>
        <div className="w-full h-1.5 bg-neutral-900 rounded-full border border-neutral-800">
          <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${progressPercentage}%` }} />
        </div>
      </div>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-8">
        <Link href="/roadmap?attribute=INT" className="block bg-neutral-900/50 p-3 rounded-lg border border-neutral-800 hover:border-blue-500/50 group"><div className="flex items-center gap-1.5 mb-1.5"><Brain className="text-blue-500 w-4 h-4 group-hover:scale-110 transition-transform" /><span className="font-semibold text-sm">INT</span></div><div className="text-xl font-medium font-mono">{stats?.int_xp || 0}</div></Link>
        <Link href="/roadmap?attribute=STR" className="block bg-neutral-900/50 p-3 rounded-lg border border-neutral-800 hover:border-red-500/50 group"><div className="flex items-center gap-1.5 mb-1.5"><Swords className="text-red-500 w-4 h-4 group-hover:scale-110 transition-transform" /><span className="font-semibold text-sm">STR</span></div><div className="text-xl font-medium font-mono">{stats?.str_xp || 0}</div></Link>
        <Link href="/roadmap?attribute=DEX" className="block bg-neutral-900/50 p-3 rounded-lg border border-neutral-800 hover:border-yellow-500/50 group"><div className="flex items-center gap-1.5 mb-1.5"><Zap className="text-yellow-500 w-4 h-4 group-hover:scale-110 transition-transform" /><span className="font-semibold text-sm">DEX</span></div><div className="text-xl font-medium font-mono">{stats?.dex_xp || 0}</div></Link>
        <Link href="/roadmap?attribute=CHA" className="block bg-neutral-900/50 p-3 rounded-lg border border-neutral-800 hover:border-purple-500/50 group"><div className="flex items-center gap-1.5 mb-1.5"><Activity className="text-purple-500 w-4 h-4 group-hover:scale-110 transition-transform" /><span className="font-semibold text-sm">CHA</span></div><div className="text-xl font-medium font-mono">{stats?.cha_xp || 0}</div></Link>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3 border-b border-neutral-800 pb-2">
          <h2 className="text-lg font-bold text-neutral-200">The Daily Ledger</h2>
          <div className="flex items-center gap-2">
            {missedQuests.length > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-mono text-red-500 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded animate-pulse">
                <AlertTriangle className="w-3 h-3" /> Processing Penalties...
              </span>
            )}
            <span className="text-[10px] font-mono text-neutral-500 bg-neutral-900 px-2 py-0.5 rounded">{activeCount} Active Modules</span>
          </div>
        </div>
        
        <div className="space-y-2">
          {finalQuests.map((quest) => <QuestCard key={quest.id} quest={quest} />)}
        </div>
      </section>
    </div>
  )
}