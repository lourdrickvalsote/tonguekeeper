# TongueKeeper

**Every language is a universe of thought. We keep them alive.**

An AI-powered platform that autonomously discovers, aggregates, and cross-references endangered language content scattered across the internet — transforming fragments into a unified, searchable, living linguistic archive.

---

## The Problem

A language dies every two weeks. By 2100, UNESCO estimates half of the world's ~7,000 languages will be extinct — each taking with it centuries of irreplaceable knowledge, oral history, and cultural identity.

The resources to preserve these languages exist, but they're scattered across obscure PDFs, YouTube videos, academic papers, dictionary websites, and government archives in dozens of disconnected sources. A linguist would need months to even *find* them all, let alone cross-reference and synthesize them.

TongueKeeper deploys a swarm of AI agents that autonomously crawl the web, discover these scattered fragments, extract linguistic data — vocabulary, grammar, audio, cultural context — and synthesize everything into a unified, searchable archive. In minutes, not months.

---

## How It Works

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐    ┌─────────────┐
│  Discovery   │───▶│    Crawl     │───▶│  Extraction  │───▶│ Cross-Reference │───▶│   Archive   │
│              │    │             │    │              │    │                 │    │             │
│ Perplexity   │    │ Cheerio     │    │ Claude AI    │    │ Claude AI       │    │ Elastic     │
│ BrightData   │    │ Stagehand   │    │ Vision API   │    │ Merge & verify  │    │ Jina embed  │
│ SERP API     │    │ BrightData  │    │ PDF parsing  │    │ Deduplication   │    │ Semantic    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────────┘    └─────────────┘
```

1. **Discovery** — AI agents search across Perplexity Sonar and BrightData SERP API with 6-tier dynamic queries (core terms, native names, alternate names, contact languages, country-specific, language family), generating up to 24 targeted queries per language

2. **Crawl** — Each discovered source is fetched through a 3-tier cascade: specialized crawlers (YouTube, Wikipedia, ELAR, dictionaries) → BrightData Web Unlocker (CAPTCHA bypass) → Cheerio/Stagehand (headless browser). PDFs are parsed with text extraction or Claude Vision for scanned documents

3. **Extraction** — Claude processes each source in a manual tool-use loop, extracting structured vocabulary entries (headword, definitions, IPA, conjugations, morphology, examples) and grammar patterns (9 categories) into Elasticsearch

4. **Cross-Reference** — A second Claude agent searches for duplicate entries across sources, merging definitions, examples, and cross-references while calculating reliability scores based on source count

5. **Archive** — All data flows into Elasticsearch with Jina v3 embeddings (1024-dim) for semantic search, reranking, and knowledge graph generation

---

## Features

- **Multi-Agent Pipeline** — Orchestrated Discovery, Extraction, and Cross-Reference agents with real-time event streaming via Socket.io
- **Real-Time Dashboard** — Split-panel UI with live agent activity feed and a 200-event ring buffer for late-joining clients
- **Semantic Search** — Elasticsearch multi-match queries with Jina AI embeddings and reranking for vocabulary and grammar patterns
- **Knowledge Graph** — Force-directed graph visualization (react-force-graph-2d) with 3 edge types: related terms, semantic clusters, and embedding similarity
- **Grammar Reference** — Browsable grammar patterns across 9 categories (verb conjugation, particles, sentence structure, honorifics, negation, questions, phonological rules, morphological rules)
- **Language Browser** — 5,352 endangered languages from Glottolog CLDF with filtering by endangerment status, macroarea, language family, and speaker count
- **Interactive Maps** — Leaflet maps with marker, heatmap, and choropleth modes showing global language endangerment
- **Audio Pipeline** — YouTube audio extraction with Whisper transcription (RunPod serverless), word-level timestamps, and pronunciation avatar generation (HeyGen)
- **PDF & Scan Extraction** — Text extraction via pdf-parse with automatic Vision API fallback for scanned/degraded documents
- **Adaptive Web Crawling** — Domain-specific crawlers with BrightData Web Unlocker for geo-blocked and CAPTCHA-protected sources

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 16, React 19, Tailwind CSS 4, shadcn/ui, Framer Motion, socket.io-client |
| **Visualization** | react-force-graph-2d, Leaflet + react-leaflet, Recharts, D3.js |
| **Backend** | Express 5, Socket.io, Node.js (tsx runtime) |
| **AI Agents** | Anthropic Claude (Haiku 4.5 + Sonnet 4.5), manual tool-use loops |
| **Search & Discovery** | Perplexity Sonar API, BrightData SERP API + Web Unlocker |
| **Embeddings** | Jina AI v3 (embeddings) + v2 (reranking) |
| **Data Store** | Elasticsearch 9 (serverless) — vocabulary, grammar, languages, pipeline runs |
| **Web Crawling** | Cheerio, Browserbase + Stagehand, pdf-parse, pdfjs-dist |
| **Audio/ML** | Python FastAPI, RunPod (Whisper transcription), HeyGen (avatar videos) |
| **Infrastructure** | Vercel (frontend), Cloudflare Workers (R2 storage + KV cache) |
| **Validation** | TypeScript 5 (strict), Zod 4 |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Browser (:3000)                       │
│  Next.js 16 App Router  ·  React 19  ·  Socket.io Client    │
└────────────┬──────────────────────────────┬──────────────────┘
             │ HTTP (API Routes)            │ WebSocket
             ▼                              ▼
┌────────────────────────┐    ┌────────────────────────────────┐
│   Next.js API Routes   │    │   Express + Socket.io (:3001)  │
│                        │    │                                │
│  /api/search           │    │  Pipeline Orchestrator         │
│  /api/grammar          │    │  Discovery Agent               │
│  /api/languages        │    │  Extraction Agent              │
│  /api/graph            │    │  Cross-Reference Agent         │
│  /api/preserve ────────┼───▶│  Enrichment Agent              │
│                        │    │  Event Emitter (ring buffer)   │
└────────┬───────────────┘    └──────┬─────────────────────────┘
         │                           │
         ▼                           ▼
┌────────────────────┐    ┌────────────────────────────────────┐
│  Elasticsearch 9   │    │   Python FastAPI (:3003)           │
│  (Serverless)      │    │                                    │
│                    │    │   YouTube audio extraction         │
│  vocabulary        │    │   Whisper transcription (RunPod)   │
│  grammar_patterns  │    │   Word-level timestamps            │
│  languages (5,352) │    └────────────────────────────────────┘
│  language_resources│
│  pipeline_runs     │
└────────────────────┘
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+ (for ML service)
- npm

### Install

```bash
git clone https://github.com/your-username/tonguekeeper.git
cd tonguekeeper
npm install --legacy-peer-deps
```

### Environment Variables

Create a `.env.local` file in the project root:

| Variable | Required | Description |
|---|---|---|
| `ELASTIC_URL` | Yes | Elasticsearch cluster URL |
| `ELASTIC_API_KEY` | Yes | Elasticsearch API key |
| `ANTHROPIC_API_KEY` | Yes | Claude API key (agents) |
| `PERPLEXITY_API_KEY` | Yes | Perplexity Sonar API key (discovery search) |
| `JINA_API_KEY` | Yes | Jina AI key (embeddings + reranking) |
| `NEXT_PUBLIC_WS_URL` | No | WebSocket server URL (default: `http://localhost:3001`) |
| `BROWSERBASE_API_KEY` | No | Browserbase API key (headless browsing) |
| `BROWSERBASE_PROJECT_ID` | No | Browserbase project ID |
| `BRIGHTDATA_API_TOKEN` | No | BrightData API token (SERP + Web Unlocker) |
| `CLOUDFLARE_WORKER_URL` | No | Cloudflare Worker URL (R2 storage + KV cache) |
| `HEYGEN_API_KEY` | No | HeyGen API key (pronunciation avatar videos) |
| `ML_SERVICE_URL` | No | Python ML service URL (default: `http://localhost:3003`) |
| `RUNPOD_API_KEY` | No | RunPod API key (Whisper GPU transcription) |
| `RUNPOD_ENDPOINT_ID` | No | RunPod endpoint ID |

### Data Setup

Ingest the Glottolog CLDF dataset (5,352 endangered languages) and generate map data:

```bash
npm run setup:data
```

### Run

```bash
# Start all services (Next.js + WebSocket server + ML service)
npm run dev:all

# Or start individually:
npm run dev       # Next.js frontend on :3000
npm run server    # WebSocket server on :3001
npm run ml        # Python ML service on :3003
```

Open [http://localhost:3000](http://localhost:3000) to see the dashboard.

---

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Next.js dev server (port 3000) |
| `npm run server` | Start WebSocket server (port 3001) |
| `npm run ml` | Start Python ML service (port 3003) |
| `npm run dev:all` | Start all 3 services concurrently |
| `npm run build` | Build Next.js for production |
| `npm run setup:data` | Full data setup: ingest Glottolog + generate maps + prescan |
| `npm run ingest:glottolog` | Import Glottolog CLDF into Elasticsearch |
| `npm run generate:map` | Generate map visualization data |
| `npm run prescan` | Pre-compute language statistics |
| `npm run backup` | Backup Elasticsearch indices |
| `npm run restore` | Restore Elasticsearch from backup |
| `npm run reindex` | Reindex with custom analyzers |
| `npm run lint` | Run ESLint |

---

## Project Structure

```
tonguekeeper/
├── app/                        # Next.js App Router
│   ├── (main)/dashboard/       # Preservation dashboard
│   ├── (main)/languages/       # Language browser + detail pages
│   ├── (splash)/               # Landing page
│   └── api/                    # 22 API routes
├── components/                 # React components
│   ├── agent-feed/             # Real-time agent event stream
│   ├── search/                 # Archive search interface
│   ├── graph/                  # Knowledge graph (force-directed)
│   ├── grammar/                # Grammar pattern reference
│   ├── languages/              # Language browser, map, filters
│   ├── results/                # Vocabulary & grammar cards
│   ├── dashboard/              # Stats bar, welcome view
│   └── ui/                     # shadcn/ui primitives
├── lib/                        # Core business logic
│   ├── agents/                 # AI agent implementations
│   ├── crawlers/               # Site-specific crawlers
│   ├── apis/                   # External API clients
│   ├── elastic.ts              # Elasticsearch client
│   ├── types.ts                # Shared TypeScript types
│   └── graph.ts                # Knowledge graph generation
├── server/                     # Express + Socket.io server
│   ├── ws-server.ts            # Server entry point
│   ├── orchestrator.ts         # Pipeline coordinator
│   ├── agents/                 # Server-side agent wrappers
│   └── utils/                  # Event emitter, semaphore, schemas
├── ml/                         # Python FastAPI (audio processing)
├── scripts/                    # CLI scripts (setup, backup, ingest)
├── infra/                      # Cloudflare Workers (R2 + KV)
└── docs/                       # Project documentation
```

---

## Built With

| Sponsor | Integration |
|---|---|
| **Anthropic** | Claude Haiku 4.5 + Sonnet 4.5 power the extraction, cross-reference, and enrichment agents |
| **BrightData** | SERP API for geo-targeted search from inside countries; Web Unlocker for CAPTCHA-protected archives |
| **Browserbase** | Stagehand headless browser for JavaScript-heavy dictionary sites |
| **Jina AI** | v3 embeddings (1024-dim) for semantic search; v2 reranker for result quality |
| **Elastic** | Serverless Elasticsearch for vocabulary, grammar, languages, and pipeline data |
| **HeyGen** | Avatar video generation for pronunciation demonstrations |
| **Cloudflare** | R2 object storage for pipeline artifacts; KV for query caching |
| **RunPod** | Serverless GPU for Whisper audio transcription |

---

*Built for [TreeHacks 2026](https://www.treehacks.com/) at Stanford University.*
