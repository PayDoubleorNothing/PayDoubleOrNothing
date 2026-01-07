# Double or Nothing

A modern 50/50 Solana coin flip game with automatic payouts and live global statistics.

## ✨ Features

- **50/50 Fair Odds** - Transparent game logic
- **2x Multiplier** - Double your bet on win, 0% house edge
- **Solana Integration** - Phantom & Solflare wallet support
- **Live Statistics** - Global bets, wins, and losses tracking
- **Responsive Design** - Optimized for desktop and mobile
- **Modern UI** - Clean, minimalist interface

## 🚀 Quick Start

```bash
# Clone repository
git clone https://github.com/PayDoubleorNothing/PayDoubleOrNothing.git
cd PayDoubleOrNothing

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Run development server
npm run dev
```

Visit `http://localhost:3000` to see the app.

## ⚙️ Configuration

### Required Environment Variables

```env
NEXT_PUBLIC_BANK_WALLET_ADDRESS=your_wallet_address
BANK_WALLET_ADDRESS=your_wallet_address
BANK_PRIVATE_KEY=your_private_key

SOLANA_RPC_ENDPOINT=your_rpc_endpoint
NEXT_PUBLIC_SOLANA_RPC_ENDPOINT=your_rpc_endpoint

NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

### Database Setup

Run `supabase-setup.sql` in your Supabase SQL Editor. See `SUPABASE_SETUP.md` for details.

## 🛠️ Tech Stack

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Solana Web3.js** - Blockchain integration
- **Supabase** - Database & real-time stats

## 📦 Deployment

### Netlify / Vercel

1. Connect your GitHub repository
2. Add environment variables in dashboard
3. Deploy automatically on push

## 🔒 Security

- Never commit `.env.local` with real keys
- Keep `BANK_PRIVATE_KEY` secret (server-side only)
- Use service role key for Supabase writes only

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details.

---

Built with Claude Opus 4 by Anthropic
