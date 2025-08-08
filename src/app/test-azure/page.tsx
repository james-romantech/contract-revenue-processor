'use client'

import { useState } from 'react'
import { Upload, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

export default function TestAzurePage() {
  const [configStatus, setConfigStatus] = useState<any>(null)
  const [ocrTestResult, setOcrTestResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  
  // Check configuration
  const checkConfig = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/test-azure')
      const data = await response.json()
      setConfigStatus(data)
    } catch (error) {
      setConfigStatus({ error: 'Failed to check configuration' })
    } finally {
      setLoading(false)
    }
  }
  
  // Test OCR with file
  const testOCR = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setTesting(true)
    setOcrTestResult(null)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/test-azure-ocr', {
        method: 'POST',
        body: formData
      })
      
      const data = await response.json()
      setOcrTestResult(data)
    } catch (error) {
      setOcrTestResult({ error: 'Test failed', message: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setTesting(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Azure Computer Vision Test</h1>
        
        {/* Step 1: Check Configuration */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Step 1: Check Configuration</h2>
          <button
            onClick={checkConfig}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Checking...' : 'Check Azure Configuration'}
          </button>
          
          {configStatus && (
            <div className="mt-4">
              {configStatus.azure_configured ? (
                <div className="flex items-start gap-2 text-green-700 bg-green-50 p-3 rounded">
                  <CheckCircle className="h-5 w-5 mt-0.5" />
                  <div>
                    <p className="font-semibold">✅ Azure is configured!</p>
                    <p className="text-sm mt-1">Endpoint: {configStatus.endpoint_starts_with}...</p>
                    <p className="text-sm">Key: {configStatus.key_starts_with}... ({configStatus.key_length} chars)</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 text-red-700 bg-red-50 p-3 rounded">
                  <XCircle className="h-5 w-5 mt-0.5" />
                  <div>
                    <p className="font-semibold">❌ Azure not configured</p>
                    <p className="text-sm mt-1">Endpoint: {configStatus.has_endpoint ? 'Set' : 'Missing'}</p>
                    <p className="text-sm">Key: {configStatus.has_key ? 'Set' : 'Missing'}</p>
                    <p className="text-sm mt-2">{configStatus.message}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Step 2: Test OCR */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Step 2: Test OCR with PDF</h2>
          <label className="block">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors">
              <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">Click to upload PDF to test OCR</p>
              <input
                type="file"
                className="hidden"
                accept=".pdf"
                onChange={testOCR}
                disabled={testing}
              />
            </div>
          </label>
          
          {testing && (
            <div className="mt-4 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-gray-600">Testing Azure OCR...</p>
            </div>
          )}
          
          {ocrTestResult && (
            <div className="mt-4">
              {ocrTestResult.success ? (
                <div className="bg-green-50 border border-green-200 p-4 rounded">
                  <h3 className="font-semibold text-green-800 mb-2">✅ OCR Test Successful!</h3>
                  <div className="text-sm space-y-1">
                    <p>Status: {ocrTestResult.status}</p>
                    <p>Pages processed: {ocrTestResult.pageCount}</p>
                    <p>Text extracted: {ocrTestResult.textLength} characters</p>
                    {ocrTestResult.preview && (
                      <div className="mt-2">
                        <p className="font-semibold">Preview:</p>
                        <pre className="bg-white p-2 rounded text-xs overflow-x-auto">
                          {ocrTestResult.preview}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 p-4 rounded">
                  <h3 className="font-semibold text-red-800 mb-2">❌ OCR Test Failed</h3>
                  <div className="text-sm space-y-1">
                    <p>Error: {ocrTestResult.error}</p>
                    {ocrTestResult.status && <p>Status Code: {ocrTestResult.status}</p>}
                    {ocrTestResult.diagnosis && (
                      <div className="mt-2 p-2 bg-red-100 rounded">
                        <p className="font-semibold">Diagnosis:</p>
                        <p>{ocrTestResult.diagnosis}</p>
                      </div>
                    )}
                    {ocrTestResult.errorDetail && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-red-700">Show error details</summary>
                        <pre className="mt-1 text-xs bg-white p-2 rounded overflow-x-auto">
                          {JSON.stringify(ocrTestResult.errorDetail, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Troubleshooting Guide
          </h2>
          <div className="text-sm space-y-2">
            <p><strong>If configuration check fails:</strong></p>
            <ol className="list-decimal list-inside ml-2 space-y-1">
              <li>Go to Vercel Dashboard → Your Project → Settings → Environment Variables</li>
              <li>Ensure these are set:
                <ul className="list-disc list-inside ml-4 mt-1">
                  <li><code className="bg-blue-100 px-1 rounded">AZURE_COMPUTER_VISION_KEY</code></li>
                  <li><code className="bg-blue-100 px-1 rounded">AZURE_COMPUTER_VISION_ENDPOINT</code></li>
                </ul>
              </li>
              <li>Redeploy from Vercel dashboard after adding variables</li>
            </ol>
            
            <p className="mt-3"><strong>If OCR test fails with 401:</strong></p>
            <ul className="list-disc list-inside ml-2">
              <li>Your API key is incorrect. Copy it again from Azure Portal → Computer Vision → Keys</li>
            </ul>
            
            <p className="mt-3"><strong>If OCR test fails with 404:</strong></p>
            <ul className="list-disc list-inside ml-2">
              <li>Your endpoint URL is incorrect. It should look like:</li>
              <li><code className="bg-blue-100 px-1 rounded">https://YOUR-RESOURCE.cognitiveservices.azure.com/</code></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}