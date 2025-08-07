# AWS Textract Setup for ContractSync AI

## Quick Setup Guide (10 minutes)

### Step 1: Create AWS Account
1. Go to https://aws.amazon.com/
2. Click "Create an AWS Account"
3. Follow the signup process (credit card required but won't be charged for light usage)

### Step 2: Create IAM User for Textract
1. Go to AWS Console: https://console.aws.amazon.com/
2. Search for **"IAM"** in the top search bar
3. Click **"IAM"** (Identity and Access Management)
4. In left sidebar, click **"Users"**
5. Click **"Create user"** button
6. Enter username: `contractsync-textract`
7. Click **"Next"**

### Step 3: Set Permissions
1. Select **"Attach policies directly"**
2. Search for: `TextractFullAccess`
3. Check the box next to **"AmazonTextractFullAccess"**
4. Click **"Next"**
5. Click **"Create user"**

### Step 4: Create Access Keys
1. Click on your new user `contractsync-textract`
2. Go to **"Security credentials"** tab
3. Scroll down to **"Access keys"**
4. Click **"Create access key"**
5. Select **"Application running outside AWS"**
6. Check the confirmation box
7. Click **"Next"**
8. Add description: `ContractSync AI OCR`
9. Click **"Create access key"**
10. **IMPORTANT**: Save these credentials:
    - **Access key ID**: (looks like: AKIA...)
    - **Secret access key**: (looks like: wJal...)
11. Click **"Done"**

### Step 5: Add to Vercel Environment Variables
1. Go to Vercel Dashboard: https://vercel.com/dashboard
2. Click on your project
3. Go to **Settings** → **Environment Variables**
4. Add these three variables:

   **Variable 1:**
   - Key: `AWS_ACCESS_KEY_ID`
   - Value: Your Access key ID from Step 4
   - Environment: All (Production, Preview, Development)

   **Variable 2:**
   - Key: `AWS_SECRET_ACCESS_KEY`
   - Value: Your Secret access key from Step 4
   - Environment: All (Production, Preview, Development)

   **Variable 3:**
   - Key: `AWS_REGION`
   - Value: `us-east-1`
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
3. Make sure "Use AI Extraction" is checked
4. Should see "AWS Textract OCR successful!" in logs
5. AI extraction should work on the scanned document!

## Pricing
- **First 1,000 pages/month**: $1.50
- **Next 9,000 pages**: $0.60 per 1,000
- **Typical usage**: ~$2-5/month for small business

## Troubleshooting

### "AWS credentials not configured" error
- Double-check environment variable names are exact
- Ensure no extra spaces in the keys
- Redeploy after adding variables

### "Access Denied" error
- Make sure you attached the TextractFullAccess policy
- Check that the access keys are active in IAM

### OCR not working on PDFs
- PDFs must be under 5MB for synchronous processing
- For larger PDFs, convert to Word or split into smaller files

## Features You Get with Textract
- ✅ High-accuracy OCR for scanned documents
- ✅ Table extraction (great for payment schedules)
- ✅ Form field detection (perfect for contracts)
- ✅ Key-value pair extraction
- ✅ Maintains reading order
- ✅ Works in serverless environment

## Next Steps
Once OCR is working:
1. Test with various scanned contracts
2. Monitor usage in AWS Console
3. Consider adding S3 for large file processing (>5MB)
4. Optimize pages processed based on your needs