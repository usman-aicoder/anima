# Anima

Generic AI operating system for SMEs. Anima runs your business autonomously — growth, operations, finance, quality, and strategy — while you spend 30 minutes a week reviewing decisions.

## How it works

1. **Onboard your company** — Strategy Agent interviews you for 30 minutes and populates a World Model with everything it learns about your business.
2. **Approve the goal tree** — Strategy Agent generates a goal tree based on your answers. You review and approve in the dashboard.
3. **Agents activate** — Growth, Operations, Finance, Quality, and Strategy agents run continuously, executing against your goals.
4. **You review weekly** — Every Friday, read the brief, approve escalations, complete any tasks that require a human.

No business-specific logic lives in the agent code. All configuration — keywords, vetting rules, budgets, content strategy — lives in the World Model, populated from your onboarding conversation.

## Packages

| Package | Description |
|---|---|
| `@anima/core` | WorldModelClient, DecisionLogger, BaseAgent, GoalReader, SessionManager |
| `@anima/agents` | Growth, Strategy, Operations, Finance, Quality agents (MCP servers) |
| `@anima/dashboard` | Next.js dashboard for goal tree, agent status, and escalations |
| `@anima/cli` | `npx create-anima-app` quickstart |

## Stack

- **Runtime:** Node.js 20+, TypeScript
- **Database:** MongoDB Atlas (World Model)
- **Queue:** BullMQ + Redis
- **API:** Fastify
- **AI:** Claude API (Anthropic)
- **Agents:** MCP servers (stdio locally, HTTP/SSE on Railway)

## Getting started

```bash
npx create-anima-app my-company
cd my-company
cp .env.example .env
# Add MONGODB_URI and ANTHROPIC_API_KEY to .env
pnpm install
pnpm dev
```

## Status

Currently in active development. Sprint 0 complete — scaffold and monorepo structure in place.

## License

MIT
