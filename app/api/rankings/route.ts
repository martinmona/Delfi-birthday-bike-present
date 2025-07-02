import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const rankings = await prisma.ranking.findMany({
      orderBy: [
        { score: 'desc' },
        { createdAt: 'asc' }
      ],
      take: 50
    })

    return NextResponse.json(rankings)
  } catch (error) {
    console.error('Error fetching rankings:', error)
    return NextResponse.json({ error: 'Failed to fetch rankings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, score } = await request.json()
    
    if (!name || typeof score !== 'number') {
      return NextResponse.json({ error: 'Name and score are required' }, { status: 400 })
    }    
    if (score <= 0) {
      return NextResponse.json({ error: 'Score must be greater than 0' }, { status: 400 })
    }    
    if (name.length > 50) {
      return NextResponse.json({ error: 'Name too long' }, { status: 400 })
    }

    const ranking = await prisma.ranking.create({
      data: {
        name: name.trim().substring(0, 50),
        score: score
      }
    })

    return NextResponse.json(ranking)
  } catch (error) {
    console.error('Error saving ranking:', error)
    return NextResponse.json({ error: 'Failed to save ranking' }, { status: 500 })
  }
}
