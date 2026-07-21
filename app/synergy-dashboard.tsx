"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

const SESSION_NOW = Date.now();

type Member = {
  id: string;
  name: string;
  role: string;
  color: string;
  tokens: number;
  choreTokens: number;
  billTokens: number;
  completedChores: number;
  paidBills: number;
  contributionScore: number;
  reputation: number;
  fairShareGap: number;
};

type Chore = {
  id: string;
  title: string;
  category: string;
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeColor: string | null;
  points: number;
  recurrence: "none" | "daily" | "weekly" | "monthly";
  dueAt: string;
  status: "pending" | "completed";
  completedAt: string | null;
};

type Bill = {
  id: string;
  title: string;
  amountCents: number;
  dueAt: string;
  status: "pending" | "paid";
  paidById: string | null;
  paidByName: string | null;
  paidAt: string | null;
};

type Activity = {
  id: string;
  memberId: string;
  memberName: string;
  memberColor: string;
  eventType: string;
  tokenDelta: number;
  note: string;
  createdAt: string;
};

type Nudge = {
  id: string;
  targetMemberId: string;
  targetName: string;
  tone: string;
  message: string;
  model: string;
  createdAt: string;
};

type Snapshot = {
  meta: { generatedAt: string; dataMode: string; policyVersion: string; timezone: string };
  household: { id: string; name: string };
  members: Member[];
  chores: Chore[];
  bills: Bill[];
  activity: Activity[];
  nudges: Nudge[];
  stats: {
    harmony: number;
    fairness: number;
    completionRate: number;
    totalTokens: number;
    pendingChores: number;
    overdueChores: number;
    pendingBills: number;
    urgentBills: number;
    attentionMember: Member | null;
  };
};

type Tab = "overview" | "council" | "chores" | "bills" | "insights" | "history" | "fairness" | "rules";
type Modal = "chore" | "bill" | "nudge" | null;

const navItems: { id: Tab; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "⌂" },
  { id: "council", label: "Household council", icon: "✦" },
  { id: "chores", label: "Chores", icon: "✓" },
  { id: "bills", label: "Bills", icon: "₹" },
  { id: "insights", label: "Command center", icon: "⌁" },
  { id: "history", label: "Observed history", icon: "↗" },
  { id: "fairness", label: "Fairness lab", icon: "◎" },
  { id: "rules", label: "House rules", icon: "◇" },
];

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function relativeTime(value: string) {
  const diff = new Date(value).getTime() - SESSION_NOW;
  const days = Math.round(diff / 86_400_000);
  if (days === 0) return diff >= 0 ? "due today" : "overdue today";
  if (days === 1) return "due tomorrow";
  if (days === -1) return "1 day overdue";
  return days > 0 ? `due in ${days} days` : `${Math.abs(days)} days overdue`;
}

function timeAgo(value: string) {
  const hours = Math.max(0, Math.round((SESSION_NOW - new Date(value).getTime()) / 3_600_000));
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function rupees(cents: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function Avatar({ member, small = false }: { member: Pick<Member, "name" | "color">; small?: boolean }) {
  return (
    <span className={`avatar ${small ? "avatar-small" : ""}`} style={{ background: member.color }} aria-hidden="true">
      {initials(member.name)}
    </span>
  );
}

function LoadingScreen() {
  return (
    <main className="loading-screen">
      <div className="brand-mark">S</div>
      <p>Balancing the house…</p>
      <span className="loading-bar"><i /></span>
    </main>
  );
}

export default function Dashboard() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [activeMemberId, setActiveMemberId] = useState("m-ananya");
  const [modal, setModal] = useState<Modal>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; kind?: "success" | "error" } | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/household", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as { snapshot?: Snapshot; error?: string };
        if (!response.ok || !data.snapshot) throw new Error(data.error ?? "Could not load household data");
        return data.snapshot;
      })
      .then((nextSnapshot) => { if (active) setSnapshot(nextSnapshot); })
      .catch((error: Error) => { if (active) setToast({ message: error.message, kind: "error" }); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const activeMember = snapshot?.members.find((member) => member.id === activeMemberId) ?? snapshot?.members[0];

  async function action(payload: Record<string, unknown>, busyKey: string, success: string) {
    setBusy(busyKey);
    try {
      const response = await fetch("/api/household", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { snapshot?: Snapshot; reward?: number; error?: string };
      if (!response.ok || !data.snapshot) throw new Error(data.error ?? "Update failed");
      setSnapshot(data.snapshot);
      setModal(null);
      setToast({ message: data.reward ? `${success} +${data.reward} Harmony Tokens` : success, kind: "success" });
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "Update failed", kind: "error" });
    } finally {
      setBusy(null);
    }
  }

  if (!snapshot || !activeMember) return <LoadingScreen />;

  const currentTitle = navItems.find((item) => item.id === activeTab)?.label ?? "Overview";

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <Link className="brand-row" href="/">
          <span className="brand-mark">S</span>
          <div><strong>SynergySplit</strong><small>shared effort, visible</small></div>
        </Link>

        <div className="house-switcher">
          <span className="house-icon">⌂</span>
          <div><small>Household</small><strong>{snapshot.household.name}</strong></div>
          <span className="chevron">⌄</span>
        </div>

        <nav aria-label="Main navigation">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={activeTab === item.id ? "active" : ""}
              onClick={() => { setActiveTab(item.id); setMobileNav(false); }}
            >
              <span>{item.icon}</span>{item.label}
              {item.id === "chores" && <em>{snapshot.stats.pendingChores}</em>}
            </button>
          ))}
        </nav>

        <Link className="back-to-landing" href="/"><span>↗</span> Product home</Link>
        <div className="sidebar-spacer" />
        <button className="mediator-cta" onClick={() => { setModal("nudge"); setMobileNav(false); }}>
          <span className="spark">✦</span>
          <span><strong>AI house mediator</strong><small>Private · consent-first</small></span>
          <b>→</b>
        </button>
        <button className="reset-button" onClick={() => action({ action: "reset_demo" }, "reset", "Demo restored") } disabled={busy === "reset"}>
          ↻ Reset demo house
        </button>
        <div className="sidebar-profile">
          <Avatar member={activeMember} small />
          <span><strong>{activeMember.name}</strong><small>{activeMember.role}</small></span>
          <span className="online-dot" title="Active" />
        </div>
      </aside>

      {mobileNav && <button className="nav-scrim" aria-label="Close menu" onClick={() => setMobileNav(false)} />}

      <main className="main-content">
        <header className="topbar">
          <div>
            <button className="menu-button" onClick={() => setMobileNav(true)} aria-label="Open menu">☰</button>
            <span className="eyebrow">{snapshot.household.name}</span>
            <h1>{currentTitle}</h1>
          </div>
          <div className="topbar-actions">
            <span className="week-pill"><i /> {new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: snapshot.meta.timezone }).format(new Date(snapshot.meta.generatedAt))} · Observed</span>
            <label className="member-picker">
              <span>Acting as</span>
              <select value={activeMember.id} onChange={(event) => setActiveMemberId(event.target.value)}>
                {snapshot.members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
              </select>
            </label>
            <button className="notification-button" aria-label="Open notifications" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen((open) => !open)}>♢{(snapshot.stats.overdueChores + snapshot.stats.urgentBills) > 0 && <i />}</button>
          </div>
        </header>

        {activeTab === "overview" && (
          <Overview
            snapshot={snapshot}
            activeMember={activeMember}
            busy={busy}
            onComplete={(chore) => action({ action: "complete_chore", choreId: chore.id, memberId: activeMember.id }, chore.id, "Chore complete!")}
            onPay={(bill) => action({ action: "pay_bill", billId: bill.id, memberId: activeMember.id }, bill.id, "Bill logged!")}
            onTab={setActiveTab}
            onModal={setModal}
          />
        )}
        {activeTab === "council" && <CouncilView snapshot={snapshot} />}
        {activeTab === "chores" && (
          <ChoresView
            snapshot={snapshot}
            activeMember={activeMember}
            busy={busy}
            onComplete={(chore) => action({ action: "complete_chore", choreId: chore.id, memberId: activeMember.id }, chore.id, "Chore complete!")}
            onAdd={() => setModal("chore")}
          />
        )}
        {activeTab === "bills" && (
          <BillsView
            snapshot={snapshot}
            activeMember={activeMember}
            busy={busy}
            onPay={(bill) => action({ action: "pay_bill", billId: bill.id, memberId: activeMember.id }, bill.id, "Bill logged!")}
            onAdd={() => setModal("bill")}
          />
        )}
        {activeTab === "insights" && <InsightsView snapshot={snapshot} onNudge={() => setModal("nudge")} />}
        {activeTab === "history" && <HistoryView snapshot={snapshot} />}
        {activeTab === "fairness" && <FairnessView snapshot={snapshot} onNudge={() => setModal("nudge")} />}
        {activeTab === "rules" && <RulesView snapshot={snapshot} onNudge={() => setModal("nudge")} />}
      </main>

      {notificationsOpen && <NotificationCenter snapshot={snapshot} onClose={() => setNotificationsOpen(false)} onOpenChores={() => { setActiveTab("chores"); setNotificationsOpen(false); }} onOpenBills={() => { setActiveTab("bills"); setNotificationsOpen(false); }} />}

      {modal === "chore" && <AddChoreModal snapshot={snapshot} busy={busy} onClose={() => setModal(null)} onSubmit={(payload) => action({ action: "create_chore", ...payload }, "create-chore", "Chore added")} />}
      {modal === "bill" && <AddBillModal busy={busy} onClose={() => setModal(null)} onSubmit={(payload) => action({ action: "create_bill", ...payload }, "create-bill", "Bill added")} />}
      {modal === "nudge" && <NudgeModal snapshot={snapshot} onClose={() => setModal(null)} onSnapshot={setSnapshot} onToast={setToast} />}
      {toast && <div role="status" className={`toast ${toast.kind === "error" ? "toast-error" : ""}`}><span>{toast.kind === "error" ? "!" : "✓"}</span>{toast.message}</div>}
    </div>
  );
}

type CouncilPlan = {
  diagnosis: string;
  sharedGoal: string;
  options: { title: string; tradeoff: string; assignments: string[] }[];
  recommendedOption: number;
  checkIn: string;
  safeguards: string[];
  model: string;
};

function CouncilView({ snapshot }: { snapshot: Snapshot }) {
  const defaultIssue = snapshot.stats.overdueChores
    ? `${snapshot.stats.overdueChores} overdue chore${snapshot.stats.overdueChores === 1 ? " is" : "s are"} creating an uneven workload.`
    : "The house wants to redistribute next week's recurring work more fairly.";
  const [issue, setIssue] = useState(defaultIssue);
  const [priority, setPriority] = useState("fairness");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<CouncilPlan | null>(null);
  const [error, setError] = useState("");

  async function convene() {
    setLoading(true); setError(""); setPlan(null);
    try {
      const response = await fetch("/api/council", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ issue, priority }) });
      const data = (await response.json()) as CouncilPlan & { error?: string };
      if (!response.ok || !data.options?.length) throw new Error(data.error ?? "The council could not create a plan");
      setPlan(data);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The council could not create a plan"); }
    finally { setLoading(false); }
  }

  return <div className="page-stack council-page">
    <section className="council-hero">
      <div><span className="kicker">GPT-5.6 HOUSEHOLD COUNCIL</span><h2>From quiet tension<br />to a shared agreement.</h2><p>The council does more than draft a message. It reads a minimal, structured snapshot and proposes multiple consent-aware plans—while deterministic code keeps ownership of scores and facts.</p></div>
      <div className="council-live"><i /><span><small>LIVE HOUSE CONTEXT</small><strong>{snapshot.household.name}</strong><b>{snapshot.stats.fairness}% fair · {snapshot.stats.pendingChores} open tasks</b></span></div>
    </section>
    <section className="council-workbench">
      <article className="section-card council-input">
        <div className="section-heading"><div><span className="kicker">01 · FRAME THE MOMENT</span><h2>What needs agreement?</h2></div><span className="truth-label">HUMAN INITIATED</span></div>
        <label><span>Situation</span><textarea value={issue} maxLength={420} onChange={(event) => setIssue(event.target.value)} /></label>
        <label><span>Optimize first for</span><div className="council-priorities">{[["fairness","Fair share"],["speed","Fast resolution"],["flexibility","Maximum flexibility"]].map(([value,label]) => <button className={priority === value ? "active" : ""} onClick={() => setPriority(value)} type="button" key={value}>{label}</button>)}</div></label>
        <div className="council-context"><span>Context sent</span><p>Member names, open-task titles, deadlines, token totals and house-level fairness. No chat history, diagnoses or private notes.</p></div>
        <button className="button button-lime council-run" disabled={loading || issue.trim().length < 12} onClick={convene}>{loading ? "Council is reasoning…" : "Convene household council ✦"}</button>
        {error && <p className="council-error">{error}</p>}
      </article>
      <article className={`section-card council-output ${plan ? "has-plan" : ""}`}>
        {!plan ? <div className="council-empty"><div className="council-symbol"><i /><i /><i /><strong>✦</strong></div><span>02 · DELIBERATE</span><h3>Three paths, not one verdict.</h3><p>Convene the council to compare concrete options and their trade-offs.</p></div> : <div className="council-plan">
          <div className="council-plan-head"><div><span className="kicker">02 · COUNCIL BRIEF</span><h2>{plan.sharedGoal}</h2></div><b>{plan.model.includes("gpt-5.6") ? "MODEL GENERATED" : "SAFE FALLBACK"}</b></div>
          <p className="council-diagnosis">{plan.diagnosis}</p>
          <div className="council-options">{plan.options.map((option,index) => <article className={index === plan.recommendedOption ? "recommended" : ""} key={`${option.title}-${index}`}><span>{index === plan.recommendedOption ? "RECOMMENDED" : `OPTION 0${index + 1}`}</span><h3>{option.title}</h3><p>{option.tradeoff}</p><ul>{option.assignments.map((assignment) => <li key={assignment}>✓ {assignment}</li>)}</ul></article>)}</div>
          <div className="council-checkin"><span>↻</span><p><small>REVERSIBLE CHECK-IN</small><strong>{plan.checkIn}</strong></p></div>
          <div className="council-safeguards">{plan.safeguards.map((item) => <span key={item}>◇ {item}</span>)}</div>
        </div>}
      </article>
    </section>
    <section className="council-proof"><article><span>1</span><p><strong>Facts stay deterministic</strong>Scores and deadlines come from the live D1 ledger.</p></article><article><span>2</span><p><strong>Reasoning stays bounded</strong>The model can propose options, never mutate the house.</p></article><article><span>3</span><p><strong>People keep agency</strong>Nothing is sent or applied without human review.</p></article></section>
  </div>;
}

function Overview({ snapshot, activeMember, busy, onComplete, onPay, onTab, onModal }: {
  snapshot: Snapshot;
  activeMember: Member;
  busy: string | null;
  onComplete: (chore: Chore) => void;
  onPay: (bill: Bill) => void;
  onTab: (tab: Tab) => void;
  onModal: (modal: Modal) => void;
}) {
  const pendingChores = snapshot.chores.filter((chore) => chore.status === "pending").slice(0, 4);
  const pendingBills = snapshot.bills.filter((bill) => bill.status === "pending").slice(0, 3);
  const maxTokens = Math.max(...snapshot.members.map((member) => member.tokens), 1);
  return (
    <div className="content-grid">
      <section className="hero-card card-dark">
        <div className="hero-copy">
          <span className="mini-label"><i /> HOUSE HEALTH</span>
          <h2>Good rhythm, <em>one small wobble.</em></h2>
          <p>Your current ledger is {snapshot.stats.fairness}% balanced. {snapshot.stats.overdueChores ? `There ${snapshot.stats.overdueChores === 1 ? "is" : "are"} ${snapshot.stats.overdueChores} overdue chore${snapshot.stats.overdueChores === 1 ? "" : "s"} requiring attention.` : "There are no overdue chores right now."}</p>
          <div className="hero-actions">
            <button className="button button-lime" onClick={() => onTab("chores")}>Clear the wobble <span>→</span></button>
            <button className="button button-ghost" onClick={() => onModal("nudge")}>Ask mediator</button>
          </div>
        </div>
        <div className="harmony-orbit" style={{ "--score": `${snapshot.stats.harmony * 3.6}deg` } as React.CSSProperties}>
          <div><strong>{snapshot.stats.harmony}</strong><span>Harmony</span></div>
          <b className="orbit-dot" />
        </div>
        <span className="hero-grid-lines" />
      </section>

      <section className="metric-card card-coral">
        <span className="metric-icon">↗</span>
        <small>YOUR WEEK</small>
        <strong>{activeMember.tokens}<em> tokens</em></strong>
        <p>{activeMember.contributionScore >= 100 ? "You’re meeting your fair share." : `${activeMember.fairShareGap} tokens from an even share.`}</p>
        <div className="micro-bars"><i /><i /><i /><i /><i /><i /><i /></div>
      </section>

      <section className="section-card leaderboard-card">
        <div className="section-heading">
          <div><span className="kicker">REPUTATION ECONOMY</span><h2>House leaderboard</h2></div>
          <button onClick={() => onTab("fairness")}>How it works ↗</button>
        </div>
        <div className="leaderboard-list">
          {snapshot.members.map((member, index) => (
            <article key={member.id} className={member.id === activeMember.id ? "current-member" : ""}>
              <span className="rank">0{index + 1}</span>
              <Avatar member={member} />
              <div className="member-label"><strong>{member.name}{member.id === activeMember.id && <i>YOU</i>}</strong><small>{member.role} · {member.reputation}% reputation</small></div>
              <div className="rank-bar"><i style={{ width: `${(member.tokens / maxTokens) * 100}%`, background: member.color }} /></div>
              <strong className="token-score">{member.tokens}<small> HT</small></strong>
            </article>
          ))}
        </div>
      </section>

      <section className="section-card chores-card">
        <div className="section-heading">
          <div><span className="kicker">NEXT UP</span><h2>Shared chores</h2></div>
          <button onClick={() => onTab("chores")}>View all →</button>
        </div>
        <div className="task-list">
          {pendingChores.map((chore) => (
            <article key={chore.id} className={new Date(chore.dueAt).getTime() < SESSION_NOW ? "overdue" : ""}>
              <button className="check-button" aria-label={`Complete ${chore.title}`} onClick={() => onComplete(chore)} disabled={busy === chore.id}>{busy === chore.id ? "…" : "✓"}</button>
              <div className="task-copy"><strong>{chore.title}</strong><span><b>{chore.category}</b> · {relativeTime(chore.dueAt)}{chore.recurrence !== "none" ? ` · ↻ ${chore.recurrence}` : ""}</span></div>
              {chore.assigneeName && <span className="assigned"><i style={{ background: chore.assigneeColor ?? "#777" }}>{initials(chore.assigneeName)}</i>{chore.assigneeName}</span>}
              <span className="points">+{chore.points}</span>
            </article>
          ))}
        </div>
        <button className="add-row" onClick={() => onModal("chore")}><span>＋</span> Add a shared chore</button>
      </section>

      <section className="section-card bills-card">
        <div className="section-heading">
          <div><span className="kicker">MONEY, MINUS DRAMA</span><h2>Upcoming bills</h2></div>
          <button onClick={() => onTab("bills")}>View all →</button>
        </div>
        <div className="bill-list">
          {pendingBills.map((bill, index) => (
            <article key={bill.id}>
              <span className={`bill-icon bill-icon-${index % 3}`}>{index === 0 ? "⌂" : index === 1 ? "ϟ" : "◉"}</span>
              <div><strong>{bill.title}</strong><small>{relativeTime(bill.dueAt)}</small></div>
              <strong className="bill-amount">{rupees(bill.amountCents)}</strong>
              <button onClick={() => onPay(bill)} disabled={busy === bill.id}>{busy === bill.id ? "…" : "Mark paid"}</button>
            </article>
          ))}
        </div>
        <div className="bill-footer"><span><i /> {snapshot.stats.urgentBills} need attention soon</span><button onClick={() => onModal("bill")}>＋ Add bill</button></div>
      </section>

      <section className="section-card activity-card">
        <div className="section-heading"><div><span className="kicker">LIVE HOUSE FEED</span><h2>Good things happening</h2></div></div>
        <div className="activity-list">
          {snapshot.activity.slice(0, 5).map((item) => (
            <article key={item.id}>
              <Avatar member={{ name: item.memberName, color: item.memberColor }} small />
              <div><p><strong>{item.memberName}</strong> {item.note.toLowerCase()}</p><small>{timeAgo(item.createdAt)}</small></div>
              <span>+{item.tokenDelta} HT</span>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function ChoresView({ snapshot, activeMember, busy, onComplete, onAdd }: {
  snapshot: Snapshot;
  activeMember: Member;
  busy: string | null;
  onComplete: (chore: Chore) => void;
  onAdd: () => void;
}) {
  const [filter, setFilter] = useState<"pending" | "mine" | "completed">("pending");
  const chores = snapshot.chores.filter((chore) => filter === "mine" ? chore.assigneeId === activeMember.id && chore.status === "pending" : chore.status === filter);
  return (
    <div className="page-stack">
      <section className="page-intro intro-purple">
        <div><span className="kicker">COORDINATION BOARD</span><h2>Small tasks. No silent resentment.</h2><p>Every completed chore adds a visible contribution to the repeated-game reputation ledger.</p></div>
        <button className="button button-light" onClick={onAdd}>＋ Add chore</button>
        <span className="intro-number">{snapshot.stats.completionRate}%</span>
      </section>
      <section className="section-card large-list-card">
        <div className="filter-row">
          <div className="segmented">
            <button className={filter === "pending" ? "active" : ""} onClick={() => setFilter("pending")}>To do <b>{snapshot.stats.pendingChores}</b></button>
            <button className={filter === "mine" ? "active" : ""} onClick={() => setFilter("mine")}>Mine</button>
            <button className={filter === "completed" ? "active" : ""} onClick={() => setFilter("completed")}>Completed</button>
          </div>
          <span>{chores.length} tasks</span>
        </div>
        <div className="expanded-task-list">
          {chores.map((chore) => {
            const overdue = chore.status === "pending" && new Date(chore.dueAt).getTime() < SESSION_NOW;
            return (
              <article key={chore.id}>
                <button className={`large-check ${chore.status === "completed" ? "checked" : ""}`} disabled={chore.status === "completed" || busy === chore.id} onClick={() => onComplete(chore)} aria-label={`Complete ${chore.title}`}>{chore.status === "completed" ? "✓" : busy === chore.id ? "…" : ""}</button>
                <span className="category-badge">{chore.category}{chore.recurrence !== "none" ? ` · ↻ ${chore.recurrence}` : ""}</span>
                <div><strong>{chore.title}</strong><small className={overdue ? "danger-text" : ""}>{chore.status === "completed" ? `Completed ${chore.completedAt ? timeAgo(chore.completedAt) : ""}` : relativeTime(chore.dueAt)}</small></div>
                {chore.assigneeName ? <span className="task-owner"><i style={{ background: chore.assigneeColor ?? "#777" }}>{initials(chore.assigneeName)}</i>{chore.assigneeName}</span> : <span>Unassigned</span>}
                <span className="reward-chip">+{chore.points} HT</span>
              </article>
            );
          })}
          {!chores.length && <div className="empty-state"><span>✓</span><h3>All clear here</h3><p>There are no chores in this view.</p></div>}
        </div>
      </section>
    </div>
  );
}

function BillsView({ snapshot, activeMember, busy, onPay, onAdd }: {
  snapshot: Snapshot;
  activeMember: Member;
  busy: string | null;
  onPay: (bill: Bill) => void;
  onAdd: () => void;
}) {
  const pendingTotal = snapshot.bills.filter((bill) => bill.status === "pending").reduce((sum, bill) => sum + bill.amountCents, 0);
  const paidTotal = snapshot.bills.filter((bill) => bill.status === "paid").reduce((sum, bill) => sum + bill.amountCents, 0);
  return (
    <div className="page-stack">
      <section className="bill-summary-grid">
        <article className="summary-tile dark"><small>UPCOMING TOTAL</small><strong>{rupees(pendingTotal)}</strong><span>{snapshot.stats.pendingBills} open bills</span></article>
        <article className="summary-tile lime"><small>PAID THIS CYCLE</small><strong>{rupees(paidTotal)}</strong><span>Shared ledger verified</span></article>
        <article className="summary-tile pale"><small>YOUR BILL REPUTATION</small><strong>{activeMember.billTokens}<em> HT</em></strong><span>Amount-neutral rewards</span></article>
      </section>
      <section className="section-card large-list-card">
        <div className="section-heading"><div><span className="kicker">SHARED LEDGER</span><h2>Household bills</h2></div><button className="solid-small" onClick={onAdd}>＋ Add bill</button></div>
        <div className="expanded-bill-list">
          {snapshot.bills.map((bill, index) => (
            <article key={bill.id}>
              <span className={`bill-icon bill-icon-${index % 3}`}>{index % 3 === 0 ? "⌂" : index % 3 === 1 ? "ϟ" : "◉"}</span>
              <div className="bill-main"><strong>{bill.title}</strong><small className={bill.status === "pending" && new Date(bill.dueAt).getTime() < SESSION_NOW ? "danger-text" : ""}>{bill.status === "paid" ? `Paid by ${bill.paidByName}` : relativeTime(bill.dueAt)}</small></div>
              <span className={`status-chip ${bill.status}`}>{bill.status}</span>
              <strong className="bill-big-amount">{rupees(bill.amountCents)}</strong>
              {bill.status === "pending" ? <button className="outline-small" onClick={() => onPay(bill)} disabled={busy === bill.id}>{busy === bill.id ? "Saving…" : "Mark paid"}</button> : <span className="paid-check">✓</span>}
            </article>
          ))}
        </div>
        <div className="fair-money-note"><span>◎</span><div><strong>Why bill tokens ignore the amount</strong><p>Paying a ₹1,20,000 rent bill and a ₹1,200 Wi-Fi bill earn similar reputation. This prevents wealth from buying status in the house.</p></div></div>
      </section>
    </div>
  );
}

function FairnessView({ snapshot, onNudge }: { snapshot: Snapshot; onNudge: () => void }) {
  const maxScore = Math.max(...snapshot.members.map((member) => member.contributionScore), 100);
  return (
    <div className="page-stack">
      <section className="fairness-hero">
        <div><span className="kicker">REPEATED-GAME ENGINE</span><h2>Fairness you can inspect,<br />not an invisible score.</h2><p>SynergySplit rewards consistent cooperation across weeks. One missed task cannot define a person, and money cannot purchase household status.</p><button className="button button-lime" onClick={onNudge}>✦ Open neutral mediator</button></div>
        <div className="fairness-score"><span>HOUSE FAIRNESS</span><strong>{snapshot.stats.fairness}</strong><small>out of 100</small><i style={{ width: `${snapshot.stats.fairness}%` }} /></div>
      </section>
      <section className="fairness-grid">
        <article className="section-card formula-card"><span className="kicker">THE PAYOFF</span><h2>Three rules keep the game honest.</h2><ol><li><b>01</b><div><strong>Effort earns, not spending power</strong><p>Chore points reflect effort; bill rewards are capped at 3–8 tokens.</p></div></li><li><b>02</b><div><strong>Memory softens bad weeks</strong><p>Reputation = 0.7 × prior reputation + 0.3 × current cooperation.</p></div></li><li><b>03</b><div><strong>Nudges stay private</strong><p>Risk signals trigger a face-saving request, never a public shame label.</p></div></li></ol></article>
        <article className="section-card contribution-card"><div className="section-heading"><div><span className="kicker">FAIR-SHARE INDEX</span><h2>Contribution balance</h2></div></div><div className="contribution-list">{snapshot.members.map((member) => <div key={member.id}><Avatar member={member} small /><span><strong>{member.name}</strong><small>{member.fairShareGap > 0 ? `${member.fairShareGap} HT below even share` : "At or above even share"}</small></span><div><i style={{ width: `${Math.min(100, (member.contributionScore / maxScore) * 100)}%`, background: member.color }} /></div><b>{member.contributionScore}</b></div>)}</div></article>
      </section>
      <section className="section-card safeguards-card"><div><span className="kicker">DESIGN SAFEGUARDS</span><h2>What the system refuses to do</h2></div><div className="safeguard-list"><article><span>×</span><strong>No cash value</strong><p>Harmony Tokens are reputation signals, never tradable currency.</p></article><article><span>×</span><strong>No permanent labels</strong><p>The score decays toward recent cooperation instead of storing a moral verdict.</p></article><article><span>×</span><strong>No public shaming</strong><p>Private reminders cannot expose contribution deficits or rank a recipient.</p></article><article><span>×</span><strong>No rich-member advantage</strong><p>Bill rewards depend on timeliness, not the amount paid.</p></article></div></section>
    </div>
  );
}

function InsightsView({ snapshot, onNudge }: { snapshot: Snapshot; onNudge: () => void }) {
  const recurring = snapshot.chores.filter((chore) => chore.recurrence !== "none" && chore.status === "pending");
  const risk = Math.min(100, Math.round(snapshot.stats.overdueChores * 23 + snapshot.stats.urgentBills * 11 + (100 - snapshot.stats.fairness) * 0.48));
  const readiness = Math.round(snapshot.stats.completionRate * 0.55 + snapshot.stats.fairness * 0.35 + (snapshot.stats.overdueChores ? 0 : 10));
  const attention = snapshot.stats.attentionMember;
  const latestNudge = snapshot.nudges[0];

  function exportReport() {
    const report = {
      generatedAt: new Date().toISOString(),
      household: snapshot.household,
      stats: snapshot.stats,
      members: snapshot.members,
      pendingChores: snapshot.chores.filter((chore) => chore.status === "pending"),
      pendingBills: snapshot.bills.filter((bill) => bill.status === "pending"),
      recentActivity: snapshot.activity,
      methodology: {
        fairness: "100 × (1 − Gini coefficient of non-negative member token totals)",
        harmony: "65% fairness + 25% completed-chore rate + 10 points when no chore is overdue, otherwise 4 points",
        attentionIndex: "23 × overdue chores + 11 × urgent bills + 0.48 × fairness gap; capped at 100",
        readiness: "55% completion rate + 35% fairness + 10 points when no chore is overdue",
        disclosure: "Attention and readiness are deterministic rule-based indicators, not machine-learning predictions.",
      },
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "synergysplit-house-report.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="page-stack insights-page">
      <section className="insights-hero">
        <div><span className="kicker">HOUSEHOLD COMMAND CENTER</span><h2>See the workload<br /><em>before it becomes conflict.</em></h2><p>Transparent rule-based indicators combine current workload distribution, overdue commitments and payment urgency. They are triage aids—not learned predictions or judgments.</p><div className="insights-actions"><button className="button button-lime" onClick={onNudge}>✦ Resolve next risk</button><button className="button export-button" onClick={exportReport}>⇩ Export house report</button></div></div>
        <div className="risk-orb" style={{ "--risk": `${risk * 3.6}deg` } as React.CSSProperties}><div><small>RULE-BASED ATTENTION INDEX</small><strong>{risk}</strong><span>{risk < 30 ? "LOW" : risk < 60 ? "WATCH" : "ELEVATED"}</span></div></div>
      </section>

      <section className="insight-metric-grid">
        <article><span>01</span><small>CURRENT READINESS SCORE</small><strong>{readiness}%</strong><i><b style={{ width: `${readiness}%` }} /></i><p>55% completion + 35% fairness + 10% when nothing is overdue.</p></article>
        <article><span>02</span><small>AUTOMATED WORKFLOWS</small><strong>{recurring.length}</strong><i><b style={{ width: `${Math.min(100, recurring.length * 18)}%` }} /></i><p>Recurring chores now recreate themselves.</p></article>
        <article><span>03</span><small>FAIR-SHARE STABILITY</small><strong>{snapshot.stats.fairness}</strong><i><b style={{ width: `${snapshot.stats.fairness}%` }} /></i><p>{100 - snapshot.stats.fairness} points from perfect equality.</p></article>
        <article><span>04</span><small>MEDIATION MEMORY</small><strong>{snapshot.nudges.length}</strong><i><b style={{ width: `${Math.min(100, snapshot.nudges.length * 24)}%` }} /></i><p>Private nudges retained in the house log.</p></article>
      </section>

      <section className="insights-layout">
        <article className="section-card intervention-card">
          <div className="section-heading"><div><span className="kicker">NEXT BEST ACTION</span><h2>Intervention queue</h2></div><span className="live-label"><i /> live</span></div>
          <div className="intervention-main"><span className="intervention-icon">✦</span><div><small>RULE-SELECTED NEXT ACTION</small><h3>{snapshot.stats.overdueChores ? "Close the oldest overdue chore" : snapshot.stats.urgentBills ? "Confirm the next urgent bill" : "Protect the current balance"}</h3><p>{attention ? `${attention.name} is ${Math.max(0, attention.fairShareGap)} tokens below an even share in the current ledger. A private request tied to one concrete task is the least disruptive intervention.` : "No member currently needs an intervention."}</p></div><button onClick={onNudge}>Draft private nudge →</button></div>
          <div className="intervention-steps"><div><span>1</span><p><strong>Observe</strong>Distribution, deadlines and activity</p></div><i /><div><span>2</span><p><strong>Choose</strong>Smallest useful intervention</p></div><i /><div><span>3</span><p><strong>Resolve</strong>Private, face-saving request</p></div></div>
        </article>
        <article className="section-card automation-card">
          <div className="section-heading"><div><span className="kicker">RECURRENCE ENGINE</span><h2>Workflows on autopilot</h2></div></div>
          <div className="automation-list">{recurring.slice(0,5).map((chore) => <div key={chore.id}><span>↻</span><p><strong>{chore.title}</strong><small>{chore.assigneeName} · {chore.recurrence}</small></p><b>ACTIVE</b></div>)}</div>
          {!recurring.length && <div className="empty-mini"><span>↻</span><p>Add recurrence to a chore to automate it.</p></div>}
        </article>
      </section>

      <section className="insights-layout lower">
        <article className="section-card pulse-card"><div className="section-heading"><div><span className="kicker">HOUSE PULSE</span><h2>Member contribution radar</h2></div></div><div className="pulse-list">{snapshot.members.map((member) => <div key={member.id}><Avatar member={member} small /><p><strong>{member.name}</strong><small>{member.reputation}% reputation</small></p><i><b style={{ width: `${Math.min(100, member.contributionScore)}%`, background: member.color }} /></i><span>{member.contributionScore}</span></div>)}</div></article>
        <article className="section-card memory-card"><div className="section-heading"><div><span className="kicker">MEDIATOR MEMORY</span><h2>Latest private resolution</h2></div></div>{latestNudge ? <div className="memory-message"><span>“</span><p>{latestNudge.message}</p><small>{latestNudge.targetName} · {latestNudge.tone} · {latestNudge.model}</small></div> : <div className="empty-mini"><span>✦</span><p>No mediation has been needed yet.</p></div>}<button onClick={onNudge}>Open mediator</button></article>
      </section>
    </div>
  );
}

function HistoryView({ snapshot }: { snapshot: Snapshot }) {
  const observed = [...snapshot.activity].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const days = new Map<string, { tokens: number; events: number }>();
  for (const event of observed) {
    const key = new Intl.DateTimeFormat("en-CA", { timeZone: snapshot.meta.timezone }).format(new Date(event.createdAt));
    const current = days.get(key) ?? { tokens: 0, events: 0 };
    days.set(key, { tokens: current.tokens + event.tokenDelta, events: current.events + 1 });
  }
  const series = [...days.entries()].slice(-14);
  const maxTokens = Math.max(1, ...series.map(([, value]) => value.tokens));
  const firstEvent = observed[0];
  const lastEvent = observed.at(-1);

  function exportObserved() {
    const report = {
      schemaVersion: "1.1",
      generatedAt: new Date().toISOString(),
      mode: "observed-events-only",
      timezone: snapshot.meta.timezone,
      household: snapshot.household,
      methodology: "Daily totals are grouped directly from timestamped ledger events. Missing dates are not interpreted as zero effort.",
      events: observed,
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "synergysplit-observed-history.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  return <div className="page-stack history-page">
    <section className="history-hero">
      <div><span className="kicker">OBSERVED LEDGER HISTORY</span><h2>Evidence over<br /><em>invented trends.</em></h2><p>Every point below comes from a timestamped contribution event. Missing days remain missing; no history is generated from the current snapshot.</p></div>
      <button className="button button-lime" onClick={exportObserved}>⇩ Export observed events</button>
    </section>
    <section className="history-metrics">
      <article><small>OBSERVED EVENTS</small><strong>{observed.length}</strong><p>Stored ledger records</p></article>
      <article><small>OBSERVED DAYS</small><strong>{days.size}</strong><p>Days containing activity</p></article>
      <article><small>FIRST RECORD</small><strong>{firstEvent ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: snapshot.meta.timezone }).format(new Date(firstEvent.createdAt)) : "—"}</strong><p>No inferred history</p></article>
      <article><small>LATEST RECORD</small><strong>{lastEvent ? timeAgo(lastEvent.createdAt) : "—"}</strong><p>As stored in D1</p></article>
    </section>
    <section className="section-card observed-chart-card">
      <div className="section-heading"><div><span className="kicker">TOKEN EVENTS BY ACTIVE DAY</span><h2>Contribution timeline</h2></div><span className="truth-label">OBSERVED ONLY</span></div>
      {series.length ? <div className="observed-chart">{series.map(([date, value]) => <div key={date} title={`${date}: ${value.tokens} HT across ${value.events} events`}><b style={{ height: `${Math.max(8, (value.tokens / maxTokens) * 100)}%` }}><span>{value.tokens}</span></b><small>{new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: snapshot.meta.timezone }).format(new Date(`${date}T12:00:00Z`))}</small></div>)}</div> : <div className="empty-mini"><span>↗</span><p>History will appear after the first recorded contribution.</p></div>}
      <p className="chart-disclosure">This is a descriptive aggregation, not a prediction. Only dates with recorded events are displayed.</p>
    </section>
    <section className="section-card history-ledger-card"><div className="section-heading"><div><span className="kicker">APPEND-ONLY VIEW</span><h2>Recent evidence</h2></div><small>Policy v{snapshot.meta.policyVersion}</small></div><div className="history-ledger">{[...observed].reverse().map((event) => <div key={event.id}><Avatar member={{ name: event.memberName, color: event.memberColor }} small /><span><strong>{event.note}</strong><small>{event.memberName} · {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: snapshot.meta.timezone }).format(new Date(event.createdAt))}</small></span><b>+{event.tokenDelta} HT</b></div>)}</div></section>
  </div>;
}

function RulesView({ snapshot, onNudge }: { snapshot: Snapshot; onNudge: () => void }) {
  return <div className="page-stack rules-page">
    <section className="rules-hero"><div><span className="kicker">POLICY VERSION {snapshot.meta.policyVersion}</span><h2>The house rules are<br /><em>part of the product.</em></h2><p>Nothing important is hidden in a model. Rewards, fairness, attention signals, recurrence, and reminder boundaries are inspectable here.</p></div><button className="button button-lime" onClick={onNudge}>✦ Preview private mediator</button></section>
    <section className="rules-grid">
      <article className="section-card"><span>01</span><h3>Effort reward</h3><p>Chore points are multiplied by timeliness: 1.25 early, 1.00 on time, 0.70 late.</p><code>points × timeliness</code></article>
      <article className="section-card"><span>02</span><h3>Amount-neutral bills</h3><p>Bill tokens depend only on timeliness, so spending power cannot buy reputation.</p><code>early 8 · on time 6 · late 3</code></article>
      <article className="section-card"><span>03</span><h3>Distributional fairness</h3><p>The score converts the Gini coefficient of non-negative token totals to 0–100.</p><code>100 × (1 − Gini)</code></article>
      <article className="section-card"><span>04</span><h3>House harmony</h3><p>Harmony combines fairness, observed completion rate, and the presence of overdue work.</p><code>.65F + .25C + deadline</code></article>
    </section>
    <section className="rules-layout">
      <article className="section-card consent-card"><div className="section-heading"><div><span className="kicker">CONSENT BOUNDARIES</span><h2>Private mediation contract</h2></div></div><ul><li><b>Human initiated</b><span>No reminder is sent automatically.</span></li><li><b>Review before use</b><span>The sender sees and copies the draft first.</span></li><li><b>Minimal context</b><span>Only one task, tone, deadline, and coarse house signal.</span></li><li><b>No public ranking</b><span>Contribution deficits never appear in the drafted message.</span></li></ul></article>
      <article className="section-card provenance-card"><div className="section-heading"><div><span className="kicker">DATA PROVENANCE</span><h2>What is real here?</h2></div></div><dl><div><dt>Operational values</dt><dd>Read from the live D1 ledger</dd></div><div><dt>Fairness lab</dt><dd>Clearly labelled what-if scenario</dd></div><div><dt>Attention index</dt><dd>Deterministic rule, not prediction</dd></div><div><dt>Household records</dt><dd>Seeded sample, then mutated live</dd></div><div><dt>Generated language</dt><dd>Actual provider or fallback label retained</dd></div></dl></article>
    </section>
  </div>;
}

function NotificationCenter({ snapshot, onClose, onOpenChores, onOpenBills }: { snapshot: Snapshot; onClose: () => void; onOpenChores: () => void; onOpenBills: () => void }) {
  const overdue = snapshot.chores.filter((chore) => chore.status === "pending" && new Date(chore.dueAt).getTime() < SESSION_NOW);
  const urgent = snapshot.bills.filter((bill) => bill.status === "pending" && new Date(bill.dueAt).getTime() - SESSION_NOW < 3 * 86_400_000);
  return <><button className="notification-scrim" aria-label="Close notifications" onClick={onClose} /><aside className="notification-panel" aria-label="House notifications"><div className="notification-head"><div><span className="kicker">CURRENT DEADLINES</span><h2>Notifications</h2></div><button onClick={onClose} aria-label="Close">×</button></div><p className="notification-disclosure">Generated from current deadlines when you opened this panel. Nothing has been externally sent.</p><div className="notification-items">{overdue.map((chore) => <button key={chore.id} onClick={onOpenChores}><span className="notification-alert">!</span><p><strong>{chore.title}</strong><small>{chore.assigneeName ?? "Unassigned"} · {relativeTime(chore.dueAt)}</small></p><b>View →</b></button>)}{urgent.map((bill) => <button key={bill.id} onClick={onOpenBills}><span className="notification-bill">₹</span><p><strong>{bill.title}</strong><small>{rupees(bill.amountCents)} · {relativeTime(bill.dueAt)}</small></p><b>View →</b></button>)}{!overdue.length && !urgent.length && <div className="empty-mini"><span>✓</span><p>No overdue chores or urgent bills.</p></div>}</div><div className="notification-foot"><span>Quiet delivery</span><p>This build does not send push or email notifications. External delivery requires explicit consent and configured providers.</p></div></aside></>;
}

function ModalShell({ title, eyebrow, onClose, children }: { title: string; eyebrow: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal" role="dialog" aria-modal="true" aria-label={title}><button className="modal-close" onClick={onClose} aria-label="Close">×</button><span className="kicker">{eyebrow}</span><h2>{title}</h2>{children}</section></div>;
}

function AddChoreModal({ snapshot, busy, onClose, onSubmit }: { snapshot: Snapshot; busy: string | null; onClose: () => void; onSubmit: (payload: Record<string, unknown>) => void }) {
  const tomorrow = new Date(SESSION_NOW + 86_400_000).toISOString().slice(0, 16);
  const [form, setForm] = useState({ title: "", category: "Cleaning", assigneeId: snapshot.members[0].id, points: "10", recurrence: "none", dueAt: tomorrow });
  function submit(event: FormEvent) { event.preventDefault(); onSubmit({ ...form, points: Number(form.points) }); }
  return <ModalShell title="Add a shared chore" eyebrow="MAKE THE WORK VISIBLE" onClose={onClose}><p className="modal-lead">Set a fair effort value and a clear owner. Recurring work recreates itself after completion.</p><form onSubmit={submit} className="modal-form"><label><span>Chore</span><input required autoFocus placeholder="e.g. Mop the living room" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label><div className="form-grid"><label><span>Category</span><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option>Cleaning</option><option>Kitchen</option><option>Errands</option><option>Home</option></select></label><label><span>Assign to</span><select value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}>{snapshot.members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label></div><div className="form-grid"><label><span>Effort tokens</span><input type="number" min="1" max="30" value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })} /></label><label><span>Repeats</span><select value={form.recurrence} onChange={(e) => setForm({ ...form, recurrence: e.target.value })}><option value="none">Does not repeat</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label></div><label><span>First due date</span><input type="datetime-local" required value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} /></label><button className="modal-submit" disabled={busy === "create-chore"}>{busy === "create-chore" ? "Adding…" : "Add chore →"}</button></form></ModalShell>;
}

function AddBillModal({ busy, onClose, onSubmit }: { busy: string | null; onClose: () => void; onSubmit: (payload: Record<string, unknown>) => void }) {
  const nextWeek = new Date(SESSION_NOW + 7 * 86_400_000).toISOString().slice(0, 16);
  const [form, setForm] = useState({ title: "", amount: "", dueAt: nextWeek });
  function submit(event: FormEvent) { event.preventDefault(); onSubmit({ ...form, amount: Number(form.amount) }); }
  return <ModalShell title="Add a household bill" eyebrow="MONEY, MINUS DRAMA" onClose={onClose}><p className="modal-lead">Track the shared obligation. Reputation rewards timeliness, never the rupee amount.</p><form onSubmit={submit} className="modal-form"><label><span>Bill name</span><input required autoFocus placeholder="e.g. Water bill" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label><div className="form-grid"><label><span>Amount (₹)</span><input required type="number" min="1" step="0.01" placeholder="2400" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label><label><span>Due</span><input type="datetime-local" required value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} /></label></div><button className="modal-submit" disabled={busy === "create-bill"}>{busy === "create-bill" ? "Adding…" : "Add bill →"}</button></form></ModalShell>;
}

function NudgeModal({ snapshot, onClose, onSnapshot, onToast }: { snapshot: Snapshot; onClose: () => void; onSnapshot: (snapshot: Snapshot) => void; onToast: (toast: { message: string; kind?: "success" | "error" }) => void }) {
  const attentionId = snapshot.stats.attentionMember?.id ?? snapshot.members[0].id;
  const defaultTask = snapshot.chores.find((chore) => chore.assigneeId === attentionId && chore.status === "pending") ?? snapshot.chores.find((chore) => chore.status === "pending");
  const [targetMemberId, setTargetMemberId] = useState(attentionId);
  const [taskId, setTaskId] = useState(defaultTask?.id ?? "");
  const [tone, setTone] = useState("warm");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ message: string; model: string } | null>(null);

  const targetTasks = snapshot.chores.filter((chore) => chore.status === "pending" && (chore.assigneeId === targetMemberId || !chore.assigneeId));

  function chooseRecipient(nextMemberId: string) {
    const nextTask = snapshot.chores.find(
      (chore) => chore.status === "pending" && (chore.assigneeId === nextMemberId || !chore.assigneeId),
    ) ?? snapshot.chores.find((chore) => chore.status === "pending");
    setTargetMemberId(nextMemberId);
    setTaskId(nextTask?.id ?? "");
    setResult(null);
  }

  async function generate() {
    setGenerating(true);
    try {
      const response = await fetch("/api/nudge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetMemberId, taskId, tone }) });
      const data = (await response.json()) as { message?: string; model?: string; snapshot?: Snapshot; error?: string };
      if (!response.ok || !data.message || !data.model) throw new Error(data.error ?? "Could not create the nudge");
      setResult({ message: data.message, model: data.model });
      if (data.snapshot) onSnapshot(data.snapshot);
    } catch (error) {
      onToast({ message: error instanceof Error ? error.message : "Could not create the nudge", kind: "error" });
    } finally { setGenerating(false); }
  }

  async function copyMessage() {
    if (!result) return;
    await navigator.clipboard.writeText(result.message);
    onToast({ message: "Nudge copied — ready to send privately", kind: "success" });
  }

  return <ModalShell title="Neutral house mediator" eyebrow="GPT-5.6 MEDIATION" onClose={onClose}><p className="modal-lead">Create one face-saving reminder. The mediator never exposes scores, shames a member, or gives financial advice.</p><div className="mediator-banner"><span>✦</span><div><strong>Private by design</strong><small>Only the concrete task and a coarse balance signal are sent to the model.</small></div></div><div className="modal-form"><div className="form-grid"><label><span>Recipient</span><select value={targetMemberId} onChange={(e) => chooseRecipient(e.target.value)}>{snapshot.members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label><label><span>Task</span><select value={taskId} onChange={(e) => { setTaskId(e.target.value); setResult(null); }}>{(targetTasks.length ? targetTasks : snapshot.chores.filter((chore) => chore.status === "pending")).map((chore) => <option key={chore.id} value={chore.id}>{chore.title}</option>)}</select></label></div><label><span>Tone</span><div className="tone-selector">{["warm", "direct", "playful"].map((item) => <button key={item} className={tone === item ? "active" : ""} onClick={() => { setTone(item); setResult(null); }} type="button">{item === "warm" ? "♡" : item === "direct" ? "→" : "✦"} {item}</button>)}</div></label>{result ? <div className="nudge-result"><span className="quote-mark">“</span><p>{result.message}</p><div><small>{result.model.startsWith("gpt-5.6") ? `Model-generated draft · ${result.model} · provenance recorded` : "Safety fallback · no model claim"}</small><button type="button" onClick={copyMessage}>Copy message</button></div></div> : <button className="modal-submit" type="button" onClick={generate} disabled={generating || !taskId}>{generating ? "Mediator is writing…" : "Generate private nudge ✦"}</button>}</div></ModalShell>;
}
