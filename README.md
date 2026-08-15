# Pokermon

Mobile website for the house poker cage: track buy-ins, cash out chips, settle who pays whom, keep night history, and rank the table.

Anyone with the URL can **watch**. Editing a live game needs the **4-digit PIN** set when that night was created.

## Stack

Next.js, Tailwind, Drizzle, Neon Postgres. Deploy on Vercel.

## Setup

1. Create a free [Neon](https://neon.tech) project and copy the connection string.
2. Copy env and fill it in:

```bash
cp .env.example .env.local
```

```
DATABASE_URL=postgresql://...
SESSION_SECRET=a-long-random-string
```

3. Push schema and seed regulars (Murli, Chirag, Ankush, Rohit Yadav, Buddha, Aakarshit, Jai, Chinmay):

```bash
npm run db:push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## What it does

- Create a game: players, ₹ buy-in, chip stack, PIN
- Live table: `+` / `−` buy-ins (PIN to edit; `−` confirms)
- Refresh button (no live polling)
- Cash out with a chip-conservation check
- Settlement receipt: net P/L + fewest UPI transfers, copy / WhatsApp
- History of settled nights and a lifetime leaderboard

Math matches the Bachatt sheet: `Money Diff = (Final − Buyins × Stack) × (Buy-in ₹ / Stack)`.
