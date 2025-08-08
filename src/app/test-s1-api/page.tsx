'use client'

import { useState } from 'react'
import { Upload, Loader2, CheckCircle, XCircle } from 'lucide-react'

export default function TestS1APIPage() {
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
      
      const response = await fetch('/api/test-s1-direct', {
        method: 'POST',
        body: formData
      })
      
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ 
        error: 'Test failed', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      })
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">S1 Tier API Test</h1>
          <p className="text-gray-600">Tests different Azure API parameters to find what works with S1 tier</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <label className="block">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors">
              <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">Upload your 6-page PDF to test different API calls</p>
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
            <div className="mt-6 flex items-center justify-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              <p className="text-gray-600">Testing different API parameters... (30-60 seconds)</p>
            </div>
          )}
        </div>
        
        {result && !loading && (
          <div className="space-y-6">
            {/* File Info */}
            {result.file && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm">
                  <strong>File:</strong> {result.file.name} | 
                  <strong className="ml-2">Size:</strong> {result.file.sizeKB} KB ({result.file.sizeMB} MB)
                </p>
              </div>
            )}
            
            {/* Test Results */}
            {result.testResults && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold mb-4">API Test Results</h2>
                <div className="space-y-3">
                  {result.testResults.map((test: any, idx: number) => (
                    <div 
                      key={idx}
                      className={`p-4 rounded-lg border ${
                        test.status === 'success' && test.pagesProcessed > 2
                          ? 'bg-green-50 border-green-300'
                          : test.status === 'success'
                          ? 'bg-yellow-50 border-yellow-300'
                          : 'bg-red-50 border-red-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            {test.status === 'success' ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-600" />
                            )}
                            <strong>{test.test}</strong>
                          </div>
                          {test.status === 'success' ? (
                            <p className="text-sm mt-1">
                              Pages: <strong>{test.pagesProcessed}</strong> | 
                              Characters: <strong>{test.totalCharacters}</strong>
                              {test.pagesProcessed <= 2 && (
                                <span className="ml-2 text-orange-600">(⚠️ Only 2 pages)</span>
                              )}
                            </p>
                          ) : (
                            <p className="text-sm text-red-600 mt-1">
                              {test.error} {test.details && `- ${test.details.substring(0, 100)}`}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Recommendation */}
            {result.recommendation && (
              <div className={`rounded-lg p-6 ${
                result.recommendation.includes('all pages') 
                  ? 'bg-green-50 border-2 border-green-300'
                  : 'bg-amber-50 border-2 border-amber-300'
              }`}>
                <h3 className="font-semibold mb-2">Recommendation:</h3>
                <p>{result.recommendation}</p>
                {result.bestResult && result.bestResult.pagesProcessed <= 2 && (
                  <p className="mt-2 text-sm">
                    <strong>Note:</strong> Even with S1 tier, Azure is only processing 2 pages. 
                    The PDF splitting solution will automatically handle this by processing your PDF in 2-page chunks.
                  </p>
                )}
              </div>
            )}
            
            {/* Full Response */}
            <details className="bg-white rounded-lg shadow-md p-6">
              <summary className="cursor-pointer font-semibold text-blue-600">
                View Full Response
              </summary>
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