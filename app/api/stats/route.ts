import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'

interface GameHistoryItem {
  result: 'win' | 'loss'
  amount: number
  timestamp: number
  playerWallet?: string
}

interface Stats {
  totalBets: number
  totalWagered: number
  wins: number
  losses: number
  gameHistory: GameHistoryItem[]
}

// Initialize default stats
const defaultStats: Stats = {
  totalBets: 0,
  totalWagered: 0,
  wins: 0,
  losses: 0,
  gameHistory: [],
}

// Read stats from Supabase
async function readStats(): Promise<Stats> {
  try {
    // Get global stats (single row with id = 1)
    const { data: statsData, error: statsError } = await supabase
      .from('global_stats')
      .select('*')
      .eq('id', 1)
      .single()

    if (statsError && statsError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error reading stats:', statsError)
      return defaultStats
    }

    // Get recent game history
    const { data: historyData, error: historyError } = await supabase
      .from('game_history')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(100)

    if (historyError) {
      console.error('Error reading history:', historyError)
    }

    const gameHistory: GameHistoryItem[] = (historyData || []).map((item: any) => ({
      result: item.result,
      amount: item.amount,
      timestamp: new Date(item.timestamp).getTime(),
      playerWallet: item.player_wallet,
    }))

    if (statsData) {
      return {
        totalBets: statsData.total_bets || 0,
        totalWagered: statsData.total_wagered || 0,
        wins: statsData.wins || 0,
        losses: statsData.losses || 0,
        gameHistory,
      }
    }

    return { ...defaultStats, gameHistory }
  } catch (error) {
    console.error('Failed to read stats:', error)
    return defaultStats
  }
}

// Write stats to Supabase
async function writeStats(stats: Stats): Promise<void> {
  try {
    // Upsert global stats (update or insert) - use admin client for write access
    const { error: statsError } = await supabaseAdmin
      .from('global_stats')
      .upsert({
        id: 1,
        total_bets: stats.totalBets,
        total_wagered: stats.totalWagered,
        wins: stats.wins,
        losses: stats.losses,
        updated_at: new Date().toISOString(),
      })

    if (statsError) {
      console.error('Error writing stats:', statsError)
      throw statsError
    }
  } catch (error) {
    console.error('Failed to write stats:', error)
    throw error
  }
}

// GET - Fetch global stats
export async function GET() {
  try {
    const stats = await readStats()
    
    // Return only last 20 games for history
    const recentHistory = stats.gameHistory.slice(0, 20)
    
    return NextResponse.json({
      ...stats,
      gameHistory: recentHistory,
    })
  } catch (error: any) {
    console.error('Failed to read stats:', error)
    return NextResponse.json(defaultStats)
  }
}

// POST - Update stats with new game result
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { result, amount, playerWallet } = body

    if (!result || !amount || (result !== 'win' && result !== 'loss')) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      )
    }

    const stats = await readStats()
    
    // Add new game to history table - use admin client for write access
    const { error: historyError } = await supabaseAdmin
      .from('game_history')
      .insert({
        result,
        amount: Number(amount),
        player_wallet: playerWallet || null,
        timestamp: new Date().toISOString(),
      })

    if (historyError) {
      console.error('Error inserting game history:', historyError)
      // Continue anyway - stats update is more important
    }
    
    // Update stats
    const updatedStats: Stats = {
      totalBets: stats.totalBets + 1,
      totalWagered: stats.totalWagered + Number(amount),
      wins: stats.wins + (result === 'win' ? 1 : 0),
      losses: stats.losses + (result === 'loss' ? 1 : 0),
      gameHistory: stats.gameHistory, // Will be fetched on next read
    }

    await writeStats(updatedStats)

    // Fetch updated history
    const finalStats = await readStats()

    return NextResponse.json({
      success: true,
      stats: finalStats,
    })
  } catch (error: any) {
    console.error('Failed to update stats:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update stats' },
      { status: 500 }
    )
  }
}
