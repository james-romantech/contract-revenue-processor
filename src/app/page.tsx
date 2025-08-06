'use client'

import { useState } from 'react'
import { FileUpload } from '@/components/file-upload'
import { ContractEditor } from '@/components/contract-editor'
import { RevenueCalculator } from '@/components/revenue-calculator'
import { Settings } from 'lucide-react'

interface ContractData {
  id: string
  filename: string
  status: string
  contractValue: number | null
  startDate?: string | null
  endDate?: string | null
  clientName?: string | null
  description?: string | null
  extractedInfo?: {
    amounts: string[]
    dates: string[]
    emails: string[]
    wordCount: number
  }
  aiExtractedData?: {
    contractValue: number | null
    startDate: string | null
    endDate: string | null
    clientName: string | null
    description: string | null
    milestones: Array<{
      name: string
      amount: number
      dueDate: string
    }>
    paymentTerms: string | null
    deliverables: string[]
    confidence: number
    reasoning: string
  }
  validation?: {
    isValid: boolean
    errors: string[]
    warnings: string[]
  }
}

export default function Home() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [contractData, setContractData] = useState<ContractData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [useAI, setUseAI] = useState(true)

  const handleFileSelect = async (file: File) => {
    setIsProcessing(true)
    setError(null)
    setContractData(null)

    try {
      console.log('Uploading with AI extraction:', useAI)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('useAI', useAI.toString())

      const response = await fetch('/api/contracts/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to upload file')
      }

      const result = await response.json()
      setContractData(result.contract)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            ContractSync AI
          </h1>
          <p className="text-gray-600 mb-6">
            AI-powered contract analysis for revenue recognition and milestone tracking
            <br />
            <span className="text-sm text-blue-600">Supports both text-based and scanned PDFs with OCR</span>
          </p>
          
          {/* AI Toggle */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <Settings className="h-4 w-4 text-gray-500" />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={useAI}
                onChange={(e) => setUseAI(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                disabled={isProcessing}
              />
              Use AI Extraction (requires OpenAI API key)
            </label>
          </div>
        </div>

        <FileUpload onFileSelect={handleFileSelect} isProcessing={isProcessing} />

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">Error: {error}</p>
          </div>
        )}

        {contractData && (
          <div className="mt-8 space-y-6">
            <ContractEditor contractData={contractData} />
            <RevenueCalculator contractData={contractData} />
          </div>
        )}
      </div>
    </div>
  )
}
