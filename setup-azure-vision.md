# Azure Computer Vision Setup for ContractSync AI

## Quick Setup Guide (10 minutes)

### Step 1: Create Azure Account (Free)
1. Go to https://azure.microsoft.com/free/
2. Click "Start free"
3. Sign up with Microsoft account (or create one)
4. You get **$200 credit** for 30 days + **12 months of free services**
5. Credit card required but won't be charged

### Step 2: Create Computer Vision Resource
1. Go to Azure Portal: https://portal.azure.com/
2. Click **"Create a resource"** (+ icon)
3. Search for **"Computer Vision"**
4. Click **"Computer Vision"** from results
5. Click **"Create"**

### Step 3: Configure the Resource
Fill in these settings:
- **Subscription**: Your subscription (likely "Free Trial")
- **Resource group**: Click "Create new" → Name it `contractsync-rg`
- **Region**: Choose closest to you (e.g., `East US`)
- **Name**: `contractsync-vision` (must be unique)
- **Pricing tier**: Select **F0 (Free)** - 5,000 transactions/month

Click **"Review + create"** → **"Create"**

Wait ~30 seconds for deployment to complete.

### Step 4: Get Your Credentials
1. Once deployed, click **"Go to resource"**
2. In left sidebar, click **"Keys and Endpoint"**
3. You'll see:
   - **KEY 1**: Your API key (looks like: a1b2c3d4e5f6...)
   - **Endpoint**: Your endpoint URL (looks like: https://contractsync-vision.cognitiveservices.azure.com/)
4. Copy both values

### Step 5: Add to Vercel Environment Variables
1. Go to Vercel Dashboard: https://vercel.com/dashboard
2. Click on your project
3. Go to **Settings** → **Environment Variables**
4. Add these two variables:

   **Variable 1:**
   - Key: `AZURE_COMPUTER_VISION_KEY`
   - Value: Your KEY 1 from Step 4
   - Environment: All (Production, Preview, Development)

   **Variable 2:**
   - Key: `AZURE_COMPUTER_VISION_ENDPOINT`
   - Value: Your Endpoint URL from Step 4
   - Environment: All (Production, Preview, Development)

5. Click **"Save"** for each variable

### Step 6: Redeploy Your App
1. Go to **"Deployments"** tab in Vercel
2. Click the **"..."** menu on the latest deployment
3. Click **"Redeploy"**
4. Click **"Redeploy"** in the confirmation dialog

## Testing Your Setup

After redeployment (2-3 minutes):
1. Go to https://contractsync.ai/
2. Upload a **scanned PDF** contract
3. Should see "Azure Computer Vision OCR successful!" in logs
4. AI extraction should work on the scanned document!

## Free Tier Limits
- **5,000 transactions per month** (plenty for testing and small business use)
- **20 calls per minute** rate limit
- Supports PDFs up to **50 MB**
- Processes up to **2000 pages**

## Monitoring Usage
1. Go to Azure Portal
2. Navigate to your Computer Vision resource
3. Click **"Metrics"** in left sidebar
4. View your usage and remaining quota

## Troubleshooting

### "401 Unauthorized" error
- Double-check your API key is copied correctly
- Ensure no extra spaces in the key
- Try using KEY 2 if KEY 1 doesn't work

### "404 Not Found" error
- Verify the endpoint URL is exact (including https://)
- Make sure it ends with a slash if shown in Azure

### OCR not working
- PDFs must be under 50MB
- For best results, use 300 DPI scans
- Ensure good contrast and clarity

## Features You Get with Azure Computer Vision
- ✅ High-accuracy OCR for scanned documents
- ✅ Handwriting recognition (limited)
- ✅ Multi-language support (70+ languages)
- ✅ Table and form extraction
- ✅ Maintains reading order
- ✅ Works perfectly in serverless environment
- ✅ 5,000 pages/month FREE

## Cost After Free Tier
- First 5,000 transactions/month: **FREE**
- After 5,000: ~$1 per 1,000 transactions
- Most small businesses never exceed free tier

## Next Steps
Once OCR is working:
1. Test with various scanned contracts
2. Monitor usage in Azure Portal
3. Consider upgrading to S1 tier if you need more volume ($1/1000 transactions)