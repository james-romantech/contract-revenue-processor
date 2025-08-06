import { addMonths, format, parseISO, startOfMonth } from 'date-fns'

export interface RevenueAllocation {
  amount: number
  recognitionDate: Date
  type: 'milestone' | 'monthly' | 'percentage' | 'billed'
  description: string
}

export interface RevenueCalculationParams {
  totalValue: number
  startDate: Date
  endDate: Date
  allocationType: 'straight-line' | 'milestone-based' | 'percentage-complete' | 'billed-on-achievement'
  milestones?: Array<{
    name: string
    amount: number
    dueDate: Date
  }>
}

export function calculateRevenueAllocations(params: RevenueCalculationParams): RevenueAllocation[] {
  const { totalValue, startDate, endDate, allocationType, milestones = [] } = params
  
  switch (allocationType) {
    case 'straight-line':
      return calculateStraightLineRevenue(totalValue, startDate, endDate)
      
    case 'milestone-based':
      return calculateMilestoneRevenue(milestones)
      
    case 'percentage-complete':
      return calculatePercentageCompleteRevenue(totalValue, startDate, endDate)
      
    case 'billed-on-achievement':
      return calculateBilledOnAchievementRevenue(milestones)
      
    default:
      return calculateStraightLineRevenue(totalValue, startDate, endDate)
  }
}

function calculateStraightLineRevenue(
  totalValue: number,
  startDate: Date,
  endDate: Date
): RevenueAllocation[] {
  const allocations: RevenueAllocation[] = []
  const totalMonths = getMonthsBetween(startDate, endDate)
  const monthlyAmount = totalValue / totalMonths
  
  let currentDate = startOfMonth(startDate)
  
  for (let i = 0; i < totalMonths; i++) {
    allocations.push({
      amount: monthlyAmount,
      recognitionDate: currentDate,
      type: 'monthly',
      description: `Month ${i + 1} of ${totalMonths} - Straight-line allocation`
    })
    currentDate = addMonths(currentDate, 1)
  }
  
  return allocations
}

function calculateMilestoneRevenue(
  milestones: Array<{ name: string; amount: number; dueDate: Date }>
): RevenueAllocation[] {
  return milestones.map(milestone => ({
    amount: milestone.amount,
    recognitionDate: milestone.dueDate,
    type: 'milestone' as const,
    description: `Milestone: ${milestone.name}`
  }))
}

function calculatePercentageCompleteRevenue(
  totalValue: number,
  startDate: Date,
  endDate: Date
): RevenueAllocation[] {
  const allocations: RevenueAllocation[] = []
  const totalMonths = getMonthsBetween(startDate, endDate)
  let currentDate = startOfMonth(startDate)
  
  for (let i = 0; i < totalMonths; i++) {
    const percentageComplete = ((i + 1) / totalMonths) * 100
    const cumulativeRevenue = (totalValue * percentageComplete) / 100
    const previousRevenue = i === 0 ? 0 : (totalValue * (i / totalMonths))
    const monthlyRevenue = cumulativeRevenue - previousRevenue
    
    allocations.push({
      amount: monthlyRevenue,
      recognitionDate: currentDate,
      type: 'percentage',
      description: `${percentageComplete.toFixed(1)}% complete`
    })
    currentDate = addMonths(currentDate, 1)
  }
  
  return allocations
}

function calculateBilledOnAchievementRevenue(
  milestones: Array<{ name: string; amount: number; dueDate: Date }>
): RevenueAllocation[] {
  return milestones.map(milestone => ({
    amount: milestone.amount,
    recognitionDate: milestone.dueDate,
    type: 'billed' as const,
    description: `Billed on achievement: ${milestone.name}`
  }))
}

function getMonthsBetween(startDate: Date, endDate: Date): number {
  const start = new Date(startDate.getFullYear(), startDate.getMonth())
  const end = new Date(endDate.getFullYear(), endDate.getMonth())
  
  let months = 0
  let current = new Date(start)
  
  while (current <= end) {
    months++
    current.setMonth(current.getMonth() + 1)
  }
  
  return Math.max(1, months)
}

export function calculateForwardBookRevenue(allocations: RevenueAllocation[], actualRevenue: number): {
  totalContracted: number
  earnedToDate: number
  unearned: number
  forwardBook: number
} {
  const totalContracted = allocations.reduce((sum, allocation) => sum + allocation.amount, 0)
  const today = new Date()
  
  const earnedToDate = allocations
    .filter(allocation => allocation.recognitionDate <= today)
    .reduce((sum, allocation) => sum + allocation.amount, 0)
  
  const unearned = Math.max(0, totalContracted - actualRevenue)
  const forwardBook = Math.max(0, totalContracted - earnedToDate)
  
  return {
    totalContracted,
    earnedToDate,
    unearned,
    forwardBook
  }
}