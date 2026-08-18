'use server'

import { createClient } from '@/utils/supabase/server'

async function callAI(systemPrompt: string, userPrompt: string) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.4 }
      })
    }
  )

  const data = await response.json()
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to generate analysis.'
}

export async function analyzeFoodLog(foodNotes: string) {
  const systemPrompt = `You are an elite sports nutritionist and performance coach. 
Analyze the user's logged daily meals and snacks. 
Provide:
1. Estimated Macro Breakdown (Calories, Protein, Carbohydrates, Fats).
2. Protein Quality and Target Adequacy.
3. Micronutrient / Digestion Assessment.
4. Actionable Optimization for the Next Meal/Day.
Keep the output structured with clean markdown headers and bullet points.`

  return await callAI(systemPrompt, `Here is my food intake log for today:\n${foodNotes}`)
}

export async function analyzeStyleAndGrooming(description: string) {
  const systemPrompt = `You are a menswear and personal aesthetic consultant. 
Analyze the user's planned or worn outfit and grooming routine.
Evaluate:
1. Color Harmony and Contrast.
2. Silhouette, Layering, and Proportions.
3. Occasion Appropriateness.
4. Grooming / Maintenance Recommendations.
Be concise, direct, and practical.`

  return await callAI(systemPrompt, `Here is my outfit and grooming description:\n${description}`)
}

export async function generateWeeklyExecutiveDebrief() {
  const supabase = await createClient()
  const { data: nodes } = await supabase
    .from('tree_nodes')
    .select('*, skill_trees(attribute)')
    .not('dynamic_schema', 'is', 'null')

  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const completedRecent: any[] = []

  ;(nodes || []).forEach(node => {
    let schema = typeof node.dynamic_schema === 'string' ? JSON.parse(node.dynamic_schema) : node.dynamic_schema
    const subQuests = Array.isArray(schema?.sub_quests) ? schema.sub_quests : []
    const attr = node.skill_trees?.attribute || 'INT'

    subQuests.forEach((q: any) => {
      if (q.completed && q.metadata?.loggedAt) {
        const logDate = new Date(q.metadata.loggedAt)
        if (logDate >= sevenDaysAgo) {
          completedRecent.push({
            attribute: attr,
            nodeTitle: node.title,
            questTitle: q.title,
            metadata: q.metadata,
            date: q.metadata.loggedAt
          })
        }
      }
    })
  })

  if (completedRecent.length === 0) {
    return 'No completed modules found for the past 7 days to analyze.'
  }

  const systemPrompt = `You are an RPG Executive Game Master and Productivity Strategist. 
Review the user's completed modules from the past 7 days across INT, STR, DEX, and CHA.
Provide a high-impact retrospective:
1. Weekly Domain Breakdown (XP velocity and consistency per attribute).
2. Key Wins and Notable Milestones.
3. Deficits or Blind Spots (under-trained attributes).
4. Strategic Directives for the Upcoming Week.`

  const userContent = JSON.stringify(completedRecent, null, 2)
  return await callAI(systemPrompt, `Here is my raw execution log for the last 7 days:\n${userContent}`)
}