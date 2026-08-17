'use client'

import { useEffect } from 'react'
import { stampScheduledDates, processMissedQuests } from '@/app/actions'

export default function LedgerManager({ finalQuests, missedQuests, todayStr }: { finalQuests: any[], missedQuests: any[], todayStr: string }) {
  useEffect(() => {
    // 1. If there are missed quests from previous days, penalize and roll them over to today
    if (missedQuests.length > 0) {
      const payloads = missedQuests.map(q => ({
        nodeId: q.nodeId, questIndex: q.questIndex, penaltyXp: q.dailyReward, attribute: q.attribute
      }))
      processMissedQuests(payloads, todayStr)
    }

    // 2. Stamp newly generated active quests with today's date so we can track them tomorrow
    const unstampedQuests = finalQuests.filter(q => !q.isActuallyDone && q.scheduledDate !== todayStr)
    if (unstampedQuests.length > 0) {
      const stampPayloads = unstampedQuests.map(q => ({
        nodeId: q.nodeId, questIndex: q.questIndex, date: todayStr
      }))
      stampScheduledDates(stampPayloads)
    }
  }, [finalQuests, missedQuests, todayStr])

  return null // Silent component
}