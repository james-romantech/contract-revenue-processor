# Contract Revenue Processor

A micro-SaaS application for automated contract analysis and revenue recognition.

## Features

- 📄 **Contract Upload**: PDF & Word document processing
- 🤖 **AI Extraction**: GPT-4 powered contract data extraction
- ✏️ **Interactive Editing**: Review and modify extracted data
- 💰 **Revenue Calculation**: 4 allocation methods (straight-line, milestone-based, percentage-complete, billed-on-achievement)
- 📊 **Forward Book Analytics**: Track contracted vs. earned revenue
- 🗄️ **Database Integration**: Persistent contract and milestone storage

## Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Add your OpenAI API key and database URL

# Initialize database
npx prisma generate
npx prisma db push

# Start development server
npm run dev
```

### Environment Variables

```bash
DATABASE_URL="your-postgresql-url"
OPENAI_API_KEY="your-openai-api-key"
NEXTAUTH_SECRET="your-secret-key"
```

### Deployment

This app is optimized for Vercel deployment:

1. Connect GitHub repo to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push

## Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL (production), SQLite (dev)
- **AI**: OpenAI GPT-4 API
- **File Processing**: pdf-parse, mammoth
- **Deployment**: Vercel

## Revenue Recognition Methods

1. **Straight-line**: Even distribution over contract period
2. **Milestone-based**: Revenue recognized at milestone completion
3. **Percentage-complete**: Progressive recognition based on completion
4. **Billed-on-achievement**: Revenue when invoiced

## API Endpoints

- `POST /api/contracts/upload` - Upload and process contracts
- Contract data automatically saved to database
- AI extraction with fallback to pattern matching

Built for consulting firms, agencies, and professional services companies needing automated contract revenue tracking.
