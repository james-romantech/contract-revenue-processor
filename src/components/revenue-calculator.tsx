'use client'

import { useState, useEffect } from 'react'
import { Calculator, TrendingUp, Calendar } from 'lucide-react'
import { calculateRevenueAllocations, calculateForwardBookRevenue, type RevenueAllocation, type RevenueCalculationParams } from '@/lib/revenue-calculator'

interface RevenueCalculatorProps {
  contractData: {
    contractValue: number | null
    startDate: string | null
    endDate: string | null
    aiExtractedData?: {
      workStartDate?: string | null
      workEndDate?: string | null
      billingStartDate?: string | null
      billingEndDate?: string | null
      milestones: Array<{
        name: string
        amount: number
        dueDate: string
      }>
    }
  }
}

export function RevenueCalculator({ contractData }: RevenueCalculatorProps) {
  const [allocationType, setAllocationType] = useState<'straight-line' | 'milestone-based' | 'percentage-complete' | 'billed-basis'>('straight-line')
  const [revenueAllocations, setRevenueAllocations] = useState<RevenueAllocation[]>([])
  const [actualRevenue, setActualRevenue] = useState(0)
  const [forwardBook, setForwardBook] = useState({
    totalContracted: 0,
    earnedToDate: 0,
    unearned: 0,
    forwardBook: 0
  })

  const canCalculateRevenue = contractData.contractValue && contractData.startDate && contractData.endDate

  const calculateRevenue = () => {
    if (!canCalculateRevenue) return

    // Use work dates for straight-line, billing dates for billed-basis
    let startDate, endDate
    
    if (allocationType === 'straight-line' || allocationType === 'percentage-complete') {
      // Use work period dates for straight-line revenue recognition
      startDate = contractData.aiExtractedData?.workStartDate || contractData.startDate
      endDate = contractData.aiExtractedData?.workEndDate || contractData.endDate
    } else if (allocationType === 'billed-basis') {
      // Use billing period dates for billed-basis revenue
      startDate = contractData.aiExtractedData?.billingStartDate || contractData.startDate
      endDate = contractData.aiExtractedData?.billingEndDate || contractData.endDate
    } else {
      // Default to standard dates
      startDate = contractData.startDate
      endDate = contractData.endDate
    }

    const params: RevenueCalculationParams = {
      totalValue: contractData.contractValue!,
      startDate: new Date(startDate!),
      endDate: new Date(endDate!),
      allocationType,
      milestones: contractData.aiExtractedData?.milestones.map(m => ({
        name: m.name,
        amount: m.amount,
        dueDate: new Date(m.dueDate)
      })) || []
    }

    const allocations = calculateRevenueAllocations(params)
    setRevenueAllocations(allocations)
    
    const forward = calculateForwardBookRevenue(allocations, actualRevenue)
    setForwardBook(forward)
  }

  useEffect(() => {
    if (canCalculateRevenue) {
      calculateRevenue()
    }
  }, [contractData, allocationType, actualRevenue])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date)
  }

  if (!canCalculateRevenue) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Calculator className="h-5 w-5" />
          Revenue Calculator
        </h3>
        <div className="text-center py-8 text-gray-500">
          <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Contract value, start date, and end date are required to calculate revenue allocations.</p>
          <p className="text-sm mt-2">Please ensure these fields are extracted from the contract.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Revenue Calculator
        </h3>
      </div>

      {/* Allocation Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Revenue Recognition Method</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => setAllocationType('straight-line')}
            className={`p-3 text-left border rounded-lg transition-colors ${
              allocationType === 'straight-line' 
                ? 'border-blue-500 bg-blue-50 text-blue-700' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <div className="font-medium">Straight-Line</div>
            <div className="text-sm text-gray-600">Even distribution over contract period</div>
          </button>
          
          <button
            onClick={() => setAllocationType('milestone-based')}
            className={`p-3 text-left border rounded-lg transition-colors ${
              allocationType === 'milestone-based' 
                ? 'border-blue-500 bg-blue-50 text-blue-700' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            disabled={!contractData.aiExtractedData?.milestones.length}
          >
            <div className="font-medium">Milestone-Based</div>
            <div className="text-sm text-gray-600">
              {contractData.aiExtractedData?.milestones.length ? 
                `Revenue at ${contractData.aiExtractedData.milestones.length} milestones` :
                'No milestones detected'
              }
            </div>
          </button>
          
          <button
            onClick={() => setAllocationType('percentage-complete')}
            className={`p-3 text-left border rounded-lg transition-colors ${
              allocationType === 'percentage-complete' 
                ? 'border-blue-500 bg-blue-50 text-blue-700' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <div className="font-medium">Percentage Complete</div>
            <div className="text-sm text-gray-600">Progressive recognition based on completion</div>
          </button>
          
          <button
            onClick={() => setAllocationType('billed-basis')}
            className={`p-3 text-left border rounded-lg transition-colors ${
              allocationType === 'billed-basis' 
                ? 'border-blue-500 bg-blue-50 text-blue-700' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            disabled={!contractData.aiExtractedData?.milestones.length}
          >
            <div className="font-medium">Billed-Basis</div>
            <div className="text-sm text-gray-600">
              {contractData.aiExtractedData?.milestones.length ? 
                `Revenue on billing dates (${contractData.aiExtractedData.milestones.length} payments)` :
                'No billing milestones detected'
              }
            </div>
          </button>
        </div>
      </div>

      {/* Forward Book Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(forwardBook.totalContracted)}</div>
          <div className="text-sm text-gray-600">Total Contracted</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{formatCurrency(forwardBook.earnedToDate)}</div>
          <div className="text-sm text-gray-600">Earned to Date</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{formatCurrency(forwardBook.forwardBook)}</div>
          <div className="text-sm text-gray-600">Forward Book</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">{formatCurrency(forwardBook.unearned)}</div>
          <div className="text-sm text-gray-600">Unearned</div>
        </div>
      </div>

      {/* Actual Revenue Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Actual Revenue Recognized (for tracking)
        </label>
        <div className="flex items-center gap-2">
          <span className="text-gray-500">$</span>
          <input
            type="number"
            value={actualRevenue}
            onChange={(e) => setActualRevenue(parseFloat(e.target.value) || 0)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter actual revenue to date"
          />
        </div>
      </div>

      {/* Revenue Schedule */}
      <div>
        <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Revenue Recognition Schedule
        </h4>
        
        {revenueAllocations.length > 0 ? (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {revenueAllocations.map((allocation, index) => {
              const isPast = allocation.recognitionDate <= new Date()
              return (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded border ${
                    isPast ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm">{allocation.description}</div>
                    <div className="text-xs text-gray-600 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(allocation.recognitionDate)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatCurrency(allocation.amount)}</div>
                    <div className={`text-xs capitalize px-2 py-1 rounded ${
                      allocation.type === 'milestone' ? 'bg-blue-100 text-blue-700' :
                      allocation.type === 'monthly' ? 'bg-gray-100 text-gray-700' :
                      allocation.type === 'percentage' ? 'bg-purple-100 text-purple-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {allocation.type}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No revenue schedule calculated</p>
        )}
      </div>
    </div>
  )
}