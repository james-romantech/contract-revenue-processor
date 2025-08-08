# Azure Computer Vision Setup for Scanned PDF OCR

## Why You Need This
Your PDF appears to be scanned (image-based) with no text layer. Azure Computer Vision provides professional OCR to extract text from these scanned documents.

## Quick Setup (5 minutes)

### 1. Create Azure Account
1. Go to https://azure.microsoft.com/free/
2. Click "Start free"
3. Sign in with Microsoft account (or create one)
4. You get $200 free credits for 30 days + 12 months of free services

### 2. Create Computer Vision Resource
1. Go to Azure Portal: https://portal.azure.com
2. Click "Create a resource"
3. Search for "Computer Vision"
4. Click "Create"
5. Fill in:
   - **Resource group**: Create new → "contractsync-rg"
   - **Region**: Choose closest to you (e.g., "East US")
   - **Name**: "contractsync-vision" (or any unique name)
   - **Pricing tier**: Select "F0 (Free)" - 5,000 transactions/month free
6. Click "Review + create" → "Create"
7. Wait 1-2 minutes for deployment

### 3. Get Your Keys
1. Once deployed, click "Go to resource"
2. In left menu, click "Keys and Endpoint"
3. You'll see:
   - **KEY 1**: Copy this (e.g., `abc123def456...`)
   - **Endpoint**: Copy this (e.g., `https://contractsync-vision.cognitiveservices.azure.com/`)

### 4. Add to Vercel Environment Variables
1. Go to your Vercel project dashboard
2. Settings → Environment Variables
3. Add these two variables:
   ```
   AZURE_COMPUTER_VISION_KEY = [paste your KEY 1]
   AZURE_COMPUTER_VISION_ENDPOINT = [paste your endpoint]
   ```
4. Click "Save"

### 5. Redeploy
1. Go to Deployments tab in Vercel
2. Click "..." on latest deployment → "Redeploy"
3. Wait 1-2 minutes

## Testing
1. Go to https://contractsync.ai/debug (or your domain)
2. Upload your scanned PDF with "Use server-side processing" checked
3. You should now see extracted text from all 6 pages!

## What You Get Free
- **5,000 pages/month** of OCR (F0 Free tier)
- Professional accuracy
- Table extraction
- 70+ language support
- No credit card required for free tier

## Troubleshooting

### If OCR still doesn't work:
1. Check Vercel function logs for error messages
2. Verify environment variables are set correctly (no quotes, no spaces)
3. Make sure Azure resource is in "Succeeded" state
4. Try with a simple 1-page scanned PDF first

### Common Issues:
- **"Credentials not configured"**: Environment variables not set in Vercel
- **"401 Unauthorized"**: Wrong API key
- **"404 Not Found"**: Wrong endpoint URL
- **Timeout**: Large PDFs may take 30-50 seconds to process

## Cost After Free Tier
- First 5,000 pages/month: FREE
- After 5,000: $1.50 per 1,000 pages
- Most small businesses never exceed free tier

## Alternative: Client-Side Processing
If you can't set up Azure right now:
1. Uncheck "Use server-side processing" on the upload
2. This uses browser processing (no OCR, but no limits)
3. Works for text-based PDFs only, not scanned

## Next Steps
Once Azure is configured and working:
1. Test with your 6-page scanned contract
2. You should see all pages extracted with full text
3. AI will then analyze the contract for key terms