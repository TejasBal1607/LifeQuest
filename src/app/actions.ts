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

export async function toggleSubQuest(nodeId: string, subQuestIndex: number, currentSchema: any, xpReward: number, treeId: string) {
  const supabase = await createClient()

  const updatedSchema = { ...currentSchema }
  const isCurrentlyCompleted = updatedSchema.sub_quests[subQuestIndex].completed
  updatedSchema.sub_quests[subQuestIndex].completed = !isCurrentlyCompleted

  const allComplete = updatedSchema.sub_quests.every((q: any) => q.completed)
  const newStatus = allComplete ? 'completed' : 'unlocked'

  await supabase
    .from('tree_nodes')
    .update({ dynamic_schema: updatedSchema, status: newStatus })
    .eq('id', nodeId)

  if (allComplete && !isCurrentlyCompleted) {
    const { data: tree } = await supabase.from('skill_trees').select('attribute').eq('id', treeId).single()
    const { data: stats } = await supabase.from('user_stats').select('*').single()

    if (stats && tree) {
      const attrCol = `${tree.attribute.toLowerCase()}_xp`
      
      let newLevel = stats.level
      let newTotalXp = stats.total_xp + xpReward
      
      if (newTotalXp >= newLevel * 1000) {
        newLevel += 1
      }

      await supabase
        .from('user_stats')
        .update({
          total_xp: newTotalXp,
          level: newLevel,
          [attrCol]: (stats[attrCol] || 0) + xpReward
        })
        .eq('id', stats.id)
    }

    await supabase
      .from('tree_nodes')
      .update({ status: 'unlocked' })
      .eq('parent_node_id', nodeId)
      .eq('status', 'locked')
  }

  revalidatePath('/roadmap')
  revalidatePath('/')
  
  return { updatedSchema, newStatus }
  
}
export async function updateNodeSchema(nodeId: string, newSchema: any) {
  const supabase = await createClient()
  
  await supabase
    .from('tree_nodes')
    .update({ dynamic_schema: newSchema })
    .eq('id', nodeId)

  revalidatePath('/roadmap')
  revalidatePath('/')
}
export async function unlockNode(nodeId: string, cost: number, attribute: string) {
  const supabase = await createClient()
  
  const { data: stats } = await supabase.from('user_stats').select('*').single()
  if (!stats) return { error: 'Stats not found' }

  const attrKey = `${attribute.toLowerCase()}_xp`
  const currentXp = stats[attrKey] || 0

  if (currentXp < cost) return { error: 'Not enough XP' }

  await supabase.from('user_stats').update({ [attrKey]: currentXp - cost }).eq('id', stats.id)
  await supabase.from('tree_nodes').update({ status: 'unlocked' }).eq('id', nodeId)

  revalidatePath('/roadmap')
  revalidatePath('/')
  return { success: true }
}

export async function completeSubQuest(nodeId: string, questIndex: number, attribute: string, nodeReward: number, metadata?: any, completeAll: boolean = false, dailyReward: number = 50) {
  const supabase = await createClient()
  
  const [ { data: node }, { data: stats } ] = await Promise.all([
    supabase.from('tree_nodes').select('*').eq('id', nodeId).single(),
    supabase.from('user_stats').select('*').single()
  ])

  if (!node || !stats) return { error: 'Not found' }

  let schema = typeof node.dynamic_schema === 'string' ? JSON.parse(node.dynamic_schema) : node.dynamic_schema
  const timestamp = new Date().toISOString()
  
  if (completeAll) {
    schema.sub_quests.forEach((q: any) => {
      q.completed = true
      q.metadata = { ...(metadata || {}), loggedAt: timestamp }
    })
  } else {
    schema.sub_quests[questIndex].completed = true
    schema.sub_quests[questIndex].metadata = { ...(metadata || {}), loggedAt: timestamp }
  }

  const allDone = schema.sub_quests.every((q: any) => q.completed)
  
  // Use the new dynamic dailyReward based on the task type
  const xpGained = dailyReward + (allDone ? (node.xp_reward || 0) : 0)
  
  const attrKey = `${attribute.toLowerCase()}_xp`
  const newXp = (stats[attrKey] || 0) + xpGained

  await Promise.all([
    supabase.from('tree_nodes').update({ 
      dynamic_schema: schema,
      status: allDone ? 'completed' : 'in_progress'
    }).eq('id', nodeId),
    supabase.from('user_stats').update({ [attrKey]: newXp }).eq('id', stats.id)
  ])

  revalidatePath('/')
  revalidatePath('/roadmap')
}