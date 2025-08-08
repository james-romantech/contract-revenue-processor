'use client'

import { useState, useEffect } from 'react'
import { FileUploadEnhanced } from '@/components/file-upload-enhanced'
import { ContractEditor } from '@/components/contract-editor'
import { RevenueCalculator } from '@/components/revenue-calculator'
import { ExportButtons } from '@/components/export-buttons'
import { NavigationHeader } from '@/components/navigation-header'
import type { RevenueAllocation } from '@/lib/revenue-calculator'
import { FileText, Sparkles, Shield, Zap, CheckCircle, TrendingUp, Award } from 'lucide-react'

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
  const [revenueAllocations, setRevenueAllocations] = useState<RevenueAllocation[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleProcessComplete = async (extractedText: string, file: File) => {
    console.log('=== handleProcessComplete called ===')
    console.log('File:', file.name, file.type, file.size)
    console.log('ExtractedText length:', extractedText?.length || 0)
    
    setIsProcessing(true)
    setError(null)
    setContractData(null)

    try {
      const formData = new FormData()
      
      if (extractedText) {
        console.log('Sending extracted text to server:', {
          length: extractedText.length,
          firstChars: extractedText.substring(0, 100),
          lastChars: extractedText.substring(extractedText.length - 100)
        })
        formData.append('extractedText', extractedText)
        formData.append('fileName', file.name)
        formData.append('fileType', file.type)
      } else {
        formData.append('file', file)
      }
      formData.append('useAI', 'true')

      const response = await fetch('/api/contracts/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()
      console.log('Upload response:', result)
      
      if (!response.ok && !result.contract) {
        throw new Error(result.error || 'Failed to upload file')
      }

      if (result.contract) {
        setContractData(result.contract)
      }
      
      if (!result.success && result.debug?.error) {
        setError(`AI extraction issue: ${result.debug.error}. Text was extracted (${result.debug.textLength} chars) but AI couldn't parse contract details.`)
      } else if (result.contract?.validation?.warnings?.length > 0) {
        setError('Warning: ' + result.contract.validation.warnings.join(', '))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen w-full">
      <NavigationHeader />
      
      {/* Main Content Wrapper */}
      <div className="w-full pt-16">
        {/* Hero Section */}
        <section className="relative w-full min-h-[90vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-purple-50">
          {/* Background Patterns */}
          <div className="absolute inset-0 dot-pattern opacity-30" />
          
          {/* Animated Gradient Orbs */}
          <div className="absolute top-1/4 left-1/4 w-64 h-64 md:w-96 md:h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob" />
          <div className="absolute top-1/3 right-1/4 w-64 h-64 md:w-96 md:h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000" />
          <div className="absolute bottom-1/4 left-1/3 w-64 h-64 md:w-96 md:h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000" />
          
          {/* Content Container - Fixed Centering */}
          <div className="relative z-10 w-full flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
            {/* Hero Header */}
            <div className={`text-center mb-12 ${mounted ? 'slide-up' : 'opacity-0'}`}>
              {/* Logo */}
              <div className="flex justify-center mb-8">
                <div className="p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl shadow-2xl">
                  <FileText className="h-12 w-12 md:h-16 md:w-16 text-white" />
                </div>
              </div>
              
              {/* Title */}
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6">
                <span className="gradient-text">ContractSync AI</span>
              </h1>
              
              {/* Subtitle */}
              <p className="text-lg sm:text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-10 px-4 leading-relaxed">
                Transform your contracts into actionable insights with
                <span className="font-semibold text-gray-900"> AI-powered extraction</span> and
                <span className="font-semibold text-gray-900"> intelligent revenue recognition</span>
              </p>
              
              {/* Feature Pills */}
              <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-12 px-4">
                <div className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow">
                  <Sparkles className="h-4 w-4 text-indigo-600" />
                  <span className="text-xs sm:text-sm font-medium">AI-Powered</span>
                </div>
                <div className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow">
                  <Shield className="h-4 w-4 text-green-600" />
                  <span className="text-xs sm:text-sm font-medium">Enterprise Secure</span>
                </div>
                <div className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow">
                  <Zap className="h-4 w-4 text-yellow-600" />
                  <span className="text-xs sm:text-sm font-medium">5,000 Pages Free</span>
                </div>
                <div className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow">
                  <Award className="h-4 w-4 text-purple-600" />
                  <span className="text-xs sm:text-sm font-medium">99% Accuracy</span>
                </div>
              </div>
              
              {/* Stats Section */}
              <div className="grid grid-cols-3 gap-4 sm:gap-6 md:gap-8 max-w-lg mx-auto mb-12">
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold gradient-text">10s</div>
                  <div className="text-xs sm:text-sm text-gray-600">Avg. Processing</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold gradient-text">OCR</div>
                  <div className="text-xs sm:text-sm text-gray-600">Scanned PDFs</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold gradient-text">4+</div>
                  <div className="text-xs sm:text-sm text-gray-600">Revenue Methods</div>
                </div>
              </div>
            </div>

            {/* Upload Section */}
            <div className="w-full max-w-3xl">
              <div className="glass-effect rounded-2xl p-6 sm:p-8 md:p-10 shadow-2xl">
                <FileUploadEnhanced onProcessComplete={handleProcessComplete} isProcessing={isProcessing} />
              </div>
            </div>
          </div>
        </section>

        {/* Processing Indicator */}
        {isProcessing && (
          <section className="w-full py-8">
            <div className="max-w-3xl mx-auto px-4">
              <div className="card-modern bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/30 border-t-white"></div>
                    <Sparkles className="absolute inset-0 m-auto h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <p className="font-semibold text-lg">AI Analysis in Progress</p>
                    <p className="text-white/90 text-sm mt-1">
                      Extracting • Analyzing • Calculating
                    </p>
                    <div className="mt-3 bg-white/20 rounded-full h-2 overflow-hidden">
                      <div className="h-full bg-white rounded-full shimmer" style={{ width: '60%' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Error Display */}
        {error && (
          <section className="w-full py-8">
            <div className="max-w-3xl mx-auto px-4 slide-up">
              <div className="card-modern border-l-4 border-red-500 bg-red-50">
                <p className="text-red-800 font-medium">⚠️ {error}</p>
              </div>
            </div>
          </section>
        )}

        {/* Contract Data Display */}
        {contractData && (
          <section className="w-full py-12 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 slide-up">
              {/* Success Notification */}
              <div className="w-full max-w-3xl mx-auto">
                <div className="card-modern bg-gradient-to-r from-green-500 to-emerald-600 text-white">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-6 sm:h-8 w-6 sm:w-8 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-base sm:text-lg">Contract Successfully Analyzed!</p>
                      <p className="text-white/90 text-xs sm:text-sm">
                        {contractData.aiExtractedData?.confidence ? 
                          `AI Confidence: ${contractData.aiExtractedData.confidence > 1 ? 
                            contractData.aiExtractedData.confidence.toFixed(1) : 
                            (contractData.aiExtractedData.confidence * 100).toFixed(1)}%` : 
                          'Processing complete'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Contract Editor */}
              <div className="w-full">
                <div className="card-modern hover-lift">
                  <ContractEditor contractData={contractData} />
                </div>
              </div>
              
              {/* Revenue Calculator */}
              <div className="w-full">
                <div className="card-modern hover-lift">
                  <RevenueCalculator 
                    contractData={contractData} 
                    onAllocationsChange={(allocations) => {
                      console.log('Revenue allocations updated:', allocations)
                      setRevenueAllocations(allocations)
                    }}
                  />
                </div>
              </div>
              
              {/* Export Buttons */}
              <div className="w-full">
                <div className="card-modern hover-lift">
                  <ExportButtons 
                    contractData={contractData} 
                    revenueAllocations={revenueAllocations}
                  />
                </div>
              </div>
            </div>
          </section>
        )}
        
        {/* Features Section */}
        {!contractData && !isProcessing && (
          <section className="w-full py-20 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
                <div className="card-modern text-center hover-lift p-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-6">
                    <FileText className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="font-semibold text-xl mb-4">Smart Extraction</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    AI understands implicit contract language and extracts key terms automatically
                  </p>
                </div>
                
                <div className="card-modern text-center hover-lift p-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-6">
                    <TrendingUp className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="font-semibold text-xl mb-4">Revenue Recognition</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Multiple methods including straight-line, milestone-based, and percentage complete
                  </p>
                </div>
                
                <div className="card-modern text-center hover-lift p-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center mx-auto mb-6">
                    <Shield className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="font-semibold text-xl mb-4">Enterprise Ready</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Secure processing with OCR support for scanned documents
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
      
      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  )
}