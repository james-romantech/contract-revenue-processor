'use client'

import { useState } from 'react'
import { Upload } from 'lucide-react'

export default function DebugPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setLoading(true)
    setResult(null)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/debug-extraction', {
        method: 'POST',
        body: formData
      })
      
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Upload failed' })
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Contract Extraction Debug Tool</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <label className="block">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors">
              <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">Click to upload PDF or Word document</p>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx"
                onChange={handleFileUpload}
                disabled={loading}
              />
            </div>
          </label>
          
          {loading && (
            <div className="mt-4 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-gray-600">Processing document...</p>
            </div>
          )}
        </div>
        
        {result && (
          <div className="space-y-6">
            {/* File Info */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4">File Information</h2>
              <pre className="text-sm bg-gray-50 p-4 rounded overflow-x-auto">
                {JSON.stringify(result.file, null, 2)}
              </pre>
            </div>
            
            {/* Debug Info */}
            {result.debug && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold mb-4">Quick Analysis</h2>
                <pre className="text-sm bg-gray-50 p-4 rounded overflow-x-auto">
                  {JSON.stringify(result.debug, null, 2)}
                </pre>
              </div>
            )}
            
            {/* AI Extraction */}
            {result.extraction?.aiExtraction && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold mb-4">AI Extraction Result</h2>
                <pre className="text-sm bg-gray-50 p-4 rounded overflow-x-auto max-h-96">
                  {JSON.stringify(result.extraction.aiExtraction, null, 2)}
                </pre>
              </div>
            )}
            
            {/* Extracted Text */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4">
                Extracted Text ({result.extraction?.textLength || 0} characters)
              </h2>
              <div className="bg-gray-50 p-4 rounded">
                <p className="text-xs text-gray-600 mb-2">First 5000 characters:</p>
                <pre className="text-sm whitespace-pre-wrap overflow-x-auto max-h-96">
                  {result.extraction?.textPreview || 'No text extracted'}
                </pre>
              </div>
              
              {result.extraction?.fullText && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-blue-600 hover:text-blue-700">
                    Show full extracted text
                  </summary>
                  <pre className="mt-2 text-sm bg-gray-50 p-4 rounded whitespace-pre-wrap overflow-x-auto max-h-96">
                    {result.extraction.fullText}
                  </pre>
                </details>
              )}
            </div>
            
            {/* Error Display */}
            {result.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-red-700 mb-2">Error</h2>
                <p className="text-red-600">{result.error}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}