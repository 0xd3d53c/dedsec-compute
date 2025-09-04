import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    // Verify the request is from Vercel Cron (optional security check)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient()
    
    // Call the scheduled maintenance function
    const { data, error } = await (await supabase).rpc('scheduled_maintenance')

    if (error) {
      console.error('Database maintenance error:', error)
      return NextResponse.json(
        { error: 'Maintenance failed', details: error.message },
        { status: 500 }
      )
    }

    console.log('Database maintenance completed:', data)
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results: data
    })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request)
}
