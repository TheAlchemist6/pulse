# Pulse - CLAUDE.md

## Project Overview

Pulse is a YouTube subscription management and organization service. It helps users organize their YouTube subscriptions into categories, get insights into their viewing habits, and discover dead/inactive channels.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: NextAuth.js v5 (beta) with Google OAuth2 (YouTube)
- **Styling**: Tailwind CSS with shadcn/ui components
- **AI**: Anthropic Claude API for subscription categorization
- **Deployment**: Railway

## Project Structure

```
pulse/
├── src/
│   ├── app/
│   │   ├── (app)/           # Authenticated app routes
│   │   │   ├── categories/
│   │   │   ├── dashboard/
│   │   │   ├── settings/
│   │   │   ├── subscriptions/
│   │   │   ├── triage/
│   │   │   └── welcome/
│   │   ├── (auth)/           # Authentication routes
│   │   │   └── signin/
│   │   ├── api/              # API routes
│   │   │   ├── auth/
│   │   │   ├── categories/
│   │   │   ├── export/
│   │   │   ├── import/
│   │   │   ├── insights/
│   │   │   ├── profile/
│   │   │   ├── subscriptions/
│   │   │   └── sync/
│   │   ├── (marketing)/     # Marketing pages (privacy, terms)
│   │   ├── layout.tsx
│   │   └── page.tsx
│   └── lib/
│       ├── db/
│       │   ├── index.ts      # Database connection
│       │   └── schema.ts     # Drizzle schema definitions
│       ├── auth.ts           # NextAuth configuration
│       ├── youtube.ts        # YouTube API helpers
│       ├── sync-pipeline.ts  # Sync logic
│       └── import-pipeline.ts
├── drizzle/                  # Database migrations
├── drizzle.config.ts         # Drizzle configuration
└── railway.toml              # Railway deployment config
```

## Database Schema

### Tables

- **users** - User accounts with YouTube OAuth data
- **channel_metadata** - YouTube channel information
- **user_subscriptions** - User's subscriptions with AI categorization
- **user_categories** - User-defined category organization
- **channel_scores** - Watch history analysis
- **override_log** - Track category override history

## Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production

# Database
npm run db:generate      # Generate Drizzle migrations
npm run db:migrate       # Run migrations
npm run db:push          # Push schema to database
npm run db:studio        # Open Drizzle Studio

# Linting
npm run lint             # Run ESLint
```

## Environment Variables

```
NEXTAUTH_URL            # Auth callback URL
NEXTAUTH_SECRET         # Auth secret key
GOOGLE_CLIENT_ID        # Google OAuth client ID
GOOGLE_CLIENT_SECRET    # Google OAuth client secret
DATABASE_URL            # PostgreSQL connection string
ANTHROPIC_API_KEY       # Claude API key
TOKEN_ENCRYPTION_KEY    # OAuth token encryption key
```

## Key Implementation Details

### Authentication Flow
1. User signs in with "Sign in with Google"
2. OAuth tokens (access + refresh) stored encrypted in database
3. Tokens auto-refreshed when expired
4. Sessions managed via NextAuth.js

### Sync Pipeline
1. Fetch user's YouTube subscriptions via YouTube Data API
2. Update channel_metadata with latest info
3. Analyze new subscriptions with AI
4. Categorize and rank subscriptions

### AI Categorization
- Claude analyzes channel content and metadata
- Assigns primary/secondary categories
- Provides confidence scores and reasoning
- Users can override AI categorization

## Railway Deployment

The `railway.toml` file configures:
- Build command: `npm run build`
- Start command: `npm start`
- Health check on `/`
- All environment variables from Railway project settings

## Development Notes

- The schema is defined in `src/lib/db/schema.ts`
- Migrations are generated to `drizzle/` folder
- Use `npx drizzle-kit push` for quick schema changes during development
- Marketing pages (privacy policy, ToS) are in `src/app/(marketing)/`
