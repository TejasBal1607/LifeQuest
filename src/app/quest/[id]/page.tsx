import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { completeQuest } from '@/app/actions'

export default async function QuestPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const supabase = await createClient()

  const { data: quest } = await supabase
    .from('active_quests')
    .select('*')
    .eq('id', resolvedParams.id)
    .single()

  if (!quest) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-50 p-6 flex flex-col items-center justify-center">
        <p>Quest not found.</p>
        <Link href="/" className="mt-4 text-emerald-500">Return to Command Center</Link>
      </div>
    )
  }

  const completeAction = completeQuest.bind(null, quest.id)

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 p-6">
      <header className="mb-8">
        <Link href="/" className="inline-flex items-center gap-2 text-neutral-400 hover:text-neutral-200 transition-colors mb-6">
          <ArrowLeft className="w-5 h-5" />
          <span>Back to HUD</span>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">{quest.title}</h1>
        <p className="text-emerald-500 font-semibold mt-2 text-lg">+{quest.xp_reward} {quest.attribute} XP</p>
      </header>

      <main className="bg-neutral-900 p-6 rounded-xl border border-neutral-800">
        
        {quest.dynamic_schema?.description && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-2">Mission Briefing</h2>
            <p className="text-neutral-300 leading-relaxed">
              {quest.dynamic_schema.description}
            </p>
          </div>
        )}

        {quest.dynamic_schema?.resources && quest.dynamic_schema.resources.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-3">Resources</h2>
            <div className="space-y-3">
              {quest.dynamic_schema.resources.map((res: any, idx: number) => (
                <a 
                  key={idx} 
                  href={res.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block p-4 bg-neutral-950 rounded-lg border border-neutral-800 hover:border-emerald-500 transition-colors text-emerald-400 font-medium"
                >
                  {res.title}
                </a>
              ))}
            </div>
          </div>
        )}

        <div className={quest.dynamic_schema?.description || quest.dynamic_schema?.resources ? "pt-8 border-t border-neutral-800" : ""}>
          <h2 className="text-xl font-bold mb-6">Verification</h2>
          
          <form action={completeAction}>
            {quest.verification_type === 'checkbox' && (
              <button type="submit" className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-bold text-lg transition-colors">
                Mark Completed
              </button>
            )}

            {quest.verification_type === 'gym_schema' && (
              <div className="space-y-4">
                {quest.dynamic_schema?.exercises?.map((ex: string, idx: number) => (
                  <div key={idx} className="flex flex-col gap-2 bg-neutral-950 p-4 rounded-lg">
                    <span className="font-medium text-lg">{ex}</span>
                    <input 
                      type="text" 
                      name={`exercise-${idx}`}
                      placeholder="Weight x Reps (e.g., 20kg x 10)" 
                      className="bg-neutral-800 rounded px-4 py-3 w-full outline-none focus:ring-1 focus:ring-emerald-500 text-neutral-100" 
                      required
                    />
                  </div>
                ))}
                <button type="submit" className="w-full mt-8 py-4 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-bold text-lg transition-colors">
                  Submit Workout Data
                </button>
              </div>
            )}

            {quest.verification_type === 'quiz' && (
              <div className="space-y-4">
                <p className="font-medium text-xl mb-6">{quest.dynamic_schema?.question}</p>
                {quest.dynamic_schema?.options?.map((opt: string, idx: number) => (
                  <label key={idx} className="flex items-center gap-4 bg-neutral-950 p-4 rounded-lg cursor-pointer hover:bg-neutral-800 border border-transparent hover:border-neutral-700 transition-colors">
                    <input type="radio" name="quiz-answer" value={opt} className="accent-emerald-500 w-5 h-5" required />
                    <span className="text-lg">{opt}</span>
                  </label>
                ))}
                <button type="submit" className="w-full mt-8 py-4 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-bold text-lg transition-colors">
                  Submit Answer
                </button>
              </div>
            )}
          </form>
        </div>

      </main>
    </div>
  )
}