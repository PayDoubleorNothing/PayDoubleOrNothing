-- Supabase Database Setup for Double or Nothing Stats
-- Run this SQL in your Supabase SQL Editor

-- Table 1: Global Stats (single row)
CREATE TABLE IF NOT EXISTS global_stats (
  id INTEGER PRIMARY KEY DEFAULT 1,
  total_bets BIGINT DEFAULT 0,
  total_wagered DECIMAL(20, 8) DEFAULT 0,
  wins BIGINT DEFAULT 0,
  losses BIGINT DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Insert initial row if it doesn't exist
INSERT INTO global_stats (id, total_bets, total_wagered, wins, losses)
VALUES (1, 0, 0, 0, 0)
ON CONFLICT (id) DO NOTHING;

-- Table 2: Game History
CREATE TABLE IF NOT EXISTS game_history (
  id BIGSERIAL PRIMARY KEY,
  result VARCHAR(4) NOT NULL CHECK (result IN ('win', 'loss')),
  amount DECIMAL(20, 8) NOT NULL,
  player_wallet VARCHAR(44),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_game_history_timestamp ON game_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_game_history_result ON game_history(result);

-- Enable Row Level Security (RLS) - Allow public read, but only server can write
ALTER TABLE global_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_history ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read global_stats
CREATE POLICY "Allow public read access to global_stats"
  ON global_stats FOR SELECT
  USING (true);

-- Policy: Anyone can read game_history
CREATE POLICY "Allow public read access to game_history"
  ON game_history FOR SELECT
  USING (true);

-- Policy: Only authenticated requests can insert (we'll use service role key in API)
-- For now, allow inserts from API (service role key bypasses RLS)
-- Note: In production, you should use service role key in server-side code only

-- Optional: Create a view for recent games
CREATE OR REPLACE VIEW recent_games AS
SELECT 
  result,
  amount,
  player_wallet,
  timestamp
FROM game_history
ORDER BY timestamp DESC
LIMIT 20;
