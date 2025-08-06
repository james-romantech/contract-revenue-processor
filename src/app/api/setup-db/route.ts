import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    console.log('Setting up database...')
    
    // Test database connection
    await prisma.$connect()
    console.log('Database connected successfully')
    
    // Check if tables exist by trying to count records
    const contractCount = await prisma.contract.count()
    console.log(`Contract table exists with ${contractCount} records`)
    
    const milestoneCount = await prisma.milestone.count()
    console.log(`Milestone table exists with ${milestoneCount} records`)
    
    const revenueCount = await prisma.revenueItem.count()
    console.log(`RevenueItem table exists with ${revenueCount} records`)
    
    return NextResponse.json({
      success: true,
      message: 'Database is set up correctly',
      tables: {
        contracts: contractCount,
        milestones: milestoneCount,
        revenueItems: revenueCount
      }
    })
    
  } catch (error) {
    console.error('Database setup error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Database setup failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      suggestion: 'You may need to run: npx prisma db push'
    }, { status: 500 })
  }
}