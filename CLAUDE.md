# Contract Revenue App

A Next.js application for extracting revenue recognition data from contract documents using AI.

## Project Overview
- **Technology Stack**: Next.js 15, TypeScript, Prisma, Tailwind CSS, OpenAI API
- **Database**: PostgreSQL (configured in Prisma schema)
- **Purpose**: Upload contract documents, extract key financial data using AI, and calculate revenue recognition schedules

## Key Features Implemented
- File upload for contract documents
- AI-powered text extraction and data parsing using OpenAI
- Database storage of contracts, milestones, and revenue items
- Revenue recognition calculations
- Web interface for viewing and editing contract data

## Database Schema
- **Contract**: Main entity storing contract details (value, dates, client info)
- **Milestone**: Contract milestones with values and due dates
- **RevenueItem**: Individual revenue recognition entries with amounts and dates

## Development Commands
- `npm run dev`: Start development server on port 3002
- `npm run build`: Build for production (includes Prisma generate)
- `npm run lint`: Run ESLint
- Database setup available via `/api/setup-db` and `/api/migrate-db` endpoints

## File Structure
- `src/app/`: Next.js app router pages and API routes
- `src/components/`: React components (file-upload, contract-editor, revenue-calculator)
- `src/lib/`: Utility modules (AI extraction, PDF processing, Prisma client)
- `prisma/`: Database schema and SQLite dev database

## Current State
- **DEPLOYED**: Live at https://contract-revenue-processor-7tvz.vercel.app/
- Basic file upload interface (drag & drop) implemented
- Supports PDF and Word document uploads
- OpenAI API integration for contract data extraction
- Simple, clean UI with file upload as primary feature
- AI-powered extraction of revenue terms and milestones functional

## Deployment Info
- **Platform**: Vercel
- **URL**: https://contract-revenue-processor-7tvz.vercel.app/
- **Status**: Live and accessible

## Next Steps
- Test the current upload and extraction functionality
- Enhance UI to show extracted contract data
- Implement contract editing and review interface
- Add revenue recognition calculations display
- Create contract management dashboard
- Add data export capabilities