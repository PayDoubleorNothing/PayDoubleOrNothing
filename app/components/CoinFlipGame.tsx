'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { useConnection } from '@solana/wallet-adapter-react'
import { 
  PublicKey, 
  Transaction, 
  SystemProgram, 
  LAMPORTS_PER_SOL 
} from '@solana/web3.js'

type GameResult = 'win' | 'loss' | null

interface GameHistoryItem {
  result: 'win' | 'loss'
  amount: number
  timestamp: number
}

interface Stats {
  totalBets: number
  totalWagered: number
  wins: number
  losses: number
}

// Bank Wallet Address - Set via environment variable or replace here
const BANK_WALLET_ADDRESS = process.env.NEXT_PUBLIC_BANK_WALLET_ADDRESS || 'YOUR_BANK_WALLET_ADDRESS_HERE'

export default function CoinFlipGame() {
  const { connected, publicKey, sendTransaction } = useWallet()
  const { setVisible } = useWalletModal()
  const { connection } = useConnection()
  
  const [isSpinning, setIsSpinning] = useState(false)
  const [gameResult, setGameResult] = useState<GameResult>(null)
  const [landedSide, setLandedSide] = useState<'DOUBLE' | 'NOTHING' | null>(null)
  const [shouldPulse, setShouldPulse] = useState(false)
  const [betAmount, setBetAmount] = useState('0.1')
  const [bankLiquidity, setBankLiquidity] = useState<number>(0)
  const [isLoadingLiquidity, setIsLoadingLiquidity] = useState(true)
  const [transactionStatus, setTransactionStatus] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const spinStartTimeRef = useRef<number>(0)
  
  // Game history and stats
  const [gameHistory, setGameHistory] = useState<GameHistoryItem[]>([])
  const [stats, setStats] = useState<Stats>({ totalBets: 0, totalWagered: 0, wins: 0, losses: 0 })

  // Fetch global stats from API
  const fetchGlobalStats = useCallback(async () => {
    try {
      const response = await fetch('/api/stats')
      const data = await response.json()
      
      if (data.gameHistory) {
        setGameHistory(data.gameHistory.slice(0, 10)) // Show last 10
      }
      
      setStats({
        totalBets: data.totalBets || 0,
        totalWagered: data.totalWagered || 0,
        wins: data.wins || 0,
        losses: data.losses || 0,
      })
    } catch (error) {
      console.error('Failed to fetch global stats:', error)
    }
  }, [])

  // Load global stats on mount and poll every 5 seconds
  useEffect(() => {
    fetchGlobalStats()
    const interval = setInterval(fetchGlobalStats, 5000) // Poll every 5 seconds
    return () => clearInterval(interval)
  }, [fetchGlobalStats])

  // Save game result to global stats API
  const saveGameResult = useCallback(async (result: 'win' | 'loss', amount: number) => {
    try {
      await fetch('/api/stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          result,
          amount,
          playerWallet: publicKey?.toString(),
        }),
      })
      
      // Refresh stats immediately
      fetchGlobalStats()
    } catch (error) {
      console.error('Failed to save game result:', error)
    }
  }, [publicKey, fetchGlobalStats])

  // Fetch bank liquidity
  const fetchBankLiquidity = useCallback(async () => {
    try {
      setIsLoadingLiquidity(true)
      
      // Check if we have a valid bank wallet address
      if (BANK_WALLET_ADDRESS === 'YOUR_BANK_WALLET_ADDRESS_HERE') {
        setBankLiquidity(100) // Default value for demo
        setIsLoadingLiquidity(false)
        return
      }
      
      const bankPubkey = new PublicKey(BANK_WALLET_ADDRESS)
      const balance = await connection.getBalance(bankPubkey)
      const solBalance = balance / LAMPORTS_PER_SOL
      setBankLiquidity(solBalance)
    } catch (error) {
      console.error('Failed to fetch bank liquidity:', error)
      setBankLiquidity(0)
    } finally {
      setIsLoadingLiquidity(false)
    }
  }, [connection])

  // Fetch liquidity on mount and periodically
  useEffect(() => {
    fetchBankLiquidity()
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchBankLiquidity, 30000)
    return () => clearInterval(interval)
  }, [fetchBankLiquidity])

  // Calculate max bet (10% of bank liquidity)
  const maxBet = bankLiquidity * 0.1

  // Auto-fill bet amount with max bet when liquidity is loaded
  const hasSetInitialBet = useRef(false)
  useEffect(() => {
    if (!isLoadingLiquidity && maxBet > 0 && !hasSetInitialBet.current) {
      // Set to max bet, rounded to 4 decimal places
      const suggestedBet = Math.floor(maxBet * 10000) / 10000
      setBetAmount(suggestedBet.toString())
      hasSetInitialBet.current = true
    }
  }, [isLoadingLiquidity, maxBet])
  const betAmountNum = Number(betAmount) || 0
  const isBetTooHigh = betAmountNum > maxBet && maxBet > 0
  const potentialWin = betAmountNum * 2

  // Handle wallet connect
  const handleConnectWallet = () => {
    setVisible(true)
  }

  // Play the game
  const playGame = async () => {
    if (isSpinning || !connected || !publicKey || !betAmount || betAmountNum <= 0) return
    if (isBetTooHigh) {
      setErrorMessage(`Max bet is ${maxBet.toFixed(4)} SOL (10% of bank liquidity)`)
      return
    }

    setErrorMessage('')
    setTransactionStatus('Preparing transaction...')

    try {
      // Check if we have a valid bank wallet address
      if (BANK_WALLET_ADDRESS === 'YOUR_BANK_WALLET_ADDRESS_HERE') {
        // Demo mode - skip actual transaction
        setTransactionStatus('Demo mode - starting game...')
        startSpinAnimation()
        
        // Simulate API call
        setTimeout(async () => {
          const result = Math.random() < 0.5 ? 'win' : 'loss'
          finishGame(result as GameResult)
        }, 3500)
        return
      }

      const bankPubkey = new PublicKey(BANK_WALLET_ADDRESS)
      const lamports = Math.floor(betAmountNum * LAMPORTS_PER_SOL)

      // Create transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: bankPubkey,
          lamports,
        })
      )

      // Get latest blockhash
      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = publicKey

      setTransactionStatus('Please approve the transaction...')

      // Send transaction
      const signature = await sendTransaction(transaction, connection)
      
      // Start spinning immediately after user approves
      setTransactionStatus('Transaction sent, confirming...')
      startSpinAnimation()

      // Play sound
      const audio = new Audio('/flip.mp3')
      audio.play().catch(err => console.log('Audio playback failed:', err))

      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(signature, 'confirmed')
      
      if (confirmation.value.err) {
        throw new Error('Transaction failed')
      }

      setTransactionStatus('Transaction confirmed! Determining result...')

      // Call backend API to determine result (with timeout)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 25000) // 25 second timeout

      try {
        const response = await fetch('/api/play', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            signature,
            playerWallet: publicKey.toString(),
            betAmount: betAmountNum,
          }),
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        const data = await response.json()
      
        if (!response.ok) {
          throw new Error(data.error || 'Failed to determine result')
        }

        // Wait for animation to complete before showing result
        const elapsedTime = Date.now() - spinStartTimeRef.current
        const remainingTime = Math.max(0, 3500 - elapsedTime)
        
        setTimeout(() => {
          finishGame(data.result as GameResult)
          setTransactionStatus('')
        }, remainingTime)

      } catch (fetchError: any) {
        clearTimeout(timeoutId)
        if (fetchError.name === 'AbortError') {
          // Timeout - but transaction was sent, so assume it might have worked
          setTransactionStatus('Response timeout - check your wallet for result')
          setTimeout(() => {
            setIsSpinning(false)
            setTransactionStatus('')
          }, 3000)
          return
        }
        throw fetchError
      }

    } catch (error: any) {
      console.error('Game error:', error)
      setIsSpinning(false)
      setTransactionStatus('')
      
      if (error.message?.includes('User rejected')) {
        setErrorMessage('Transaction cancelled')
      } else {
        setErrorMessage(error.message || 'Transaction failed')
      }
    }
  }

  const startSpinAnimation = () => {
    setIsSpinning(true)
    setGameResult(null)
    setLandedSide(null)
    spinStartTimeRef.current = Date.now()
  }

  const finishGame = (result: GameResult) => {
    const finalSide: 'DOUBLE' | 'NOTHING' = result === 'win' ? 'DOUBLE' : 'NOTHING'
    
    setIsSpinning(false)
    setLandedSide(finalSide)
    setGameResult(result)
    
    // Save to history
    if (result) {
      saveGameResult(result, betAmountNum)
    }
    
    // Pulse coin animation when result is shown
    setShouldPulse(true)
    setTimeout(() => {
      setShouldPulse(false)
    }, 2000)

    // Refresh bank liquidity after game
    fetchBankLiquidity()
  }

  // Format SOL display
  const formatSol = (amount: number) => {
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`
    }
    return amount.toFixed(2)
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center relative overflow-hidden px-4 sm:px-6" style={{ backgroundColor: '#fafafa' }}>
      {/* Animated dots background */}
      <div 
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: 'radial-gradient(circle, #c084fc 1.5px, transparent 1.5px)',
          backgroundSize: '50px 50px',
          animation: 'moveDots 30s linear infinite',
        }}
      />

      {/* Navbar - Top Left */}
      <nav 
        className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20 flex items-center gap-3 sm:gap-5"
        style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
        }}
      >
        <a 
          href="#" 
          className="text-[11px] sm:text-xs text-gray-500 hover:text-gray-800 transition-colors duration-200 font-medium"
          target="_blank"
          rel="noopener noreferrer"
        >
          Buy Token
        </a>
        <a 
          href="https://x.com" 
          className="text-[11px] sm:text-xs text-gray-500 hover:text-gray-800 transition-colors duration-200 font-medium"
          target="_blank"
          rel="noopener noreferrer"
        >
          X Community
        </a>
        <a 
          href="https://github.com/khoa955383nguyen-commits/doubleornothing" 
          className="text-[11px] sm:text-xs text-gray-500 hover:text-gray-800 transition-colors duration-200 font-medium"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
      </nav>

      {/* Last Results - Top Right Corner */}
      {gameHistory.length > 0 && (
        <div 
          className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20"
          style={{
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
          }}
        >
          <div className="text-[10px] sm:text-xs text-gray-400 mb-1 text-right">Last Results</div>
          <div className="flex gap-1 justify-end">
            {gameHistory.slice(0, 8).map((game, i) => (
              <div
                key={game.timestamp}
                className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${
                  game.result === 'win' ? 'bg-green-400' : 'bg-red-400'
                }`}
                style={{ opacity: 1 - (i * 0.1) }}
                title={`${game.result === 'win' ? 'Won' : 'Lost'} ${game.amount.toFixed(2)} SOL`}
              />
            ))}
          </div>
        </div>
      )}
      
      <div className="text-center px-4 sm:px-10 py-6 sm:py-10 relative z-10 w-full max-w-lg">
        <h1 className="text-[#1d1d1f] text-2xl sm:text-4xl md:text-5xl font-semibold mb-2 sm:mb-4 tracking-tight" style={{ 
          letterSpacing: '-0.5px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
        }}>
          Double or Nothing
        </h1>

        {/* Bank Liquidity & Stats Display */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mb-8 sm:mb-16">
          <div className="flex items-center gap-2">
            <div
              className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-500"
              style={{
                animation: 'pulseDot 2s ease-in-out infinite',
                boxShadow: '0 0 8px rgba(34, 197, 94, 0.6)',
              }}
            />
            <span
              className="text-xs sm:text-sm text-gray-600 font-medium"
              style={{
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
                letterSpacing: '-0.2px',
              }}
            >
              {isLoadingLiquidity ? (
                'Loading...'
              ) : (
                `Bank: ${formatSol(bankLiquidity)} SOL`
              )}
            </span>
          </div>
          
          {stats.totalBets > 0 && (
            <>
              <span className="text-gray-300 hidden sm:inline">•</span>
              <span
                className="text-xs sm:text-sm text-gray-400 font-medium"
                style={{
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
                  letterSpacing: '-0.2px',
                }}
              >
                Total Bets: {stats.totalBets}
              </span>
              <span className="text-gray-300 hidden sm:inline">•</span>
              <span
                className="text-xs sm:text-sm text-gray-400 font-medium"
                style={{
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
                  letterSpacing: '-0.2px',
                }}
              >
                {stats.wins}W / {stats.losses}L
              </span>
            </>
          )}
        </div>

        {/* Coin Scene */}
        <div className="w-[240px] h-[240px] sm:w-[320px] sm:h-[320px] md:w-[400px] md:h-[400px] mx-auto mb-8 sm:mb-16 relative" style={{ perspective: '1000px' }}>
          <div 
            className="w-full h-full relative"
            style={{ 
              transform: 'rotateX(20deg) rotateY(-20deg)',
              transformStyle: 'preserve-3d'
            }}
          >
            {/* Enhanced shadow behind coin */}
            <div 
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(0, 0, 0, 0.15) 0%, rgba(0, 0, 0, 0.08) 40%, transparent 70%)',
                filter: 'blur(20px)',
                transform: 'translateY(20px) translateZ(-50px) scale(1.2)',
                opacity: isSpinning ? 0.8 : 1,
                transition: 'opacity 0.3s ease',
              }}
            />
            {/* Coin */}
            <div
              className={`absolute inset-0 ${isSpinning ? 'animate-rotate-coin' : ''}`}
              style={{
                transformStyle: 'preserve-3d',
                transition: !isSpinning ? 'transform 0.6s cubic-bezier(0.33, 0.01, 0.25, 1)' : 'none',
                ...(!isSpinning && landedSide && {
                  transform: landedSide === 'DOUBLE' ? 'rotateY(0deg)' : 'rotateY(180deg)'
                }),
              }}
            >
              {/* Side A: 1.png (DOUBLE) */}
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  transform: 'rotateY(0deg) translateZ(5px)',
                  backfaceVisibility: 'hidden',
                }}
              >
                <Image
                  src="/1.png"
                  alt="Double"
                  width={400}
                  height={400}
                  className="w-full h-full object-contain"
                  sizes="(max-width: 640px) 240px, (max-width: 768px) 320px, 400px"
                  unoptimized
                  style={{
                    ...(shouldPulse && !isSpinning && landedSide === 'DOUBLE' && {
                      animation: 'pulseCoin 2s ease-in-out',
                    }),
                  }}
                  onError={(e) => {
                    const target = e.target as HTMLElement
                    if (target.parentElement) {
                      target.parentElement.innerHTML = '<div style="font-size:24px;color:#808080;font-weight:bold;">Double or Nothing</div>'
                    }
                  }}
                />
              </div>

              {/* Side B: 2.png (NOTHING) */}
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  transform: 'rotateY(180deg) translateZ(5px)',
                  backfaceVisibility: 'hidden',
                }}
              >
                <Image
                  src="/2.png"
                  alt="Nothing"
                  width={400}
                  height={400}
                  className="w-full h-full object-contain"
                  sizes="(max-width: 640px) 240px, (max-width: 768px) 320px, 400px"
                  unoptimized
                  style={{
                    ...(shouldPulse && !isSpinning && landedSide === 'NOTHING' && {
                      animation: 'pulseCoin 2s ease-in-out',
                    }),
                  }}
                  onError={(e) => {
                    const target = e.target as HTMLElement
                    if (target.parentElement) {
                      target.parentElement.innerHTML = ''
                    }
                  }}
                />
              </div>
            </div>

          </div>
        </div>

        {/* Combined Bet Input & Button - Apple OS Style */}
        <div 
          className={`flex flex-col sm:flex-row items-center justify-center mt-6 sm:mt-10 bg-white border rounded-3xl sm:rounded-full overflow-hidden shadow-lg focus-within:ring-2 focus-within:ring-gray-400 focus-within:border-transparent transition-all duration-200 w-full max-w-[320px] sm:max-w-none sm:w-auto mx-auto ${isBetTooHigh ? 'border-red-400' : 'border-gray-300'}`}
          style={{
            boxShadow: '0 2px 8px 0 rgba(0, 0, 0, 0.08)',
          }}
        >
          {/* Bet Amount Input */}
          <div className="relative flex items-center w-full sm:w-auto">
            <Image
              src="/solana.png"
              alt="SOL"
              width={16}
              height={16}
              className="absolute left-4 sm:left-5 pointer-events-none z-10 w-4 h-4 sm:w-5 sm:h-5"
              unoptimized
            />
            <input
              type="number"
              value={betAmount}
              onChange={(e) => {
                const value = e.target.value
                if (value === '' || (!isNaN(Number(value)) && Number(value) >= 0)) {
                  setBetAmount(value)
                  setErrorMessage('')
                }
              }}
              onBlur={(e) => {
                const numValue = Number(e.target.value)
                if (numValue <= 0 || isNaN(numValue)) {
                  setBetAmount('0.1')
                }
              }}
              disabled={isSpinning}
              placeholder="0.1"
              className="bg-transparent border-none py-3 sm:py-5 pl-9 sm:pl-10 pr-4 sm:pr-5 text-base sm:text-lg font-medium text-gray-900 w-full sm:w-32 text-center focus:outline-none disabled:text-gray-400 disabled:cursor-not-allowed"
              style={{
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
                letterSpacing: '0.3px',
              }}
              min="0.001"
              step="0.1"
            />
          </div>

          {/* Divider */}
          <div className="w-full sm:w-px h-px sm:h-8 bg-gray-300" />

          {/* Wallet Connect / Flip Button */}
          {!connected ? (
            <button
              onClick={handleConnectWallet}
              className="relative bg-transparent hover:bg-gray-50 active:bg-gray-100 border-none py-3 sm:py-5 px-6 sm:px-8 text-sm sm:text-lg font-semibold cursor-pointer text-gray-900 transition-all duration-200 tracking-wide w-full sm:w-auto"
              style={{ 
                letterSpacing: '0.3px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
              }}
            >
              Connect Wallet
            </button>
          ) : (
            <button
              onClick={playGame}
              disabled={isSpinning || !betAmount || betAmountNum <= 0 || isBetTooHigh}
              className="relative bg-transparent hover:bg-gray-50 active:bg-gray-100 disabled:bg-transparent disabled:cursor-not-allowed border-none py-3 sm:py-5 px-4 sm:px-8 text-sm sm:text-lg font-semibold cursor-pointer text-gray-900 transition-all duration-200 tracking-wide disabled:text-gray-400 disabled:hover:bg-transparent w-full sm:w-auto whitespace-nowrap"
              style={{ 
                letterSpacing: '0.3px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
              }}
            >
              {isSpinning 
                ? 'Spinning...'
                : betAmountNum > 0 
                  ? `Double (${(potentialWin).toFixed(2)}) or Nothing`
                  : 'Double or Nothing'
              }
            </button>
          )}
        </div>

        {/* Transaction Status / Error Messages */}
        <div className="mt-3 sm:mt-4 min-h-[20px] sm:min-h-[24px] px-2">
          {transactionStatus && (
            <p className="text-xs sm:text-sm text-gray-600 font-medium" style={{
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
            }}>
              {transactionStatus}
            </p>
          )}
          {errorMessage && (
            <p className="text-xs sm:text-sm text-red-500 font-medium" style={{
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
            }}>
              {errorMessage}
            </p>
          )}
          {isBetTooHigh && !errorMessage && (
            <p className="text-xs sm:text-sm text-red-500 font-medium" style={{
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
            }}>
              Max bet: {maxBet.toFixed(4)} SOL (10% of liquidity)
            </p>
          )}
        </div>

        {/* Result Display */}
        <div className="mt-4 sm:mt-6 min-h-[36px] sm:min-h-[40px] flex items-center justify-center">
          {gameResult && !isSpinning && (
            <div 
              className={`flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full ${
                gameResult === 'win' 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}
              style={{
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
              }}
            >
              <span className={`text-xs sm:text-sm font-medium ${
                gameResult === 'win' ? 'text-green-600' : 'text-red-600'
              }`}>
                {gameResult === 'win' 
                  ? `Won +${potentialWin.toFixed(2)} SOL` 
                  : `Lost -${betAmountNum.toFixed(2)} SOL`
                }
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div 
        className="absolute bottom-4 left-0 right-0 text-center z-10"
        style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
        }}
      >
        <p className="text-[10px] sm:text-xs text-gray-400">
          Provably Fair • 50/50 Odds • Open Source
        </p>
        <p className="text-[10px] sm:text-xs text-gray-300 mt-0.5">
          Built with Claude Opus 4 by Anthropic
        </p>
      </div>
    </div>
  )
}
