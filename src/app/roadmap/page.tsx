import { createClient } from '@/utils/supabase/server'
import SkillTreeVisualizer from '@/components/SkillTreeVisualizer'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function RoadmapPage(props: { searchParams: Promise<{ attribute?: string }> }) {
  const searchParams = await props.searchParams
  const currentAttribute = searchParams.attribute || 'INT'
  const supabase = await createClient()

  const [ { data: trees }, { data: nodes }, { data: stats } ] = await Promise.all([
    supabase.from('skill_trees').select('*').eq('attribute', currentAttribute),
    supabase.from('tree_nodes').select('*').order('id', { ascending: true }),
    supabase.from('user_stats').select('*').single()
  ])

  const availableXp = stats ? (stats[`${currentAttribute.toLowerCase()}_xp`] || 0) : 0

  return (
    <div className="p-4 md:p-8 max-w-screen-2xl mx-auto flex flex-col h-[100dvh]">
      <div className="flex items-center justify-between mb-4 md:mb-6 shrink-0">
        <div className="flex items-center gap-4 md:gap-6">
          <Link href="/" className="p-2 md:p-3 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-neutral-400 hover:text-white transition-colors shrink-0">
            <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
          </Link>
          <div>
            <h1 className="text-2xl md:text-4xl font-bold text-neutral-100 mb-1">{currentAttribute} Mastery Path</h1>
            <p className="text-xs md:text-base text-neutral-500 line-clamp-1">Architect your long-term progression.</p>
          </div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 px-4 py-2 rounded-lg text-right">
          <div className="text-xs text-neutral-500 uppercase font-bold tracking-wider">Available XP</div>
          <div className="text-xl font-bold text-blue-500">{availableXp}</div>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative mb-4">
        <SkillTreeVisualizer trees={trees || []} nodes={nodes || []} availableXp={availableXp} currentAttribute={currentAttribute} />
      </div>
    </div>
  )
}