'use client'

import { Download, FileSpreadsheet, FileText } from 'lucide-react'
import { exportToCSV, exportToExcel } from '@/lib/export-utils'

interface ExportButtonsProps {
  contractData: {
    filename: string
    clientName: string | null
    contractValue: number | null
    startDate: string | null
    endDate: string | null
    description: string | null
    aiExtractedData?: {
      milestones: Array<{
        name: string
        amount: number
        dueDate: string
      }>
    }
  }
  revenueAllocations?: Array<{
    description: string
    amount: number
    recognitionDate: Date
    type: string
  }>
}

export function ExportButtons({ contractData, revenueAllocations = [] }: ExportButtonsProps) {
  const handleExportCSV = () => {
    const exportData = {
      contractInfo: {
        filename: contractData.filename,
        clientName: contractData.clientName,
        contractValue: contractData.contractValue,
        startDate: contractData.startDate,
        endDate: contractData.endDate,
        description: contractData.description
      },
      milestones: contractData.aiExtractedData?.milestones || [],
      revenueAllocations: revenueAllocations
    }
    
    const filename = `contract-${contractData.clientName || 'export'}-${new Date().toISOString().split('T')[0]}`
    exportToCSV(exportData, filename)
  }

  const handleExportExcel = () => {
    const exportData = {
      contractInfo: {
        filename: contractData.filename,
        clientName: contractData.clientName,
        contractValue: contractData.contractValue,
        startDate: contractData.startDate,
        endDate: contractData.endDate,
        description: contractData.description
      },
      milestones: contractData.aiExtractedData?.milestones || [],
      revenueAllocations: revenueAllocations
    }
    
    const filename = `contract-${contractData.clientName || 'export'}-${new Date().toISOString().split('T')[0]}`
    exportToExcel(exportData, filename)
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Download className="h-5 w-5" />
        Export Data
      </h3>
      
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleExportCSV}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <FileText className="h-4 w-4" />
          Export to CSV
        </button>
        
        <button
          onClick={handleExportExcel}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <FileSpreadsheet className="h-4 w-4" />
          Export to Excel
        </button>
      </div>
      
      <p className="text-xs text-gray-500 mt-3 text-center">
        Exports contract details, milestones, and revenue recognition schedule
      </p>
    </div>
  )
}