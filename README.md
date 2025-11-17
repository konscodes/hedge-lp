# Hedge LP Dashboard

A comprehensive Next.js dashboard for managing and tracking delta-hedged liquidity pool strategies. This application helps you monitor dual-token LP positions (e.g., BNB/ASTER) hedged with perpetual futures on platforms like Hyperliquid.

## 🚀 Features

- **Multi-Strategy Management**: Create and manage multiple hedged LP strategies simultaneously
- **Dual-Token LP Support**: Track LP positions with two volatile tokens (e.g., BNB/ASTER)
- **Dual Hedge Positions**: Monitor separate hedge positions for each token in your LP
- **Real-time Calculations**: 
  - LP state (token amounts, value, delta)
  - Target hedge positions
  - Combined P&L (LP + Hedge - Funding)
  - Liquidation buffer calculations
  - Hedge quality score
- **Snapshot Logging**: Manually log snapshots of your strategy state over time
- **Visual Analytics**:
  - Range visualization showing current price within LP bounds
  - Charts for P&L, funding costs, fees, and hedge quality over time
  - Capital allocation visualization
- **Rebalance Suggestions**: 
  - Hedge rebalancing based on price moves and delta drift
  - Cross-position rebalancing suggestions (moving capital between LP and hedge)
- **Auto-calculated Metrics**:
  - Total margin used (sum of individual positions)
  - Total funding paid (sum of individual positions)
  - LP fees in USD
  - Strategy P&L and percentage returns

## 🛠️ Tech Stack

- **Next.js 16** with App Router and TypeScript
- **shadcn/ui** - Modern UI component library
- **Tailwind CSS** - Utility-first CSS framework
- **Prisma** - Type-safe ORM
- **SQLite** - Lightweight database (local development) + **Turso** (hosted SQLite for Vercel deployment)
- **Recharts** - Charting library for data visualization
- **Lucide React** - Icon library

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- For production deployment: Vercel account (recommended) or similar platform

## 🏃 Getting Started

### Local Development

1. **Clone the repository**:
```bash
git clone https://github.com/konscodes/hedge-lp.git
cd hedge-lp
```

2. **Install dependencies**:
```bash
npm install
```

3. **Set up environment variables**:
```bash
cp .env.example .env
```

Edit `.env` and set your `DATABASE_URL`:
```env
DATABASE_URL="file:./prisma/dev.db"
```

4. **Set up the database**:
```bash
npm run db:generate
npm run db:migrate
```

5. **Start the development server**:
```bash
npm run dev
```

6. **Open your browser**:
Navigate to [http://localhost:3000](http://localhost:3000)

### Database Management

- **Generate Prisma Client**: `npm run db:generate`
- **Run migrations**: `npm run db:migrate`
- **Open Prisma Studio** (database GUI): `npm run db:studio`

## 📖 Usage Guide

### Creating a Strategy

1. Click **"New Strategy"** on the home page
2. Fill in the strategy configuration:
   - **Basic Info**: 
     - Strategy name
     - Token1 and Token2 (e.g., BNB, ASTER)
     - LP Protocol (e.g., PancakeSwap V3)
     - Perp Venue (e.g., Hyperliquid)
     - Starting Capital (USD)
     - Open Date
   - **LP Configuration**: 
     - Price bounds (pa = lower bound, pb = upper bound)
   - **Rebalance Triggers**: 
     - Price move threshold (%)
     - Delta drift threshold (%)
     - Cross-position rebalance threshold (%)

3. Click **"Create Strategy"**

### Logging Snapshots

1. Navigate to your strategy dashboard
2. Click **"Log New Snapshot"** button (top right)
3. Fill in the accordion sections:
   - **Market Prices**: Current prices for token1, token2, and LP price
   - **LP Position**: Token amounts and cumulative fees earned
   - **Hedge Position - Token1**: Position size, entry price, leverage, margin, funding paid, liquidation price
   - **Hedge Position - Token2**: Same fields as Token1
   - **Account Metrics**: Account equity (total margin and funding are auto-calculated)

4. Click **"Save Snapshot"**

The app automatically calculates:
- LP value and P&L
- Hedge P&L for each position
- Total strategy value and P&L
- Hedge quality score
- Liquidation buffer
- Rebalance suggestions

### Viewing Analytics

- **Overview Tab**: 
  - Current LP and hedge state
  - Combined strategy metrics
  - Price range visualization
  - Liquidation buffer
  - Rebalance suggestions
  
- **Snapshots Tab**: 
  - Historical log of all snapshots
  - Edit existing snapshots
  - View detailed metrics for each snapshot
  
- **Charts Tab**: 
  - P&L over time (LP, Hedge, Combined)
  - Capital allocation trends
  - Liquidation buffer over time
  - Current capital allocation pie chart
  
- **Config Tab**: 
  - Edit strategy parameters
  - Delete strategy (with confirmation)

### Editing Snapshots

1. Navigate to the **Snapshots** tab
2. Click the **edit icon** (pencil) next to any snapshot
3. Modify the fields as needed
4. Click **"Save Snapshot"** or **"Cancel"**

The app will recalculate all derived metrics based on your changes.

## 🗄️ Database Schema

### Strategy Model
- Basic info (name, tokens, protocols)
- Starting capital and open date
- LP price bounds (pa, pb)
- Rebalance trigger thresholds

### Snapshot Model
- Market state (token prices, LP price)
- LP position state (token amounts, fees, value, P&L)
- Hedge position state (per token: size, entry, leverage, margin, funding, liquidation price)
- Account metrics (equity, margin used, funding paid - auto-calculated)
- Calculated analytics (P&L, quality score, liquidation buffer)
- Rebalance suggestions (JSON)

## 🚢 Deployment to Vercel

### Prerequisites

1. A Vercel account ([sign up here](https://vercel.com))
2. A Turso account ([sign up here](https://turso.tech)) - Free hosted SQLite

### Quick Deployment Steps

1. **Push your code to GitHub** (if not already done):
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. **Set up Turso database**:
   - Go to [turso.tech](https://turso.tech) and sign in
   - Create a new database
   - Copy the connection string (looks like `libsql://your-db.turso.io`)

3. **Import project in Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository (`konscodes/hedge-lp`)

4. **Add Environment Variable**:
   - In Vercel project settings → Environment Variables
   - Add `DATABASE_URL` with your Turso connection string
   - Make sure to add it for **Production**, **Preview**, and **Development**

5. **Deploy**:
   - Click "Deploy"
   - Vercel will automatically run Prisma migrations during build
   - Wait for deployment to complete

**That's it!** Your app will be live. No schema changes needed - Turso uses the same SQLite provider.

### Why Turso?

- ✅ **Same Prisma setup**: No code or schema changes needed
- ✅ **Free tier**: Perfect for demos and small projects  
- ✅ **Works on Vercel**: Unlike file-based SQLite, Turso works with serverless functions
- ✅ **Simple**: Just copy-paste the connection string

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

## 📁 Project Structure

```
├── app/
│   ├── api/                      # API routes
│   │   └── strategies/
│   │       ├── route.ts          # GET/POST strategies
│   │       └── [id]/
│   │           ├── route.ts      # GET/PATCH/DELETE strategy
│   │           └── snapshots/
│   │               ├── route.ts # GET/POST snapshots
│   │               └── [snapshotId]/
│   │                   └── route.ts # GET/PATCH snapshot
│   ├── strategies/[id]/         # Strategy detail pages
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Home page
│   └── globals.css              # Global styles
├── components/
│   ├── ui/                      # shadcn/ui components
│   ├── RangeVisualization.tsx   # Price range visualization
│   ├── SnapshotForm.tsx         # Snapshot creation/editing form
│   ├── StrategyCharts.tsx       # Analytics charts
│   ├── StrategyConfig.tsx       # Strategy configuration/edit
│   ├── StrategyForm.tsx        # Strategy creation form
│   ├── StrategyOverview.tsx    # Strategy overview dashboard
│   ├── StrategyOverviewButton.tsx # Snapshot button component
│   └── StrategySnapshots.tsx   # Snapshots table
├── lib/
│   ├── generated/prisma/        # Generated Prisma client
│   ├── hedgeMath.ts             # CLP math and hedging logic
│   ├── prisma.ts                # Prisma client singleton
│   └── utils.ts                 # Utility functions
├── prisma/
│   ├── migrations/              # Database migrations
│   └── schema.prisma            # Database schema
├── public/                      # Static assets
├── .env.example                 # Environment variables template
├── .gitignore                   # Git ignore rules
├── next.config.ts               # Next.js configuration
├── package.json                 # Dependencies and scripts
├── prisma.config.ts             # Prisma configuration
├── tsconfig.json                # TypeScript configuration
└── vercel.json                  # Vercel deployment configuration
```

## 🧮 Math Reference

The app uses Concentrated Liquidity Pool (CLP) mathematics:

- **Liquidity Calculation**: Computes liquidity `L` from notional value and price bounds
- **LP State**: Calculates token amounts (x, y), value, and delta at any price
- **Hedge Policy**:
  - If price >= pb: target hedge = 0 (fully out of range)
  - If price <= pa: target hedge = -delta_at_pa (at lower bound)
  - Else (inside range): target hedge = -delta(p) (neutralize LP delta)
- **Liquidation Buffer**: Minimum buffer across all hedge positions
- **Hedge Quality Score**: Measures how well hedge neutralizes LP delta exposure

## 🔒 Security Notes

- Never commit `.env` files with real credentials
- Use environment variables for sensitive data
- For production, use a proper database (Postgres) instead of SQLite
- Consider adding authentication for multi-user scenarios

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

MIT License - feel free to use this project for your own purposes.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Database management with [Prisma](https://www.prisma.io/)
- Charts powered by [Recharts](https://recharts.org/)

## 📧 Support

For issues, questions, or contributions, please open an issue on [GitHub](https://github.com/konscodes/hedge-lp/issues).
