'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowLeft, Sparkles, BarChart3, Loader2 } from 'lucide-react'
import { generateWeeklyExecutiveDebrief } from '@/app/ai-actions'

export default function AnalyticsPage() {
  const [result, setResult] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleWeeklyDebrief = () => {
    setResult(null)
    startTransition(async () => {
      const res = await generateWeeklyExecutiveDebrief()
      setResult(res)
    })
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 p-4 md:p-6 max-w-screen-md mx-auto">
      <header className="mb-8 flex items-center gap-4 border-b border-neutral-800 pb-6">
        <Link href="/" className="p-2 md:p-3 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-neutral-400 hover:text-white transition-colors shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-0.5 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-500" />
            AI Executive Hub
          </h1>
          <p className="text-xs text-neutral-400">Your high-level weekly performance analysis.</p>
        </div>
      </header>

      <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 md:p-8 mb-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-emerald-500/10 rounded-full border border-emerald-500/20">
            <BarChart3 className="w-8 h-8 text-emerald-500" />
          </div>
        </div>
        <h3 className="text-lg font-bold text-neutral-200 mb-2">Generate 7-Day Debrief</h3>
        <p className="text-sm text-neutral-400 mb-8 max-w-sm mx-auto leading-relaxed">
          The AI will read your entire Activity Ledger from the past week across all attributes (INT, STR, DEX, CHA) and generate strategic directives.
        </p>
        
        <button
          onClick={handleWeeklyDebrief}
          disabled={isPending}
          className="w-full max-w-sm mx-auto bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)]"
        >
          {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          <span>{isPending ? 'Synthesizing Logs...' : 'Execute Weekly Debrief'}</span>
        </button>
      </div>

      {result && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 md:p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-6 pb-4 border-b border-neutral-800/50">
            <Sparkles className="w-4 h-4" /> Strategic Assessment
          </div>
          <div className="text-sm text-neutral-300 whitespace-pre-wrap leading-relaxed space-y-4">
            {result}
          </div>
        </div>
      )}
    </div>
  )
}