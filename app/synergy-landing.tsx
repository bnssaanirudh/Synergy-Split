"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type LiveSnapshot = {
  household: { name: string };
  members: { id: string; name: string; color: string; tokens: number }[];
  chores: { title: string; assigneeName: string | null; points: number; status: string; completedAt: string | null }[];
  nudges: { message: string; model: string }[];
  stats: { harmony: number; fairness: number; pendingChores: number; overdueChores: number };
};

function isLiveSnapshot(value: unknown): value is LiveSnapshot {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<LiveSnapshot>;
  return Boolean(item.household && typeof item.household.name === "string" && Array.isArray(item.members) &&
    Array.isArray(item.chores) && Array.isArray(item.nudges) && item.stats &&
    Number.isFinite(item.stats.harmony) && Number.isFinite(item.stats.fairness));
}

function calculateFairness(values: number[]) {
  if (!values.length) return 100;
  const mean = values.reduce((total, value) => total + value, 0) / values.length;
  if (!mean) return 100;
  let distance = 0;
  for (const left of values) for (const right of values) distance += Math.abs(left - right);
  return Math.max(0, Math.round((1 - distance / (2 * values.length * values.length * mean)) * 100));
}

export default function LandingPage() {
  const [snapshot, setSnapshot] = useState<LiveSnapshot | null>(null);
  const [contributions, setContributions] = useState<number[]>([]);
  const [loadError, setLoadError] = useState("");
  const [progress, setProgress] = useState(0);
  const fairness = useMemo(() => calculateFairness(contributions), [contributions]);
  const members = snapshot?.members ?? [];

  useEffect(() => {
    let active = true;
    fetch("/api/household", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json() as { snapshot?: unknown; error?: string };
        if (!response.ok || !isLiveSnapshot(body.snapshot)) throw new Error(body.error ?? "Live household data is unavailable");
        return body.snapshot;
      })
      .then((next) => { if (active) { setSnapshot(next); setContributions(next.members.map((member) => member.tokens)); } })
      .catch((error: unknown) => { if (active) setLoadError(error instanceof Error ? error.message : "Live data is unavailable"); });
    return () => { active = false; };
  }, []);

  function moveEquilibrium(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    event.currentTarget.style.setProperty("--scene-x", `${x * 14}deg`);
    event.currentTarget.style.setProperty("--scene-y", `${-y * 11}deg`);
    event.currentTarget.style.setProperty("--light-x", `${50 + x * 25}%`);
    event.currentTarget.style.setProperty("--light-y", `${50 + y * 25}%`);
  }

  useEffect(() => {
    const update = () => {
      const height = document.documentElement.scrollHeight - innerHeight;
      setProgress(height > 0 ? scrollY / height : 0);
    };
    update();
    addEventListener("scroll", update, { passive: true });
    return () => removeEventListener("scroll", update);
  }, []);

  return (
    <main className="aw-root">
      <div className="aw-progress" style={{ transform: `scaleX(${progress})` }} />
      <div className="aw-noise" aria-hidden="true" />
      {loadError && <aside className="aw-error"><b>Live ledger paused.</b> {loadError}. <Link href="/dashboard">Retry in dashboard ↗</Link></aside>}

      <header className="aw-nav">
        <a href="#top" className="aw-mark"><i>S</i><span>Synergy<br />Split</span></a>
        <nav aria-label="Primary navigation"><a href="#principles">Principles</a><a href="#lab">Fairness lab</a><a href="#mediator">Mediator</a></nav>
        <Link href="/dashboard" className="aw-enter">Enter the house <span>↗</span></Link>
      </header>

      <section className="aw-hero" id="top">
        <div className="aw-hero-wash" />
        <div className="aw-hero-index"><span>01 — 05</span><span>COOPERATION, REIMAGINED</span></div>
        <div className="aw-hero-copy">
          <p className="aw-kicker"><i /> A living system for shared homes</p>
          <h1>A fairer way<br />to live <em>together.</em></h1>
          <p className="aw-deck">Make invisible effort visible. Share responsibility without resentment. Resolve tension before it becomes conflict.</p>
          <Link className="aw-hero-cta" href="/dashboard"><span>Explore the live house</span><i>↗</i></Link>
        </div>
        <div className="aw-3d-wrap" onPointerMove={moveEquilibrium} onPointerLeave={(event) => { event.currentTarget.style.setProperty("--scene-x", "0deg"); event.currentTarget.style.setProperty("--scene-y", "0deg"); }} aria-label="Interactive three-dimensional household balance model">
          <div className="aw-3d-grid" />
          <div className="aw-3d-scene">
            <div className="aw-3d-orbit aw-orbit-a"><i /><i /><i /></div>
            <div className="aw-3d-orbit aw-orbit-b"><i /><i /><i /><i /></div>
            <div className="aw-3d-core"><div><small>LIVE BALANCE</small><strong>{snapshot?.stats.harmony ?? "—"}</strong><span>Harmony index</span></div></div>
            {members.slice(0, 4).map((member, index) => <div className={`aw-3d-member aw-member-${index + 1}`} key={member.id} style={{ "--member-color": member.color } as React.CSSProperties}><i>{member.name[0]}</i><span>{member.name}<small>{member.tokens} HT</small></span></div>)}
            <div className="aw-3d-axis aw-axis-x" /><div className="aw-3d-axis aw-axis-y" />
          </div>
          <p>MOVE TO EXPLORE <span>↗</span></p>
        </div>
        <div className="aw-live-rail">
          <div><small>LIVE HOUSE</small><strong>{snapshot?.household.name ?? "Connecting…"}</strong></div>
          <div><small>HARMONY</small><strong>{snapshot ? `${snapshot.stats.harmony}` : "—"}<sup>/100</sup></strong></div>
          <div><small>FAIRNESS</small><strong>{snapshot ? `${snapshot.stats.fairness}%` : "—"}</strong></div>
          <div><small>OPEN TASKS</small><strong>{snapshot?.stats.pendingChores ?? "—"}</strong></div>
          <a href="#manifesto">Scroll to discover <span>↓</span></a>
        </div>
      </section>

      <section className="aw-manifesto" id="manifesto">
        <p className="aw-side-note">THE DOMESTIC SOCIAL CONTRACT<br />REWRITTEN FOR REAL LIFE</p>
        <div>
          <span className="aw-number">/ 01</span>
          <h2>Living together<br />shouldn&apos;t feel like<br /><em>keeping score.</em></h2>
          <p>Yet the smallest imbalances compound: one forgotten chore, one awkward reminder, one person quietly carrying the room. SynergySplit creates shared memory without public shame.</p>
        </div>
      </section>

      <section className="aw-ticker" aria-label="SynergySplit principles"><div><span>Effort made visible</span><i>✦</i><span>Fairness made legible</span><i>✦</i><span>Conflict made smaller</span></div></section>

      <section className="aw-council-callout">
        <div><span>NEW · HOUSEHOLD COUNCIL</span><h2>Not another chatbot.<br />A decision you can inspect.</h2><p>Turn one real household tension into three consent-aware agreements—with assignments, trade-offs, safeguards, and a reversible check-in.</p><Link href="/dashboard">Convene the live council <i>↗</i></Link></div>
        <div className="aw-council-preview"><header><span><i /> LIVE DELIBERATION</span><b>3 OPTIONS</b></header><article><small>01 · FASTEST</small><strong>Smallest useful swap</strong><p>Low friction · immediate relief</p></article><article className="selected"><small>02 · RECOMMENDED</small><strong>One-week rotation</strong><p>Best fairness · shared commitment</p></article><article><small>03 · FLEXIBLE</small><strong>Open claim window</strong><p>More choice · slower settlement</p></article><footer>Facts: deterministic ledger <span>Language: bounded model</span></footer></div>
      </section>

      <section className="aw-principles" id="principles">
        <header><span>/ 02</span><p>THREE QUIET MECHANISMS.<br />ONE HEALTHIER HOUSE.</p></header>
        <article className="aw-principle aw-p1"><div className="aw-glyph">01</div><div><small>VISIBLE EFFORT</small><h3>Work earns.<br />Wealth doesn&apos;t.</h3><p>Chores reward effort and timeliness. Bill reputation is deliberately capped, so a larger payment can never buy social status.</p></div><Link href="/dashboard">Open chore ledger ↗</Link></article>
        <article className="aw-principle aw-p2"><div className="aw-glyph">02</div><div><small>FORGIVING MEMORY</small><h3>One bad week<br />isn&apos;t an identity.</h3><p>Consistency matters, but old mistakes fade. Every reputation rule is inspectable and every score has context.</p></div><Link href="/dashboard">Inspect the rules ↗</Link></article>
        <article className="aw-principle aw-p3"><div className="aw-glyph">03</div><div><small>PRIVATE LANGUAGE</small><h3>Resolve tension.<br />Preserve the person.</h3><p>A private mediator turns a concrete imbalance into a calm, face-saving request—not a public verdict.</p></div><a href="#mediator">Meet the mediator ↓</a></article>
      </section>

      <section className="aw-lab" id="lab">
        <div className="aw-lab-copy"><span>/ 03 — INTERACTIVE</span><h2>Shift the effort.<br /><em>Feel the balance.</em></h2><p>Adjust the live demo household&apos;s contribution tokens. The result uses a transparent Gini-based calculation; it is a what-if scenario, never a judgment of a person.</p><code>FAIRNESS = 1 − GINI(CONTRIBUTION)</code></div>
        <div className="aw-machine">
          <header><span><i /> LIVE LEDGER INPUT</span><b>WHAT-IF ONLY</b></header>
          <div className="aw-score"><small>SCENARIO<br />FAIRNESS</small><strong>{fairness}</strong><sup>%</sup><p>{fairness >= 85 ? "Near-equal distribution" : fairness >= 70 ? "Moderate imbalance" : "Large imbalance"}</p></div>
          <div className="aw-controls">
            {contributions.map((value, index) => {
              const max = Math.max(30, ...contributions);
              return <label key={members[index]?.id ?? index}><span><i style={{ background: members[index]?.color }}>{members[index]?.name[0]}</i>{members[index]?.name}</span><input type="range" min="0" max={max} value={value} aria-label={`${members[index]?.name} contribution scenario`} style={{ "--fill": `${value / max * 100}%` } as React.CSSProperties} onChange={(event) => setContributions((current) => current.map((item, itemIndex) => itemIndex === index ? Number(event.target.value) : item))} /><b>{value} HT</b></label>;
            })}
          </div>
        </div>
      </section>

      <section className="aw-mediator" id="mediator">
        <div className="aw-mediator-title"><span>/ 04</span><h2>Intelligence<br />with <em>boundaries.</em></h2></div>
        <div className="aw-dialogue">
          <small>STRUCTURED HOUSE SIGNAL</small><p>{snapshot ? `${snapshot.stats.overdueChores} overdue and ${snapshot.stats.pendingChores} pending chore${snapshot.stats.pendingChores === 1 ? "" : "s"} in the current ledger.` : "Reading the current household ledger…"}</p>
          <div><i>✦</i><span><small>{snapshot?.nudges[0] ? "RECORDED MEDIATOR OUTPUT" : "MEDIATOR READY"}</small><p>{snapshot?.nudges[0]?.message ?? "A private, provenance-labelled reminder appears only when a house member asks for one."}</p></span></div>
        </div>
        <ul><li>Ledger logic stays deterministic</li><li>Private deficits are never exposed</li><li>Outputs are provenance-labelled</li><li>No shaming, threats or diagnosis</li></ul>
      </section>

      <section className="aw-final">
        <p>THE HOUSE IS A REPEATED GAME.<br />MAKE THE NEXT ROUND BETTER.</p>
        <h2>Less tension.<br /><em>More home.</em></h2>
        <Link href="/dashboard"><span>Enter SynergySplit</span><i>↗</i></Link>
      </section>

      <footer className="aw-footer"><span>SynergySplit®</span><p>Fairness is computed. Humanity is preserved.</p><a href="#top">Back to top ↑</a></footer>
    </main>
  );
}
