# SynergySplit

[![Next.js](https://img.shields.io/badge/Next.js-16.2.6-black?style=flat&logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19.2.6-61DAFB?style=flat&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org)
[![Cloudflare D1](https://img.shields.io/badge/Cloudflare_D1-Drizzle_ORM-F38020?style=flat&logo=cloudflare)](https://developers.cloudflare.com/d1/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--5.6_Sol-412991?style=flat&logo=openai)](https://platform.openai.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**SynergySplit** is a game-theoretic coordination app for shared homes. It makes chores, bills, and household cooperation transparent and fair without turning a shared living space into a surveillance system. Members earn non-transferable **Harmony Tokens (HT)** for useful, timely contributions; a repeated-game reputation score smooths out temporary imbalances; and a **GPT-5.6 Sol mediator** drafts private, face-saving nudges and structured council agreements.

---

## 📋 Table of Contents

- [The Winning Demo: Household Council](#-the-winning-demo-household-council)
- [Key Features & Implemented Capabilities](#-key-features--implemented-capabilities)
- [Game Theory & Fairness Engine](#-game-theory--fairness-engine)
  - [Chores Payoff Function](#chores)
  - [Bills Payoff Function](#bills)
  - [Repeated-Game Memory & Reputation](#repeated-game-reputation)
  - [Household Fairness (Gini Coefficient)](#household-fairness)
- [AI Architecture & GPT-5.6 Integration](#-ai-architecture--gpt-56-integration)
- [How Codex & GPT-5.6 Were Used](#-how-codex--gpt-56-were-used)
- [System Architecture](#-system-architecture)
- [API Reference](#-api-reference)
- [Getting Started & Local Development](#-getting-started--local-development)
- [3-Person, 2-Day Hackathon Execution Split](#-3-person-2-day-hackathon-execution-split)
- [3-Minute Demo Walkthrough Script](#-3-minute-demo-walkthrough-script)
- [Safety, Privacy & Scope Boundaries](#-safety-privacy--scope-boundaries)

---

## 🏛️ The Winning Demo: Household Council

The **Household Council** turns a live, structured house imbalance into three materially different agreements with explicit trade-offs, a recommended path, assignments, a reversible check-in, and safety boundaries. 

- **GPT-5.6 Sol** handles bounded deliberation.
- **Deterministic Code** owns the ledger, fairness calculation, deadlines, permissions, and all state mutations.
- **Safety Guarantee**: The council can never silently change household data or send unapproved messages.

> **3-Minute Judge Walkthrough**: Open the public demo → enter the dashboard → select **Household Council** → click **Convene Household Council** → compare the three multi-option plans → open **House Rules** to inspect system boundaries and provenance.

---

## ✨ Key Features & Implemented Capabilities

- **Cinematic 3D Landing Page**: Interactive 3D Harmony Core with real-time mouse/touch responsiveness and a live fairness simulator.
- **Live Household Overview**: Real-time Harmony Index, Fairness Score, token distribution radar, and completed vs. overdue metrics.
- **Command Center**: Risk forecast, member contribution radar, active intervention queue, and JSON house report export.
- **Chore & Bill Automations**: Daily, weekly, and monthly chore recurrence engine auto-generating next actionable tasks upon completion.
- **Cloudflare D1 & Drizzle ORM Persistence**: Durable relational database storage for members, chores, bills, ledger events, and AI nudges.
- **Atomic Transactions & Protection**: Idempotent actions preventing duplicate chore completions or bill payments.
- **Timeliness-Aware Rewards**: Effort-based multipliers for chores and amount-neutral flat rewards for bills.
- **Inspectable Fairness Lab**: Interactive mathematical explanation of payoff rules, Gini coefficient, and safety limits.
- **GPT-5.6 Sol Nudge Mediator**: Serverless AI mediator generating private, non-punitive nudges via the OpenAI Responses API.
- **Automatic Model Cascade**: Fallback flow: `gpt-5.6-sol` → `gpt-5.6-luna` → labelled deterministic safety fallback.
- **Accessible & Responsive UI**: Glassmorphism aesthetic, dark mode support, fluid mobile/desktop layouts, and reduced-motion compliance.

---

## ⚖️ Game Theory & Fairness Engine

Harmony Tokens have **no cash value** and **cannot be traded**. They serve strictly as a short-term cooperation signal.

### Chores

Chores award points scaled by completion timeliness:

$$\text{Chore Reward} = \text{Effort Points} \times \text{Timeliness Multiplier}$$

| Timeliness Window | Multiplier |
|---|---|
| Early by 12h or more | **1.25x** |
| On time | **1.00x** |
| Late | **0.70x** |

### Bills

Bill rewards depend exclusively on timeliness, **not the bill amount**:

| Timeliness | Reward |
|---|---|
| 3+ days early | **8 HT** |
| On time | **6 HT** |
| Late | **3 HT** |

*Rationale: Prevents wealthier household members from buying top reputation simply by paying larger monetary bills.*

### Repeated-Game Reputation

$$\text{Reputation}_{new} = 0.70 \times \text{Reputation}_{prior} + 0.30 \times \text{Cooperation}_{current}$$

*The memory term prevents one off-week or missed chore from becoming a permanent mark while rewarding long-term consistency.*

### Household Fairness

The dashboard calculates the Gini coefficient of member token totals and maps it to a **0–100 Fairness Score**. The score measures contribution visibility and equity, not individual character.

---

## 🤖 AI Architecture & GPT-5.6 Integration

The server-only routes (`/api/nudge` and `/api/council`) interact with the OpenAI Responses API:

```json
{
  "model": "gpt-5.6-sol",
  "reasoning": { "effort": "low" },
  "max_output_tokens": 160
}
```

### Prompt Safety & Guardrails
- **Inert Data Handling**: All user-supplied inputs (names, descriptions, task titles) are sanitized as inert data.
- **Strict Prohibition**: Instructions explicitly forbid shaming, threat escalation, psychological diagnoses, public rankings, or financial advice.
- **Fallback Guarantee**: If `OPENAI_API_KEY` is missing or requests fail, a transparent, labelled deterministic fallback engine generates structured outputs without breaking application workflows.

---

## 🧠 How Codex & GPT-5.6 Were Used

SynergySplit deeply integrates **OpenAI GPT-5.6** into runtime application features and leveraged **OpenAI Codex** during development:

1. **GPT-5.6 Sol Mediator (`/api/nudge`)**:
   - Acts as a private, neutral household mediator via the OpenAI Responses API (`model: gpt-5.6-sol`, low reasoning effort).
   - Generates non-punitive, face-saving reminder messages tailored to requested tones (`warm`, `direct`, `playful`).

2. **GPT-5.6 Household Council (`/api/council`)**:
   - Powers structured household dispute resolution by analyzing live D1 ledger imbalances and open tasks.
   - Generates exactly 3 materially distinct agreement plans with explicit trade-offs, member assignments, safety boundaries, and a 7-day review check-in.
   - Implements a resilient model cascade: `gpt-5.6-sol` → `gpt-5.6-luna` → labelled deterministic safety fallback.

3. **OpenAI Codex & Pair Programming**:
   - Utilized during development for end-to-end full-stack code generation, including Drizzle ORM schema design (`db/schema.ts`), repeated-game reputation engine math (`lib/game-engine.ts`), Cloudflare D1 atomic transaction queries (`lib/household-store.ts`), and interactive 3D landing page components (`app/synergy-landing.tsx`).


---

## 🏗️ System Architecture

```text
React / Vinext (Next.js 16) Dashboard & Landing
        │
        ├── /api/household ──── Cloudflare D1 (Drizzle ORM)
        │                         └── Payoff & Gini Engine
        │
        ├── /api/nudge ──────── OpenAI Responses API (gpt-5.6-sol / luna)
        │                         └── Safe Deterministic Fallback
        │
        └── /api/council ────── OpenAI Responses API (Structured Council Deliberation)
                                  └── Multi-Option Safety Fallback
```

### Key Source Locations

- `app/synergy-landing.tsx` — Cinematic 3D landing page and interactive fairness simulator
- `app/synergy-dashboard.tsx` — Main application dashboard and Command Center UI
- `app/api/household/route.ts` — Household state reads, additions, and mutations
- `app/api/nudge/route.ts` — GPT-5.6 private nudge generation route
- `app/api/council/route.ts` — GPT-5.6 Household Council deliberation route
- `lib/household-store.ts` — D1 database initialization, queries, and atomic actions
- `lib/game-engine.ts` — Payoff functions, Gini coefficient, and repeated-game memory
- `db/schema.ts` — Drizzle ORM database schema definition

---

## 📡 API Reference

### `GET /api/household`
Returns complete household state: snapshot metrics, member stats, chores, bills, activity log, saved nudges, and fairness analytics.

### `POST /api/household`
Executes atomic state mutations. Supported actions:
- `complete_chore`: `{ action: "complete_chore", choreId: string, memberId: string }`
- `pay_bill`: `{ action: "pay_bill", billId: string, memberId: string }`
- `create_chore`: `{ action: "create_chore", title, points, frequency, assigneeId, dueDate }`
- `create_bill`: `{ action: "create_bill", title, amount, payerId, dueDate }`
- `reset_demo`: `{ action: "reset_demo" }`

### `POST /api/nudge`
Generates a private mediator message.
- **Request**: `{ targetMemberId: string, taskId: string, tone: "warm" | "direct" | "playful" }`
- **Response**: `{ message: string, generator: string, snapshot: HouseholdSnapshot }`

### `POST /api/council`
Convenes the AI Household Council for structured dispute resolution.
- **Request**: `{ issue: string, priority: "fairness" | "speed" | "flexibility" }`
- **Response**: Structured 3-plan proposal `{ diagnosis, sharedGoal, options, recommendedOption, checkIn, safeguards, model, provenance }`

---

## 🚀 Getting Started & Local Development

### Prerequisites
- **Node.js**: `>=22.13.0`
- **npm**: `>=10.0.0`

### Step-by-Step Setup

1. **Clone the repository and install dependencies**:
   ```bash
   git clone https://github.com/bnssaanirudh/Synergy-Split.git
   cd Synergy-Split
   npm ci
   ```

2. **Configure Environment Variables**:
   Create a `.env.local` file:
   ```bash
   cp .env.example .env.local
   ```
   *Optional: Add your `OPENAI_API_KEY` for live GPT-5.6 model calls.*

3. **Start Development Server**:
   ```bash
   npm run dev
   ```
   *The server provisions a local Cloudflare D1-compatible database environment. The first request automatically seeds the default "Sunrise House" demo.*

4. **Available Scripts**:
   - `npm run dev` — Launch Vite/Vinext development server
   - `npm run build` — Build production application
   - `npm run start` — Run production server
   - `npm test` — Run automated test suite
   - `npm run lint` — Lint codebase with ESLint
   - `npm run db:generate` — Generate Drizzle migrations

---

## 👥 3-Person, 2-Day Hackathon Execution Split

| Window | Person A (Platform) | Person B (Experience) | Person C (Game & AI) |
|---|---|---|---|
| **Day 1 AM** | D1 schema & API routes | Dashboard shell & design system | Payoff rules & seeded demo data |
| **Day 1 PM** | Transactions & deployment | Chores, bills & activity feeds | Fairness metrics & nudge prompts |
| **Day 2 AM** | State tests & error handling | Motion, responsive & mobile polish | GPT-5.6 evaluation & safety fallbacks |
| **Day 2 PM** | Production verification | Video recording & asset creation | Pitch deck & judge Q&A |

---

## 🎬 3-Minute Demo Walkthrough Script

1. **Overview**: Start on Overview; explain the 0–100 Harmony Index and Gini-based Fairness indicators.
2. **Interactive Action**: Switch active member, complete an overdue chore, and demonstrate instant live token & activity log updates.
3. **Bill Equity**: Navigate to Bills; highlight that token rewards ignore dollar amounts for financial fairness.
4. **Fairness Mechanics**: Open Fairness Lab; walk through the repeated-game memory algorithm.
5. **Private Nudges**: Generate a private mediator nudge; show the real model label (`gpt-5.6-sol` or `demo-safety-fallback`).
6. **Household Council**: Convene the council on an open chore dispute; show the 3 materially distinct options and provenance guarantees.
7. **Reset**: Click **Reset Demo** to restore pristine state for the next judge.

---

## 🛡️ Safety, Privacy & Scope Boundaries

SynergySplit is designed specifically for small, voluntary, consent-based shared households. 

- **Not a financial or surveillance tool**: It is explicitly not a credit score, payroll system, financial ledger, or employee/tenant tracking tool.
- **Future Production Requirements**: Any real-world deployment requires explicit invitations, RBAC permissions, audit export, deletion workflows, explicit nudge opt-in, strict API rate-limiting, and user consent validation.

---

<p align="center">Made with ❤️ for friction-free shared living</p>
