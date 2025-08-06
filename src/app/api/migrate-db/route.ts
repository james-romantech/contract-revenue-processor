import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    console.log('Creating database tables...')
    
    // Use Prisma's raw SQL to create tables based on our schema
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Contract" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "filename" TEXT NOT NULL,
        "originalText" TEXT,
        "status" TEXT NOT NULL DEFAULT 'processing',
        "contractValue" DECIMAL,
        "startDate" TIMESTAMP(3),
        "endDate" TIMESTAMP(3),
        "clientName" TEXT,
        "description" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Milestone" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "contractId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "value" DECIMAL NOT NULL,
        "dueDate" TIMESTAMP(3),
        "completed" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "RevenueItem" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "contractId" TEXT NOT NULL,
        "amount" DECIMAL NOT NULL,
        "recognitionDate" TIMESTAMP(3) NOT NULL,
        "type" TEXT NOT NULL,
        "description" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `
    
    console.log('Database tables created successfully')
    
    // Test that tables exist now
    const contractCount = await prisma.contract.count()
    const milestoneCount = await prisma.milestone.count()
    const revenueCount = await prisma.revenueItem.count()
    
    return NextResponse.json({
      success: true,
      message: 'Database tables created successfully!',
      tables: {
        contracts: contractCount,
        milestones: milestoneCount,
        revenueItems: revenueCount
      }
    })
    
  } catch (error) {
    console.error('Migration error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Database migration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}