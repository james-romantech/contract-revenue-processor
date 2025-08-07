# Contract Revenue App

A Next.js application for extracting revenue recognition data from contract documents using AI, with enhanced support for implicit contract language and scanned PDFs.

## Project Overview
- **Technology Stack**: Next.js 15, TypeScript, Prisma, Tailwind CSS, OpenAI API, AWS Textract
- **Database**: PostgreSQL (configured in Prisma schema)
- **Purpose**: Upload contract documents (including scanned PDFs), extract key financial data using AI, and calculate revenue recognition schedules

## Key Features Implemented
- Enhanced file upload for contract documents (PDF, Word)
- **Advanced AI-powered extraction** with implicit language understanding
- **Professional OCR** using AWS Textract for scanned PDFs
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
- **AWS Textract** integration
- High-accuracy OCR for scanned contracts
- Handles complex layouts, tables, forms, and key-value pairs
- Processes documents up to 5MB synchronously
- Cost: ~$1.50 per 1000 pages

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
2. **AWS_ACCESS_KEY_ID**: AWS IAM access key for Textract
3. **AWS_SECRET_ACCESS_KEY**: AWS IAM secret key for Textract
4. **AWS_REGION**: AWS region (default: us-east-1)
5. **DATABASE_URL**: PostgreSQL connection string

### Local Development (.env):
```env
DATABASE_URL="your-local-postgres-url"
OPENAI_API_KEY="your-openai-api-key-here"
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_REGION="us-east-1"
```

## Current Deployment Status
- **Platform**: Vercel
- **URL**: https://contractsync.ai/
- **Custom Domain**: contractsync.ai (active)
- **Status**: Live and accessible
- **Features Working**: Word document processing with enhanced AI extraction
- **OCR Solution**: AWS Textract configured and ready

## Serverless Architecture Notes

### Challenges Addressed:
- **Cold Start Issues**: Functions "sleep" after 15 minutes of inactivity
- **Memory Pressure**: Heavy OCR libraries can exceed serverless limits
- **Timeout Limits**: 10-second default on Vercel free tier
- **Canvas/DOM Dependencies**: Many OCR libraries don't work in Node.js serverless

### Solutions Implemented:
- **AWS Textract**: Serverless-compatible professional OCR
- **Dynamic Imports**: Prevent build-time dependency issues
- **Graceful Error Handling**: Fallbacks for processing failures
- **Resource Optimization**: Synchronous processing for documents under 5MB

## Troubleshooting

### AI Extraction Issues:
1. Verify "Use AI Extraction" checkbox is checked
2. Check OpenAI API key in Vercel environment variables
3. Use `/api/test-openai-key` endpoint to verify API connectivity

### PDF Processing Issues:
1. **Text-based PDFs**: Should work with pdf2json extraction
2. **Scanned PDFs**: Uses AWS Textract for OCR
3. **Fallback**: Convert to Word document for guaranteed processing

### Serverless Function Issues:
- Check Vercel function logs for cold start timing
- Monitor memory usage in function execution
- Consider upgrading Vercel plan for longer timeouts

## AWS Textract Setup

### Required Steps:
1. **Create AWS Account**
   - Go to https://aws.amazon.com/
   - Sign up for free tier (6 months free for new accounts)
   - Credit card required but won't be charged for light usage

2. **Create IAM User**
   - Go to IAM in AWS Console
   - Create new user: `contractsync-textract`
   - Attach policy: `AmazonTextractFullAccess`
   - Create access keys for programmatic access

3. **Configure Vercel**
   - Add environment variables:
     - `AWS_ACCESS_KEY_ID`: Your access key
     - `AWS_SECRET_ACCESS_KEY`: Your secret key
     - `AWS_REGION`: us-east-1 (or your preferred region)

### Pricing:
- First 1,000 pages/month: $1.50
- Next 9,000 pages: $0.60 per 1,000
- Typical usage: ~$2-5/month for small business

## Next Steps
1. **Test AWS Textract OCR** with sample scanned contracts
2. Monitor AWS usage and costs in AWS Console
3. Enhance UI to display extracted contract data more clearly
4. Implement contract editing and review interface
5. Add revenue recognition calculations display
6. Create contract management dashboard
7. Add data export capabilities
8. Consider S3 integration for large files (>5MB)

## Development Session Notes
- **Enhanced AI extraction working perfectly** with Word documents
- **Serverless compatibility issues resolved** using appropriate libraries
- **AWS Textract implemented** for professional OCR
- **Comprehensive error handling** and fallback mechanisms in place

## Recent Updates

### Application Rebranding (Latest Session)
- **New Brand**: ContractSync AI
- **Domain**: contractsync.ai (purchased)
- **Updated App Name**: From "Contract Revenue Processor" to "ContractSync AI"
- **Enhanced Tagline**: "AI-powered contract analysis for revenue recognition and milestone tracking"
- **SEO Optimization**: Professional metadata and descriptions
- **Package Name**: Updated to `contractsync-ai`

### Custom Domain Deployment Instructions
**Ready to deploy to contractsync.ai:**

1. **Vercel Custom Domain Setup** (Recommended):
   - Go to Vercel Dashboard → Project Settings → Domains
   - Add `contractsync.ai` and `www.contractsync.ai` as custom domains
   - Vercel will provide exact DNS configuration

2. **DNS Configuration** (at domain registrar):
   - Add A record: `@` pointing to Vercel's IP (typically 76.76.19.61)
   - Add CNAME: `www` pointing to `cname.vercel-dns.com`
   - SSL certificate handled automatically by Vercel

3. **Alternative Hosting Options**:
   - Netlify, AWS Amplify, DigitalOcean App Platform, Railway
   - All support custom domains with similar setup processes

### Current Deployment Status
- **Current URL**: https://contract-revenue-processor-7tvz.vercel.app/
- **Future URL**: https://contractsync.ai/ (once DNS configured)
- **Brand Identity**: Fully updated and professional
- **Ready for Production**: Yes, pending Google Cloud Vision API setup

### Key Discussion Points from Latest Session
- **OCR Requirements**: Emphasis on scanned PDF processing for business use
- **Serverless Challenges**: Detailed explanation of why local OCR libraries fail
- **Professional OCR Solution**: Google Cloud Vision API as the optimal choice
- **Cost Considerations**: ~$1.50 per 1000 pages (first 1000/month free)
- **Business Value**: Professional accuracy for contract processing

### Technical Implementation Completed
- **Google Cloud Vision API integration** for scanned PDFs
- **pdf2json** for text-based PDFs  
- **Enhanced error handling** with graceful fallbacks
- **Professional branding** and SEO optimization
- **Custom domain preparation** for contractsync.ai

### Next Priority Actions
1. **Set up Google Cloud Vision API credentials** for scanned PDF OCR
2. **Configure custom domain** contractsync.ai in Vercel
3. **Test full end-to-end workflow** with scanned contracts
4. **Enhance UI** to better display extracted contract data
5. **Consider additional features** based on user feedback

## Latest Session Updates (After Domain Setup)

### Custom Domain Deployment
- **Domain Purchased**: contractsync.ai
- **Deployment Status**: Successfully deployed to custom domain
- **Branding Updated**: Changed from "Contract Revenue Processor" to "ContractSync AI"
- **URL**: Now live at https://contractsync.ai/

### Critical Issue Identified: Inconsistent AI Extraction

#### The Problem:
- **Word Documents**: ✅ AI extraction works perfectly every time
- **PDFs**: ❌ Fall back to basic pattern matching (no AI extraction)
- **Root Cause**: Serverless environment issues with PDF processing

#### Why It Happens:
1. **Serverless Cold Starts**: Functions sleep after ~15 minutes, causing inconsistent behavior
2. **Environment Variable Issues**: OpenAI key sometimes not available during cold starts
3. **PDF Processing Failures**: 
   - pdf2json times out on complex/scanned PDFs
   - Scanned PDFs return no extractable text
   - Placeholder text sent to AI instead of actual content

#### Solutions Implemented:
1. **Enhanced Debugging**: Added comprehensive logging to identify issues
2. **Timeout Protection**: Added 9-second timeout for PDF processing (Vercel limit is 10s)
3. **Better Error Handling**: Graceful fallbacks with helpful user messages
4. **Debug Endpoints**: 
   - `/api/test-openai-key` - Verify OpenAI API connectivity
   - `/api/debug` - Check system status and environment variables

### Google Cloud Vision OCR Implementation

#### Setup Attempted:
1. Created Google Cloud project
2. Enabled Vision API
3. Created service account with Editor role
4. **BLOCKED**: Organization policy prevents service account key creation
   - Error: `iam.disableServiceAccountKeyCreation`
   - Common in enterprise/managed Google accounts

#### Code Implementation Complete:
- Google Vision API integration fully coded
- Simplified to use Vision's native PDF processing (no image conversion needed)
- Processes first 5 pages for optimal speed/cost
- Environment variable configuration ready: `GOOGLE_APPLICATION_CREDENTIALS_JSON`

#### Alternative Solutions for OCR:
1. **Use Personal Google Account**: No organization restrictions
2. **AWS Textract**: Alternative OCR service without restrictions
3. **Azure Computer Vision**: Another enterprise-friendly option
4. **Continue with Word Documents**: Currently 100% reliable

### Current Production Status

#### What Works Perfectly:
- ✅ **Word Documents (.docx)**: Full AI extraction with implicit language understanding
- ✅ **Enhanced AI Capabilities**: Handles complex contract language
- ✅ **Custom Domain**: Live at contractsync.ai
- ✅ **OpenAI Integration**: API key verified and working

#### What Needs Resolution:
- ⚠️ **Text-based PDFs**: Sometimes work, sometimes timeout
- ❌ **Scanned PDFs**: Need OCR service (Google Vision blocked by org policy)
- ⚠️ **Serverless Reliability**: Cold starts cause inconsistent behavior

### Recommended Path Forward

#### Option 1: Focus on Word Documents (Immediate)
- Market as "Word Document Contract Processor"
- 100% reliable, no serverless issues
- All AI features work perfectly
- Users can convert PDFs to Word

#### Option 2: Set Up Alternative OCR (Short-term)
- Use personal Google account for Vision API
- Or implement AWS Textract ($1.50 per 1000 pages)
- Or use Azure Computer Vision

#### Option 3: Move Away from Serverless (Long-term)
- Deploy to dedicated server (DigitalOcean, AWS EC2)
- Eliminates timeout and cold start issues
- Allows local OCR processing
- More reliable for production use

### Technical Debt and Issues

1. **Serverless Limitations**:
   - 10-second timeout on Vercel free tier
   - Cold starts affect reliability
   - Binary dependencies don't work (Canvas, native modules)
   - Memory limitations for large files

2. **PDF Processing Challenges**:
   - pdf2json fails on complex PDFs
   - No reliable serverless OCR solution without cloud APIs
   - Scanned PDFs require external services

3. **Environment Variable Management**:
   - Sometimes not available during cold starts
   - Need to handle both OPENAI_KEY and OPENAI_API_KEY
   - Google Cloud credentials require JSON parsing

### Key Learnings

1. **Serverless is Great For**:
   - Simple, stateless operations
   - Quick deployments
   - Cost-effective hosting
   - Automatic scaling

2. **Serverless Struggles With**:
   - Heavy processing (OCR, PDF manipulation)
   - Binary dependencies
   - Long-running operations
   - Consistent performance

3. **Best Practices Discovered**:
   - Always add timeouts to prevent hanging
   - Use dynamic imports for heavy libraries
   - Implement comprehensive error handling
   - Provide clear fallback messages
   - Test with both cold and warm starts

### Session Code Statistics
- **Total Commits**: ~35
- **Files Modified**: 15+
- **Features Added**: OCR, enhanced AI, custom domain, debugging tools
- **Libraries Tested**: pdf-parse, pdfjs-dist, pdf2json, tesseract.js, pdf-poppler, sharp, @google-cloud/vision, @aws-sdk/client-textract
- **Libraries That Work in Serverless**: pdf2json, mammoth, openai, @aws-sdk/client-textract
- **Libraries That Don't Work**: pdf-parse, tesseract.js, canvas-dependent libraries

## Latest Session: AWS Textract Migration

### Background
After Google Cloud Vision API was blocked by organization policy (`iam.disableServiceAccountKeyCreation`), we migrated to AWS Textract for OCR capabilities.

### AWS Textract Implementation
1. **Packages Added**:
   - `@aws-sdk/client-textract`: AWS SDK for Textract
   - `@aws-sdk/client-s3`: For potential future S3 integration

2. **Features Implemented**:
   - Synchronous document processing (up to 5MB)
   - Table and form extraction (TABLES, FORMS features)
   - Key-value pair extraction for contracts
   - Maintains reading order through geometry sorting
   - Comprehensive error handling with fallbacks

3. **Environment Variables Required**:
   - `AWS_ACCESS_KEY_ID`: IAM user access key
   - `AWS_SECRET_ACCESS_KEY`: IAM user secret key
   - `AWS_REGION`: Region for Textract (default: us-east-1)

4. **Setup Documentation**:
   - Created `setup-aws-textract.md` with step-by-step guide
   - 10-minute setup process
   - Clear IAM permissions (AmazonTextractFullAccess)
   - No organization policy restrictions like Google Cloud

### Current Status (As of Latest Deployment)
- ✅ AWS Textract code fully implemented
- ✅ Environment variables configured in Vercel
- ✅ User upgraded Vercel plan for additional resources
- ✅ Fresh deployment triggered with commit 3f3d4dd
- ⏳ Awaiting deployment completion and testing

### Advantages of AWS Textract over Google Vision
1. **No Service Account Key Issues**: Uses simple IAM credentials
2. **Better Contract Support**: Specialized in forms and key-value extraction
3. **Simpler Setup**: No JSON key file management
4. **Direct PDF Support**: Processes PDFs without image conversion
5. **Structured Data Extraction**: Returns tables and forms as structured data

### Testing Plan
Once deployment completes:
1. Upload a scanned PDF contract to contractsync.ai
2. Ensure "Use AI Extraction" is checked
3. Verify OCR text extraction in logs
4. Confirm AI extraction works on OCR'd text
5. Monitor AWS CloudWatch for usage metrics