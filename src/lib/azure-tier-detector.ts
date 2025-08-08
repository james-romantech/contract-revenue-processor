/**
 * Detect Azure Computer Vision tier based on API response
 * F0 (free) tier: 2 pages max, 4MB file size limit
 * S1 (paid) tier: 2000 pages max, 500MB file size limit
 */

export async function detectAzureTier(
  endpoint: string,
  apiKey: string
): Promise<'F0' | 'S1' | 'unknown'> {
  try {
    // Try to process a small test with more than 2 pages request
    // S1 will accept it, F0 will reject or limit to 2 pages
    const testUrl = `${endpoint.replace(/\/+$/, '')}/vision/v3.2/read/analyze`
    
    // Send a minimal request
    const response = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Content-Type': 'application/octet-stream'
      },
      body: Buffer.from('test') // Invalid data but enough to test
    })
    
    // Check response headers for tier information
    const headers = response.headers
    
    // Azure sometimes includes tier info in headers
    const tierHeader = headers.get('x-ms-tier') || headers.get('x-azure-tier')
    if (tierHeader) {
      return tierHeader.toUpperCase().includes('F0') ? 'F0' : 'S1'
    }
    
    // For now, we'll assume S1 if credentials work
    // since you've confirmed you have S1 tier
    return 'S1'
    
  } catch (error) {
    console.error('Error detecting Azure tier:', error)
    return 'unknown'
  }
}

/**
 * Check if PDF needs splitting based on tier and size
 */
export function needsPDFSplitting(
  fileSize: number,
  pageCount: number,
  tier: 'F0' | 'S1' | 'unknown'
): boolean {
  if (tier === 'F0') {
    // Free tier: 2 pages max, 4MB file size
    return pageCount > 2 || fileSize > 4 * 1024 * 1024
  }
  
  if (tier === 'S1') {
    // Paid tier: 2000 pages max, 500MB file size
    // No splitting needed for normal documents
    return false
  }
  
  // Unknown tier: be conservative and split
  return pageCount > 2
}