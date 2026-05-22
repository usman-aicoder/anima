# Anima

**You sign. AI runs everything.**

Anima is a generic AI operating system for SMEs. Five agents — Growth, Strategy, Operations, Finance, and Quality — run your business autonomously while you spend 4–6 hours a week reviewing decisions and approving escalations.

No business logic lives in agent code. All company-specific configuration (keywords, vetting rules, budgets, content strategy) lives in the World Model, populated during the onboarding interview.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Human Proxy (you)                         │
│              Dashboard · Weekly brief · Escalations              │
└────────────────────────────┬────────────────────────────────────┘
                             │ approve / decide
┌────────────────────────────▼────────────────────────────────────┐
│                      Anima Platform API                          │
│              Fastify · BullMQ workers · MongoDB                  │
└──┬──────────┬──────────┬──────────┬──────────┬──────────────────┘
   │          │          │          │          │
┌──▼──┐  ┌───▼──┐  ┌────▼──┐  ┌───▼──┐  ┌───▼────┐
│Growth│  │Ops   │  │Finance│  │Strat.│  │Quality │
│Agent │  │Agent │  │Agent  │  │Agent │  │Agent   │
└──────┘  └──────┘  └───────┘  └──────┘  └────────┘
   │          │          │          │          │
   └──────────┴──────────┴──────────┴──────────┘
                          │
              ┌───────────▼───────────┐
              │      World Model      │
              │  MongoDB · 13 colls   │
              └───────────────────────┘
```

## Quick start

```bash
npx create-anima-app
```

The scaffolder will ask for your company name, MongoDB URI, Redis URL, and Anthropic API key, then generate a ready-to-run project.

```bash
cd my-anima
docker compose up -d   # MongoDB + Redis
pnpm install
pnpm dev               # API on :3000, dashboard on :3001
```

Open the dashboard at `http://localhost:3001` and run the Strategy Agent onboarding interview. Anima will build your goal tree and agents will activate automatically.

## Packages

| Package | Description |
|---|---|
| `@anima/core` | WorldModelClient, DecisionLogger, BaseAgent, SessionManager, export/import |
| `@anima/agents` | Growth, Strategy, Operations, Finance, Quality agents (MCP servers) |
| `@anima/dashboard` | Next.js 14 dashboard — goal tree, agent status, escalations |
| `@anima/cli` | `npx create-anima-app` project scaffolder |

## Five agents

| Agent | Owns | Wake trigger |
|---|---|---|
| **Strategy** | Goal tree, weekly brief, onboarding, mission dispatch | Every 30 min (configurable) |
| **Growth** | SEO, content, leads, social | Strategy dispatch + schedule |
| **Operations** | Job assignment, provider management, quality scoring | Event-driven + dispatch |
| **Finance** | Invoicing, RUT deduction, margin tracking, anomaly flagging | Job completion events + weekly |
| **Quality** | Threshold monitoring, alert creation, agent health | Always running + post-mission |

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `MONGODB_URI` | Yes | — | MongoDB Atlas or local connection string |
| `ANTHROPIC_API_KEY` | Yes | — | Anthropic API key |
| `REDIS_URL` | Yes | `redis://localhost:6379` | BullMQ Redis connection |
| `COMPANY_NAME` | Yes | — | World Model key for this client |
| `ANIMA_MODEL` | No | `claude-sonnet-4-6` | Claude model to use |
| `ANIMA_TRANSPORT` | No | `stdio` | `stdio` (local) or `http` (production) |
| `PORT` | No | `3000` | Fastify API port |
| `DASHBOARD_PORT` | No | `3001` | Next.js dashboard port |
| `GROWTH_AGENT_PORT` | No | `3010` | HTTP transport port |
| `STRATEGY_AGENT_PORT` | No | `3011` | HTTP transport port |
| `OPERATIONS_AGENT_PORT` | No | `3012` | HTTP transport port |
| `FINANCE_AGENT_PORT` | No | `3013` | HTTP transport port |
| `QUALITY_AGENT_PORT` | No | `3014` | HTTP transport port |

## Export and import

Anima can snapshot a company's entire World Model — goals, tasks, providers, wiki, quality config, and recent agent decisions — to a portable JSON artifact.

```bash
# Export (downloads a .json file)
GET /export/:company_name

# Import into a new Anima instance
POST /import
Content-Type: application/json
Body: <CompanySnapshot JSON>
```

Useful for: migrating clients between instances, backup, handoff, and demo seeding.

## Stack

- **Runtime:** Node.js 20+, TypeScript (ESM, NodeNext resolution)
- **Database:** MongoDB with Mongoose (`writeConcern: { w: 'majority' }` on all writes)
- **Queue:** BullMQ + Redis (ioredis)
- **API:** Fastify + @fastify/swagger
- **AI:** Claude API via Anthropic SDK (model configurable via `ANIMA_MODEL`)
- **Agents:** MCP servers — stdio locally, HTTP/SSE on Railway
- **Dashboard:** Next.js 14 App Router + Tailwind + shadcn/ui
- **Monorepo:** pnpm workspaces + Turborepo

## Development

```bash
# Build all packages
pnpm build

# Typecheck all packages
pnpm typecheck

# Run a single package in watch mode
pnpm --filter @anima/core dev
```

## Human proxy time budget

Target: **4–6 hours/week**

- Review weekly strategy brief (30 min)
- Process escalations queue (60–90 min)
- Review financial summary (20 min)
- Provider or customer calls (30 min)

Everything else runs autonomously.

## License

MIT
