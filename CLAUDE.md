# Contract Revenue App

A Next.js application for extracting revenue recognition data from contract documents using AI, with enhanced support for implicit contract language and scanned PDFs.

## Project Overview
- **Technology Stack**: Next.js 15, TypeScript, Prisma, Tailwind CSS, OpenAI API, Google Cloud Vision API
- **Database**: PostgreSQL (configured in Prisma schema)
- **Purpose**: Upload contract documents (including scanned PDFs), extract key financial data using AI, and calculate revenue recognition schedules

## Key Features Implemented
- Enhanced file upload for contract documents (PDF, Word)
- **Advanced AI-powered extraction** with implicit language understanding
- **Professional OCR** using Google Cloud Vision API for scanned PDFs
- Database storage of contracts, milestones, and revenue items
- Revenue recognition calculations
- Web interface for viewing and editing contract data

## Enhanced AI Capabilities
The AI extraction has been significantly enhanced to handle **implicit contract language**:

### Example Input:
"We anticipate support will be required during the months of August, September, October, November, and December 2025. Professional fees associated with the Client Project's scope of services will be $100,000, billed in four consecutive monthly installments of $25,000, beginning in August 2025 and continuing through November 2025."

### Expected AI Extraction:
- **Contract Value**: $100,000
- **Start Date**: 2025-08-01
- **End Date**: 2025-12-31
- **Milestones**: 4 payments of $25,000 each (Aug, Sep, Oct, Nov 2025)
- **Payment Schedule**: Monthly installments with potential extension

### AI Enhancement Features:
- **Implicit Date Parsing**: "August through December 2025" → converts to explicit start/end dates
- **Payment Schedule Intelligence**: "four consecutive monthly installments" → creates individual milestones
- **Context-Aware Dates**: Understands current date context for relative date interpretation
- **Smart Contract Value Calculation**: Infers total values from payment descriptions

## Document Processing Capabilities

### 1. Text-Based PDFs
- Direct text extraction using pdf2json
- Fast and reliable for digitally created PDFs

### 2. Scanned PDFs (OCR)
- **Google Cloud Vision API** integration
- High-accuracy OCR for scanned contracts
- Handles complex layouts, tables, multi-column text
- Processes up to 10 pages per document
- Cost: ~$1.50 per 1000 pages (first 1000/month free)

### 3. Word Documents
- Full text extraction using mammoth
- Reliable processing of .docx and .doc files

## Database Schema
- **Contract**: Main entity storing contract details (value, dates, client info)
- **Milestone**: Contract milestones with values and due dates
- **RevenueItem**: Individual revenue recognition entries with amounts and dates

## Development Commands
- `npm run dev`: Start development server on port 3002
- `npm run build`: Build for production (includes Prisma generate)
- `npm run lint`: Run ESLint
- Database setup available via `/api/setup-db` and `/api/migrate-db` endpoints
- API key test: `/api/test-openai-key`

## File Structure
- `src/app/`: Next.js app router pages and API routes
- `src/components/`: React components (file-upload, contract-editor, revenue-calculator)
- `src/lib/`: Utility modules (AI extraction, PDF processing, Prisma client)
  - `ai-extractor.ts`: Enhanced OpenAI integration with implicit language understanding
  - `pdf-processor.ts`: PDF/Word processing with OCR capabilities
- `prisma/`: Database schema and development database

## Environment Variables Required

### Vercel Production Environment:
1. **OPENAI_API_KEY**: Your OpenAI API key (starts with sk-...)
2. **GOOGLE_APPLICATION_CREDENTIALS_JSON**: Full JSON content of Google Cloud service account key
3. **DATABASE_URL**: PostgreSQL connection string

### Local Development (.env):
```env
DATABASE_URL="your-local-postgres-url"
OPENAI_API_KEY="your-openai-api-key-here"
GOOGLE_APPLICATION_CREDENTIALS_JSON='{"type": "service_account", ...}'
```

## Current Deployment Status
- **Platform**: Vercel
- **URL**: https://contract-revenue-processor-7tvz.vercel.app/
- **Status**: Live and accessible
- **Features Working**: Word document processing with enhanced AI extraction
- **In Progress**: Google Cloud Vision API setup for scanned PDF OCR

## Serverless Architecture Notes

### Challenges Addressed:
- **Cold Start Issues**: Functions "sleep" after 15 minutes of inactivity
- **Memory Pressure**: Heavy OCR libraries can exceed serverless limits
- **Timeout Limits**: 10-second default on Vercel free tier
- **Canvas/DOM Dependencies**: Many OCR libraries don't work in Node.js serverless

### Solutions Implemented:
- **Google Cloud Vision API**: Serverless-compatible professional OCR
- **Dynamic Imports**: Prevent build-time dependency issues
- **Graceful Error Handling**: Fallbacks for processing failures
- **Resource Optimization**: Limited page processing to prevent timeouts

## Troubleshooting

### AI Extraction Issues:
1. Verify "Use AI Extraction" checkbox is checked
2. Check OpenAI API key in Vercel environment variables
3. Use `/api/test-openai-key` endpoint to verify API connectivity

### PDF Processing Issues:
1. **Text-based PDFs**: Should work with pdf2json extraction
2. **Scanned PDFs**: Requires Google Cloud Vision API setup
3. **Fallback**: Convert to Word document for guaranteed processing

### Serverless Function Issues:
- Check Vercel function logs for cold start timing
- Monitor memory usage in function execution
- Consider upgrading Vercel plan for longer timeouts

## Google Cloud Vision API Setup

### Required Steps:
1. **Create Google Cloud Project**
   - Go to https://console.cloud.google.com/
   - Create new project or select existing
   - Enable Vision API

2. **Create Service Account**
   - IAM & Admin → Service Accounts
   - Create Service Account
   - Assign "Vision API User" role
   - Create and download JSON key

3. **Configure Vercel**
   - Add environment variable: `GOOGLE_APPLICATION_CREDENTIALS_JSON`
   - Paste entire JSON file contents as value

### Pricing:
- First 1000 pages/month: FREE
- Additional pages: ~$1.50 per 1000 pages
- Excellent value for business contract processing

## Next Steps
1. **Complete Google Cloud Vision API setup** for scanned PDF OCR
2. Test OCR functionality with sample scanned contracts
3. Enhance UI to display extracted contract data more clearly
4. Implement contract editing and review interface
5. Add revenue recognition calculations display
6. Create contract management dashboard
7. Add data export capabilities

## Development Session Notes
- **Enhanced AI extraction working perfectly** with Word documents
- **Serverless compatibility issues resolved** using appropriate libraries
- **Google Cloud Vision API implemented** for professional OCR
- **Comprehensive error handling** and fallback mechanisms in place