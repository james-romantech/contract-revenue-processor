import { addMonths, endOfMonth, startOfMonth, differenceInMonths } from 'date-fns'

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
  allocationType: 'straight-line' | 'milestone-based' | 'percentage-complete' | 'billed-basis'
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
      
    case 'billed-basis':
      return calculateBilledBasisRevenue(milestones)
      
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
  
  // Start from the end of the first month
  let currentDate = endOfMonth(startDate)
  
  for (let i = 0; i < totalMonths; i++) {
    allocations.push({
      amount: monthlyAmount,
      recognitionDate: currentDate,
      type: 'monthly',
      description: `Month ${i + 1} of ${totalMonths} - Straight-line allocation`
    })
    // Move to the end of the next month
    currentDate = endOfMonth(addMonths(currentDate, 1))
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
  // Start from the end of the first month
  let currentDate = endOfMonth(startDate)
  
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
    // Move to the end of the next month
    currentDate = endOfMonth(addMonths(currentDate, 1))
  }
  
  return allocations
}

function calculateBilledBasisRevenue(
  milestones: Array<{ name: string; amount: number; dueDate: Date }>
): RevenueAllocation[] {
  return milestones.map((milestone, index) => ({
    amount: milestone.amount,
    recognitionDate: milestone.dueDate,
    type: 'billed' as const,
    description: `Billed amount ${index + 1}: ${milestone.name}`
  }))
}

function getMonthsBetween(startDate: Date, endDate: Date): number {
  // Count the number of months inclusively
  // Aug 1 to Dec 31 = Aug, Sep, Oct, Nov, Dec = 5 months
  const startMonth = startOfMonth(startDate)
  const endMonth = startOfMonth(endDate)
  const months = differenceInMonths(endMonth, startMonth) + 1
  
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