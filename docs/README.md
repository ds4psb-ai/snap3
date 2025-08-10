# Snap3 Documentation

## Overview

Snap3 is a content analysis and trend discovery platform built with Next.js, Supabase, and AI-powered insights.

## Features

- **Content Analysis**: Analyze URLs, text, and files for insights
- **Trend Discovery**: Identify and track content trends
- **AI-Powered Insights**: Generate recommendations and insights using LLM
- **Real-time Collaboration**: Real-time updates and collaboration features
- **Vector Search**: Semantic search using embeddings

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI**: shadcn/ui, Tailwind CSS, Lucide Icons
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **AI**: OpenAI GPT-4, Embeddings
- **State Management**: Zustand, React Query
- **Validation**: Zod

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account
- OpenAI API key

### Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see `.env.local`)
4. Run the development server: `npm run dev`

### Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE=your_service_role_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key
```

## Project Structure

```
snap3/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # API routes
│   │   └── (routes)/       # Page routes
│   ├── components/         # React components
│   └── lib/               # Utility functions
├── data/                  # Static data
├── scripts/               # Database scripts
└── docs/                  # Documentation
```

## API Endpoints

- `GET/POST /api/trends` - Trend management
- `POST /api/input/url` - URL processing
- `POST /api/input/text` - Text processing
- `POST /api/input/upload/presign` - File upload
- `POST /api/snap/analyze` - Content analysis
- `GET/POST /api/snap/recommend/[vdpId]` - Recommendations
- `POST /api/clone` - Content cloning
- `GET/PUT/DELETE /api/vdp/[id]` - VDP management
- `POST /api/embed-meta` - Meta extraction
- `POST /api/relations/autolink` - Auto-linking
- `POST /api/relations/[id]/approve` - Relation approval

## Database Schema

### Tables

- `vdps` - Virtual Data Pages
- `trends` - Content trends
- `relations` - Content relationships
- `analyses` - Content analyses
- `embeddings` - Vector embeddings

## Development

### Running Locally

```bash
npm run dev
```

### Database Seeding

```bash
npm run seed
```

### Building for Production

```bash
npm run build
npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License





