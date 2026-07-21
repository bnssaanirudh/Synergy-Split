# SynergySplit — Hackathon Pitch

## One-line pitch

SynergySplit turns the free-rider problem in shared homes into a transparent, repeated game where useful effort earns reputation and GPT-5.6 resolves tension without public shaming.

## The problem

Most roommate apps record expenses or list chores. They do not answer the harder question: *how do four people keep cooperating when each person can quietly benefit from someone else's work?* Informal memory is noisy, financial contributions can dominate, and group-chat reminders often feel accusatory.

## The product

SynergySplit gives a household one shared board for chores and bills, a visible but non-monetary cooperation ledger, and a neutral private mediator. Every rule is inspectable:

- chores earn effort × timeliness tokens;
- bill tokens are capped and ignore rupee amount;
- reputation remembers consistent cooperation but discounts old mistakes;
- a fairness index shows distribution without declaring anyone a “bad roommate”;
- GPT-5.6 Sol converts one concrete imbalance into a short, face-saving request.

## The game-theory story

A shared home is an indefinitely repeated public-goods game. In a one-shot round, a member can free-ride. In repeated rounds, observable cooperation and future reputation change the payoff: contributing today increases trust and the chance that others contribute tomorrow. SynergySplit makes that repeated-game state visible while constraining the reputational mechanism so that it cannot become tradable money or a permanent moral score.

## What to show judges

- Complete an overdue chore and watch Harmony Tokens, activity, and fairness update.
- Mark an inexpensive and an expensive bill paid; explain why the reward cap blocks wealth advantage.
- Open Fairness Lab and point to the exact memory equation.
- Ask GPT-5.6 Sol for warm, direct, and playful reminders.
- Show the model/fallback provenance label and the anti-shaming prompt constraints.

## Strong judge answers

**Is this only a gamified to-do list?**  
No. The differentiator is the payoff design: amount-neutral bill reputation, timeliness-weighted effort, repeated-game memory, a distributional fairness metric, and constrained mediation all operate on the same event ledger.

**Can the score become toxic?**  
It can if treated as an objective moral ranking. The build limits that risk: tokens have no cash value, old performance is discounted, reminders stay private, the AI cannot reveal deficits, and the product describes scores as coordination signals. Real deployment still requires explicit household consent and qualitative user research.

**Why GPT-5.6?**  
The model is used where language quality matters: turning structured state into a brief request that is specific, calm, and face-saving. Deterministic code handles accounting and fairness; the model never calculates balances or controls transactions.

**What would you build next?**  
Invite-based households, recurring tasks, settlement imports, opt-in nudge preferences, notification delivery, event-sourced audit exports, fairness calibration from participant studies, and longitudinal evaluation against ordinary group-chat coordination.

## Success metrics

- task completion before due time;
- distribution of contributions and fairness-score trend;
- reminder acceptance and completion after reminder;
- opt-out and rewrite rate for AI nudges;
- self-reported perceived fairness and household tension;
- false or inappropriate nudge rate;
- latency and cost per generated reminder.
