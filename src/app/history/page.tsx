import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import HistoryCalendar from '@/components/HistoryCalendar'

export default async function HistoryPage() {
  const supabase = await createClient()

  const { data: historyData } = await supabase
    .from('quest_history')
    .select('*')
    .gte('logged_date', '2026-08-01')
    .lte('logged_date', '2026-08-31')

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 p-6">
      <header className="mb-8">
        <Link href="/" className="inline-flex items-center gap-2 text-neutral-400 hover:text-neutral-200 transition-colors mb-6">
          <ArrowLeft className="w-5 h-5" />
          <span>Back to HUD</span>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Activity Log</h1>
        <p className="text-neutral-400 mt-1">Your past quests and XP</p>
      </header>

      <main>
        <HistoryCalendar historyData={historyData || []} />
      </main>
    </div>
  )
}