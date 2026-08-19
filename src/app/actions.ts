'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function completeQuest(questId: string) {
  const supabase = await createClient()

  const { data: quest } = await supabase.from('active_quests').select('*').eq('id', questId).single()
  if (!quest) return

  const { data: stats } = await supabase.from('user_stats').select('*').single()
  if (!stats) return

  const attributeKey = `${quest.attribute.toLowerCase()}_xp`
  const newAttributeXp = (stats[attributeKey] || 0) + quest.xp_reward
  const newTotalXp = (stats.total_xp || 0) + quest.xp_reward

  await supabase.from('user_stats').update({ [attributeKey]: newAttributeXp, total_xp: newTotalXp }).eq('id', stats.id)
  await supabase.from('quest_history').insert({ title: quest.title, attribute: quest.attribute, xp_reward: quest.xp_reward, status: 'completed', logged_date: new Date().toISOString().split('T')[0] })
  await supabase.from('active_quests').update({ status: 'completed' }).eq('id', questId)

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

  await supabase.from('tree_nodes').update({ dynamic_schema: updatedSchema, status: newStatus }).eq('id', nodeId)

  if (allComplete && !isCurrentlyCompleted) {
    const { data: tree } = await supabase.from('skill_trees').select('attribute').eq('id', treeId).single()
    const { data: stats } = await supabase.from('user_stats').select('*').single()

    if (stats && tree) {
      const attrCol = `${tree.attribute.toLowerCase()}_xp`
      let newLevel = stats.level
      let newTotalXp = stats.total_xp + xpReward
      
      if (newTotalXp >= newLevel * 1000) newLevel += 1

      await supabase.from('user_stats').update({ total_xp: newTotalXp, level: newLevel, [attrCol]: (stats[attrCol] || 0) + xpReward }).eq('id', stats.id)
    }

    await supabase.from('tree_nodes').update({ status: 'unlocked' }).eq('parent_node_id', nodeId).eq('status', 'locked')
  }

  revalidatePath('/roadmap')
  revalidatePath('/')
  return { updatedSchema, newStatus }
}

export async function updateNodeSchema(nodeId: string, newSchema: any) {
  const supabase = await createClient()
  await supabase.from('tree_nodes').update({ dynamic_schema: newSchema }).eq('id', nodeId)
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

// FIX: Renamed 'completeAll' to 'isRepeatable' to catch the boolean sent from QuestCard.tsx
export async function completeSubQuest(nodeId: string, questIndex: number, attribute: string, nodeReward: number, metadata?: any, isRepeatable: boolean = false, dailyReward: number = 50, isPartial: boolean = false) {
  const supabase = await createClient()
  
  const [ { data: node }, { data: stats } ] = await Promise.all([
    supabase.from('tree_nodes').select('*').eq('id', nodeId).single(),
    supabase.from('user_stats').select('*').single()
  ])

  if (!node || !stats) return { error: 'Not found' }

  let schema = typeof node.dynamic_schema === 'string' ? JSON.parse(node.dynamic_schema) : node.dynamic_schema
  const timestamp = new Date().toISOString()
  
  let xpGained = 0

  if (isRepeatable) {
    // 1. Create a fresh clone of the current step
    const freshClone = JSON.parse(JSON.stringify(schema.sub_quests[questIndex]))
    freshClone.completed = false
    
    // 2. Schedule the clone's next appearance 
    const titleLower = freshClone.title.toLowerCase()
    const nodeTitleLower = (node.title || '').toLowerCase()
    const isGym = nodeTitleLower.includes('push') || nodeTitleLower.includes('pull') || nodeTitleLower.includes('legs') || nodeTitleLower.includes('arms') || nodeTitleLower.includes('body') || nodeTitleLower.includes('recovery')
    
    let nextDate = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"}))
    let hasCustomDate = false
    
    if (isGym) {
      nextDate.setDate(nextDate.getDate() + 7) // Repeat exactly 7 days later
      hasCustomDate = true
    } else if (titleLower.includes('maintenance') || titleLower.includes('logistics') || titleLower.includes('bi-weekly') || titleLower.includes('biweekly')) {
      nextDate.setDate(nextDate.getDate() + 1) // Start checking tomorrow
      while (nextDate.getDay() !== 0 && nextDate.getDay() !== 4) { // Lock to Sunday(0) or Thursday(4)
        nextDate.setDate(nextDate.getDate() + 1)
      }
      hasCustomDate = true
    }
    
    freshClone.metadata = hasCustomDate ? { scheduledDate: `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}` } : {}

    // 3. Seal today's log permanently for the History Calendar
    schema.sub_quests[questIndex].completed = true
    schema.sub_quests[questIndex].metadata = { ...(metadata || {}), loggedAt: timestamp }

    // 4. Append the fresh clone to the array
    schema.sub_quests.push(freshClone)
    xpGained = dailyReward

  } else if (isPartial) {
    const prevChecked = schema.sub_quests[questIndex].metadata?.checkedSteps?.length || 0
    const newChecked = metadata?.checkedSteps?.length || 0
    const diff = newChecked - prevChecked
    
    schema.sub_quests[questIndex].metadata = { ...(schema.sub_quests[questIndex].metadata || {}), ...metadata, lastUpdated: timestamp }
    xpGained = diff > 0 ? diff * 20 : 0
  } else {
    schema.sub_quests[questIndex].completed = true
    schema.sub_quests[questIndex].metadata = { ...(metadata || {}), loggedAt: timestamp }
    const allDone = schema.sub_quests.every((q: any) => q.completed)
    xpGained = dailyReward + (allDone ? nodeReward : 0)
  }

  // Ensure repeatable nodes NEVER trigger full node completion
  const allDone = !isRepeatable && schema.sub_quests.every((q: any) => q.completed)
  
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

export async function postponeSubQuest(nodeId: string, questIndex: number, dateStr: string) {
  const supabase = await createClient()
  const { data: node } = await supabase.from('tree_nodes').select('*').eq('id', nodeId).single()
  if (!node) return
  let schema = typeof node.dynamic_schema === 'string' ? JSON.parse(node.dynamic_schema) : node.dynamic_schema
  schema.sub_quests[questIndex].metadata = { ...(schema.sub_quests[questIndex].metadata || {}), postponedTo: dateStr, scheduledDate: dateStr }
  await supabase.from('tree_nodes').update({ dynamic_schema: schema }).eq('id', nodeId)
  revalidatePath('/')
}

export async function stampScheduledDates(updates: {nodeId: string, questIndex: number, date: string}[]) {
  const supabase = await createClient()
  for (const update of updates) {
    const { data: node } = await supabase.from('tree_nodes').select('dynamic_schema').eq('id', update.nodeId).single()
    if (!node) continue
    let schema = typeof node.dynamic_schema === 'string' ? JSON.parse(node.dynamic_schema) : node.dynamic_schema
    schema.sub_quests[update.questIndex].metadata = { ...(schema.sub_quests[update.questIndex].metadata || {}), scheduledDate: update.date }
    await supabase.from('tree_nodes').update({ dynamic_schema: schema }).eq('id', update.nodeId)
  }
}

export async function processMissedQuests(missedQuests: {nodeId: string, questIndex: number, penaltyXp: number, attribute: string}[], todayStr: string) {
  const supabase = await createClient()
  const { data: stats } = await supabase.from('user_stats').select('*').single()
  if (!stats) return

  let totalDeductions: Record<string, number> = { int_xp: 0, str_xp: 0, dex_xp: 0, cha_xp: 0 }

  for (const missed of missedQuests) {
    const attrKey = `${missed.attribute.toLowerCase()}_xp`
    totalDeductions[attrKey] += missed.penaltyXp
    const { data: node } = await supabase.from('tree_nodes').select('dynamic_schema').eq('id', missed.nodeId).single()
    if (node) {
      let schema = typeof node.dynamic_schema === 'string' ? JSON.parse(node.dynamic_schema) : node.dynamic_schema
      schema.sub_quests[missed.questIndex].metadata.scheduledDate = todayStr
      schema.sub_quests[missed.questIndex].metadata.isRollover = true
      await supabase.from('tree_nodes').update({ dynamic_schema: schema }).eq('id', missed.nodeId)
    }
  }

  await supabase.from('user_stats').update({
    int_xp: Math.max(0, stats.int_xp - totalDeductions.int_xp),
    str_xp: Math.max(0, stats.str_xp - totalDeductions.str_xp),
    dex_xp: Math.max(0, stats.dex_xp - totalDeductions.dex_xp),
    cha_xp: Math.max(0, stats.cha_xp - totalDeductions.cha_xp),
  }).eq('id', stats.id)

  revalidatePath('/')
}