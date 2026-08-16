'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function completeQuest(questId: string) {
  const supabase = await createClient()

  const { data: quest } = await supabase
    .from('active_quests')
    .select('*')
    .eq('id', questId)
    .single()

  if (!quest) return

  const { data: stats } = await supabase
    .from('user_stats')
    .select('*')
    .single()

  if (!stats) return

  const attributeKey = `${quest.attribute.toLowerCase()}_xp`
  const newAttributeXp = (stats[attributeKey] || 0) + quest.xp_reward
  const newTotalXp = (stats.total_xp || 0) + quest.xp_reward

  await supabase
    .from('user_stats')
    .update({ 
      [attributeKey]: newAttributeXp,
      total_xp: newTotalXp
    })
    .eq('id', stats.id)

  await supabase
    .from('quest_history')
    .insert({
      title: quest.title,
      attribute: quest.attribute,
      xp_reward: quest.xp_reward,
      status: 'completed',
      logged_date: new Date().toISOString().split('T')[0]
    })

  await supabase
    .from('active_quests')
    .update({ status: 'completed' })
    .eq('id', questId)

  revalidatePath('/')
  redirect('/')
}