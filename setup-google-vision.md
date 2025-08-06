# Google Cloud Vision API Setup for ContractSync AI

## Step-by-Step Configuration

### 1. Prepare Your JSON Key
Open the downloaded JSON file in a text editor. It should look like:
```json
{
  "type": "service_account",
  "project_id": "contractsync-ai",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "contractsync-ocr@contractsync-ai.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

### 2. Add to Vercel Environment Variables

1. Go to your Vercel Dashboard: https://vercel.com/dashboard
2. Click on your `contract-revenue-processor` project
3. Go to **Settings** → **Environment Variables**
4. Add a new variable:
   - **Key**: `GOOGLE_APPLICATION_CREDENTIALS_JSON`
   - **Value**: Copy and paste the ENTIRE JSON file content (including the curly braces)
   - **Environment**: Select all (Production, Preview, Development)
5. Click **Save**

### 3. Update the PDF Processor Code

The code needs to read the credentials from the environment variable: