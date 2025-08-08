'use client'

import { useState } from 'react'
import { Upload } from 'lucide-react'

export default function TestOCRPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string>('')
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setLoading(true)
    setResult(null)
    setStatus('Testing extraction... This may take 10-15 seconds for OCR...')
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/debug-extraction-v2', {
        method: 'POST',
        body: formData
      })
      
      const data = await response.json()
      setResult(data)
      
      if (data.success) {
        if (data.extraction.usedAzure) {
          setStatus(`✅ Azure OCR worked! Extracted ${data.extraction.textLength} characters (original was ${data.extraction.originalLength})`)
        } else if (data.extraction.is7562Limit) {
          setStatus(`⚠️ Hit 7562 limit but Azure wasn\'t used. Azure configured: ${data.extraction.azureConfigured}`)
        } else {
          setStatus(`✅ Extracted ${data.extraction.textLength} characters (no Azure needed)`)
        }
      } else {
        setStatus(`❌ Extraction failed: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      setStatus(`❌ Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Azure OCR Debug Test</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Upload PDF to Test Azure OCR</h2>
          <label className="block">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors">
              <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">Click to upload PDF (should have 6+ pages to trigger 7562 limit)</p>
              <input
                type="file"
                className="hidden"
                accept=".pdf"
                onChange={handleFileUpload}
                disabled={loading}
              />
            </div>
          </label>
          
          {loading && (
            <div className="mt-4 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-gray-600">{status}</p>
            </div>
          )}
        </div>
        
        {status && !loading && (
          <div className={`p-4 rounded-lg mb-6 ${
            status.includes('✅') ? 'bg-green-50 text-green-800' :
            status.includes('⚠️') ? 'bg-amber-50 text-amber-800' :
            'bg-red-50 text-red-800'
          }`}>
            <p className="font-semibold">{status}</p>
          </div>
        )}
        
        {result && (
          <div className="space-y-6">
            {/* Debug Info */}
            {result.debug && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold mb-4">Environment Status</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-semibold">Azure Endpoint:</span> {result.debug.azureEndpoint}
                  </div>
                  <div>
                    <span className="font-semibold">Azure Key:</span> {result.debug.azureKey}
                  </div>
                  <div>
                    <span className="font-semibold">Environment:</span> {result.debug.environment}
                  </div>
                  <div>
                    <span className="font-semibold">Vercel Env:</span> {result.debug.vercelEnv}
                  </div>
                </div>
              </div>
            )}
            
            {/* Extraction Info */}
            {result.extraction && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold mb-4">Extraction Results</h2>
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <span className="font-semibold">Original Length:</span> {result.extraction.originalLength} chars
                  </div>
                  <div>
                    <span className="font-semibold">Final Length:</span> {result.extraction.textLength} chars
                  </div>
                  <div>
                    <span className="font-semibold">Hit 7562 Limit:</span> {result.extraction.is7562Limit ? 'Yes' : 'No'}
                  </div>
                  <div>
                    <span className="font-semibold">Used Azure OCR:</span> {result.extraction.usedAzure ? 'Yes' : 'No'}
                  </div>
                </div>
                
                {result.extraction.textPreview && (
                  <div>
                    <h3 className="font-semibold mb-2">Text Preview (first 500 chars):</h3>
                    <pre className="bg-gray-50 p-4 rounded text-xs overflow-x-auto">
                      {result.extraction.textPreview}
                    </pre>
                  </div>
                )}
              </div>
            )}
            
            {/* Full JSON */}
            <details className="bg-white rounded-lg shadow-md p-6">
              <summary className="cursor-pointer font-semibold">Full Response JSON</summary>
              <pre className="mt-4 text-xs bg-gray-50 p-4 rounded overflow-x-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  )
}