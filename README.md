# ForgeStudy Platform

AI-powered study companion for Grades 6–12 students, built with Anthropic Claude.

## Features

- **Socratic AI Tutoring** — Claude-powered step-by-step guidance that teaches thinking, not just answers
- **Study Galaxy** — Force-directed graph visualization of concept mastery with spaced repetition
- **Canvas LMS Integration** — Auto-sync assignments from Canvas into study topics
- **Logic Loom** — Synthesis engine connecting mastered concepts into deeper understanding
- **The Vault** — Spaced repetition system with decay/rescue mechanics
- **Family Accounts** — One parent account manages up to 4 student profiles
- **Parent Dashboard** — Real-time study vitals, mastery tracking, and due date visibility
- **Homework Photo Drop** — Snap a photo of homework and get instant study guidance
- **Streak System** — Track consecutive study days to build habits

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| AI Engine | **Anthropic Claude** (claude-sonnet-4-6) |
| Embeddings | OpenAI text-embedding-3-small (RAG only) |
| Database | Supabase (PostgreSQL + pgvector) |
| Auth | Supabase Auth |
| Payments | Stripe |
| Styling | Tailwind CSS + shadcn/ui + Radix UI |
| Visualization | react-force-graph-2d + D3 |
| Math | KaTeX |
| Deployment | Vercel |

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase project (with pgvector extension)
- Anthropic API key
- OpenAI API key (for embeddings only)

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
ANTHROPIC_API_KEY=your_anthropic_key
OPENAI_API_KEY=your_openai_key
STRIPE_SECRET_KEY=your_stripe_key
```

### Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Database Migrations

```bash
npx supabase db push
```

## Project Structure

```
src/
├── app/              # Next.js App Router pages & API routes
│   ├── (app)/        # Protected student routes (Galaxy, Tutor, Dashboard)
│   ├── (gateway)/    # Parent/profile setup flow
│   ├── (public)/     # Login, signup, landing pages
│   └── api/          # API routes (chat, sync, streak, etc.)
├── components/       # React components
│   ├── galaxy/       # ConceptGalaxy, FocusPanel, DueSoonTray
│   ├── tutor/        # Chat interface, message rendering
│   └── ui/           # Shared shadcn/ui components
├── lib/
│   ├── ai/           # System prompts, Claude client
│   ├── lms/          # Canvas/Google Classroom adapters
│   └── vault/        # Spaced repetition logic
└── supabase/
    └── migrations/   # Database schema migrations
```

## Testing

```bash
npm test              # Jest unit tests
npm run test:smoke    # Playwright E2E tests
```

## License

Private — All rights reserved.
