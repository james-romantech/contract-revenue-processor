'use client'

import { useState, useCallback } from 'react'
import { Upload, FileText, X, AlertCircle, CheckCircle } from 'lucide-react'
import { extractTextFromPDFClient } from '@/lib/client-pdf-processor'

interface FileUploadEnhancedProps {
  onProcessComplete: (extractedText: string, file: File) => void
  isProcessing?: boolean
}

export function FileUploadEnhanced({ onProcessComplete, isProcessing: externalProcessing = false }: FileUploadEnhancedProps) {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStatus, setProcessingStatus] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [useServerProcessing, setUseServerProcessing] = useState(false)

  const processFile = async (file: File) => {
    setError(null)
    setIsProcessing(true)
    
    try {
      if (file.type === 'application/pdf' && !useServerProcessing) {
        // Try client-side processing first
        try {
          setProcessingStatus('Processing PDF in browser (no timeout limits)...')
          const extractedText = await extractTextFromPDFClient(file)
          
          // Check if we got meaningful text
          const pageCount = (extractedText.match(/--- Page \d+ ---/g) || []).length
          console.log('Client extraction complete:', {
            textLength: extractedText.length,
            pageCount: pageCount,
            preview: extractedText.substring(0, 500),
            lastChars: extractedText.substring(extractedText.length - 500)
          })
          
          // If we didn't get all pages or text is too short, warn user
          if (extractedText.length < 1000 || pageCount < 2) {
            setError('PDF extraction may be incomplete. Try server-side processing if issues persist.')
          }
          
          setProcessingStatus(`Extracted ${extractedText.length} characters from ${pageCount} pages`)
          onProcessComplete(extractedText, file)
        } catch (clientError) {
          console.error('Client-side processing failed, falling back to server:', clientError)
          setProcessingStatus('Client processing failed, using server...')
          // Fall back to server processing
          onProcessComplete('', file)
        }
      } else if (file.type === 'application/pdf' && useServerProcessing) {
        // Force server-side processing for PDFs
        setProcessingStatus('Processing PDF on server (may take up to 60 seconds)...')
        onProcessComplete('', file)
      } else if (
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.type === 'application/msword'
      ) {
        // Word docs still need server processing (but they're fast)
        setProcessingStatus('Processing Word document...')
        // For Word docs, we'll pass the file directly
        onProcessComplete('', file)
      } else {
        throw new Error('Unsupported file type')
      }
      
      setProcessingStatus('Processing complete!')
    } catch (err) {
      console.error('File processing error:', err)
      setError(err instanceof Error ? err.message : 'Failed to process file')
      setProcessingStatus('')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.type === 'application/pdf' || 
          file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          file.type === 'application/msword') {
        setSelectedFile(file)
        await processFile(file)
      } else {
        setError('Please upload a PDF or Word document')
      }
    }
  }, [])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setSelectedFile(file)
      await processFile(file)
    }
  }

  const clearFile = () => {
    setSelectedFile(null)
    setError(null)
    setProcessingStatus('')
  }

  return (
    <div className="w-full">
      <form
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-8
          transition-colors duration-200
          ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
          ${isProcessing || externalProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-400'}
        `}
      >
        <input
          type="file"
          id="file-upload"
          className="sr-only"
          accept=".pdf,.doc,.docx"
          onChange={handleFileSelect}
          disabled={isProcessing || externalProcessing}
        />
        
        <label
          htmlFor="file-upload"
          className="flex flex-col items-center justify-center cursor-pointer"
        >
          {selectedFile ? (
            <div className="text-center">
              <FileText className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
              <p className="text-xs text-gray-500 mt-1">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
              {processingStatus && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  {isProcessing ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  <p className="text-sm text-blue-600">{processingStatus}</p>
                </div>
              )}
            </div>
          ) : (
            <>
              <Upload className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-sm font-medium text-gray-900">
                {isProcessing || externalProcessing ? 'Processing...' : 'Drop your contract here'}
              </p>
              <p className="text-xs text-gray-500 mt-1">or click to select</p>
              <p className="text-xs text-gray-400 mt-2">Supports PDF and Word documents</p>
              <p className="text-xs text-green-600 mt-1 font-semibold">
                ✨ PDFs now process client-side (no timeout!)
              </p>
            </>
          )}
        </label>

        {selectedFile && !isProcessing && !externalProcessing && (
          <button
            type="button"
            onClick={clearFile}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        )}
      </form>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Processing Error</p>
            <p className="text-xs text-red-600 mt-1">{error}</p>
          </div>
        </div>
      )}

      {selectedFile && selectedFile.type === 'application/pdf' && (
        <div className="mt-4 space-y-3">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800 font-medium">
              {useServerProcessing ? 'Server-Side Processing' : 'Client-Side Processing Active'}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              {useServerProcessing 
                ? 'PDF will be processed on server (60-second timeout with Vercel Pro)'
                : 'PDF is being processed in your browser (no timeout limits)'}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="server-processing"
              checked={useServerProcessing}
              onChange={(e) => setUseServerProcessing(e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="server-processing" className="text-xs text-gray-700">
              Use server-side processing (if client-side isn't extracting all pages)
            </label>
          </div>
        </div>
      )}
    </div>
  )
}