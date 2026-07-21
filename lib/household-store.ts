import { getD1 } from "@/db";
import { createSeedData, HOUSEHOLD_ID } from "@/lib/demo-data";
import {
  billReward,
  choreReward,
  contributionScore,
  fairShareGap,
  fairnessScore,
  reputationFromScore,
} from "@/lib/game-engine";

type Row = Record<string, string | number | null>;

async function all<T extends Row>(query: D1PreparedStatement) {
  const result = await query.all<T>();
  return result.results ?? [];
}

export async function ensureDatabase() {
  const db = getD1();
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS households (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY, household_id TEXT NOT NULL, name TEXT NOT NULL,
      role TEXT NOT NULL, color TEXT NOT NULL, created_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS chores (
      id TEXT PRIMARY KEY, household_id TEXT NOT NULL, title TEXT NOT NULL,
      category TEXT NOT NULL, assignee_id TEXT, points INTEGER NOT NULL,
      recurrence TEXT NOT NULL DEFAULT 'none', due_at TEXT NOT NULL, status TEXT NOT NULL, completed_at TEXT,
      created_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS bills (
      id TEXT PRIMARY KEY, household_id TEXT NOT NULL, title TEXT NOT NULL,
      amount_cents INTEGER NOT NULL, due_at TEXT NOT NULL, status TEXT NOT NULL,
      paid_by_id TEXT, paid_at TEXT, created_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS ledger (
      id TEXT PRIMARY KEY, household_id TEXT NOT NULL, member_id TEXT NOT NULL,
      event_type TEXT NOT NULL, token_delta INTEGER NOT NULL, reference_id TEXT,
      note TEXT NOT NULL, created_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS nudges (
      id TEXT PRIMARY KEY, household_id TEXT NOT NULL, target_member_id TEXT NOT NULL,
      tone TEXT NOT NULL, message TEXT NOT NULL, model TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS chores_household_status_idx ON chores (household_id, status)"),
    db.prepare("CREATE INDEX IF NOT EXISTS bills_household_status_idx ON bills (household_id, status)"),
    db.prepare("CREATE INDEX IF NOT EXISTS ledger_household_created_idx ON ledger (household_id, created_at)"),
  ]);

  const choreColumns = await all<{ name: string }>(db.prepare("PRAGMA table_info(chores)"));
  if (!choreColumns.some((column) => column.name === "recurrence")) {
    await db.prepare("ALTER TABLE chores ADD COLUMN recurrence TEXT NOT NULL DEFAULT 'none'").run();
  }

  // Upgrade the original demo rows in-place so existing deployments immediately
  // showcase automated workflows without requiring a destructive demo reset.
  await db.prepare(`UPDATE chores SET recurrence = CASE id
    WHEN 'c-dishes' THEN 'daily'
    WHEN 'c-groceries' THEN 'weekly'
    WHEN 'c-laundry' THEN 'weekly'
    WHEN 'c-plants' THEN 'weekly'
    WHEN 'c-bathroom' THEN 'weekly'
    WHEN 'c-trash' THEN 'weekly'
    ELSE recurrence END
    WHERE household_id = ? AND recurrence = 'none' AND id IN
      ('c-dishes', 'c-groceries', 'c-laundry', 'c-plants', 'c-bathroom', 'c-trash')`)
    .bind(HOUSEHOLD_ID)
    .run();

  const existing = await db
    .prepare("SELECT COUNT(*) AS count FROM households WHERE id = ?")
    .bind(HOUSEHOLD_ID)
    .first<{ count: number }>();
  if (!existing?.count) await seedDatabase();
}

async function seedDatabase() {
  const db = getD1();
  const seed = createSeedData();
  const now = new Date().toISOString();
  const statements: D1PreparedStatement[] = [
    db
      .prepare("INSERT INTO households (id, name, created_at) VALUES (?, ?, ?)")
      .bind(seed.household.id, seed.household.name, now),
  ];
  for (const member of seed.members) {
    statements.push(
      db
        .prepare("INSERT INTO members (id, household_id, name, role, color, created_at) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(member.id, HOUSEHOLD_ID, member.name, member.role, member.color, now),
    );
  }
  for (const chore of seed.chores) {
    statements.push(
      db
        .prepare(`INSERT INTO chores
          (id, household_id, title, category, assignee_id, points, recurrence, due_at, status, completed_at, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`) 
        .bind(
          chore.id,
          HOUSEHOLD_ID,
          chore.title,
          chore.category,
          chore.assigneeId,
          chore.points,
          chore.recurrence,
          chore.dueAt,
          chore.status,
          "completedAt" in chore ? chore.completedAt ?? null : null,
          now,
        ),
    );
  }
  for (const bill of seed.bills) {
    statements.push(
      db
        .prepare(`INSERT INTO bills
          (id, household_id, title, amount_cents, due_at, status, paid_by_id, paid_at, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`) 
        .bind(
          bill.id,
          HOUSEHOLD_ID,
          bill.title,
          bill.amountCents,
          bill.dueAt,
          bill.status,
          "paidById" in bill ? bill.paidById ?? null : null,
          "paidAt" in bill ? bill.paidAt ?? null : null,
          now,
        ),
    );
  }
  for (const entry of seed.ledger) {
    statements.push(
      db
        .prepare(`INSERT INTO ledger
          (id, household_id, member_id, event_type, token_delta, reference_id, note, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`) 
        .bind(
          entry.id,
          HOUSEHOLD_ID,
          entry.memberId,
          entry.eventType,
          entry.tokenDelta,
          entry.referenceId,
          entry.note,
          entry.createdAt,
        ),
    );
  }
  await db.batch(statements);
}

export async function resetDatabase() {
  const db = getD1();
  await db.batch([
    db.prepare("DELETE FROM nudges WHERE household_id = ?").bind(HOUSEHOLD_ID),
    db.prepare("DELETE FROM ledger WHERE household_id = ?").bind(HOUSEHOLD_ID),
    db.prepare("DELETE FROM chores WHERE household_id = ?").bind(HOUSEHOLD_ID),
    db.prepare("DELETE FROM bills WHERE household_id = ?").bind(HOUSEHOLD_ID),
    db.prepare("DELETE FROM members WHERE household_id = ?").bind(HOUSEHOLD_ID),
    db.prepare("DELETE FROM households WHERE id = ?").bind(HOUSEHOLD_ID),
  ]);
  await seedDatabase();
}

export async function getSnapshot() {
  await ensureDatabase();
  const db = getD1();
  const household = await db
    .prepare("SELECT id, name FROM households WHERE id = ?")
    .bind(HOUSEHOLD_ID)
    .first<{ id: string; name: string }>();

  const [memberRows, choreRows, billRows, ledgerRows, nudgeRows] = await Promise.all([
    all(db.prepare(`SELECT m.id, m.name, m.role, m.color,
      COALESCE(SUM(l.token_delta), 0) AS tokens,
      COALESCE(SUM(CASE WHEN l.event_type = 'chore' THEN l.token_delta ELSE 0 END), 0) AS chore_tokens,
      COALESCE(SUM(CASE WHEN l.event_type = 'bill' THEN l.token_delta ELSE 0 END), 0) AS bill_tokens,
      COUNT(DISTINCT CASE WHEN l.event_type = 'chore' THEN l.reference_id END) AS completed_chores,
      COUNT(DISTINCT CASE WHEN l.event_type = 'bill' THEN l.reference_id END) AS paid_bills
      FROM members m LEFT JOIN ledger l ON l.member_id = m.id
      WHERE m.household_id = ? GROUP BY m.id ORDER BY tokens DESC`).bind(HOUSEHOLD_ID)),
    all(db.prepare(`SELECT c.*, m.name AS assignee_name, m.color AS assignee_color
      FROM chores c LEFT JOIN members m ON m.id = c.assignee_id
      WHERE c.household_id = ? ORDER BY c.status DESC, c.due_at ASC`).bind(HOUSEHOLD_ID)),
    all(db.prepare(`SELECT b.*, m.name AS paid_by_name
      FROM bills b LEFT JOIN members m ON m.id = b.paid_by_id
      WHERE b.household_id = ? ORDER BY b.status DESC, b.due_at ASC`).bind(HOUSEHOLD_ID)),
    all(db.prepare(`SELECT l.*, m.name AS member_name, m.color AS member_color
      FROM ledger l JOIN members m ON m.id = l.member_id
      WHERE l.household_id = ? ORDER BY l.created_at DESC LIMIT 60`).bind(HOUSEHOLD_ID)),
    all(db.prepare(`SELECT n.*, m.name AS target_name FROM nudges n
      JOIN members m ON m.id = n.target_member_id
      WHERE n.household_id = ? ORDER BY n.created_at DESC LIMIT 4`).bind(HOUSEHOLD_ID)),
  ]);

  const totalTokens = memberRows.reduce((sum, row) => sum + Number(row.tokens), 0);
  const memberCount = memberRows.length;
  const members = memberRows.map((row) => {
    const tokens = Number(row.tokens);
    const score = contributionScore(tokens, totalTokens, memberCount);
    return {
      id: String(row.id),
      name: String(row.name),
      role: String(row.role),
      color: String(row.color),
      tokens,
      choreTokens: Number(row.chore_tokens),
      billTokens: Number(row.bill_tokens),
      completedChores: Number(row.completed_chores),
      paidBills: Number(row.paid_bills),
      contributionScore: score,
      reputation: reputationFromScore(score),
      fairShareGap: fairShareGap(tokens, totalTokens, memberCount),
    };
  });
  const fairness = fairnessScore(members);
  const pendingChores = choreRows.filter((row) => row.status === "pending");
  const overdueChores = pendingChores.filter((row) => new Date(String(row.due_at)).getTime() < Date.now());
  const pendingBills = billRows.filter((row) => row.status === "pending");
  const urgentBills = pendingBills.filter((row) => new Date(String(row.due_at)).getTime() - Date.now() < 3 * 86_400_000);
  const completionRate = choreRows.length
    ? Math.round((choreRows.filter((row) => row.status === "completed").length / choreRows.length) * 100)
    : 100;
  const harmony = Math.max(
    0,
    Math.min(100, Math.round(fairness * 0.65 + completionRate * 0.25 + (overdueChores.length ? 4 : 10))),
  );
  const attentionMember = [...members].sort((a, b) => b.fairShareGap - a.fairShareGap)[0] ?? null;

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      dataMode: "seeded-live-ledger",
      policyVersion: "1.1",
      timezone: "Asia/Kolkata",
    },
    household,
    members,
    chores: choreRows.map((row) => ({
      id: row.id,
      title: row.title,
      category: row.category,
      assigneeId: row.assignee_id,
      assigneeName: row.assignee_name,
      assigneeColor: row.assignee_color,
      points: Number(row.points),
      recurrence: String(row.recurrence ?? "none"),
      dueAt: row.due_at,
      status: row.status,
      completedAt: row.completed_at,
    })),
    bills: billRows.map((row) => ({
      id: row.id,
      title: row.title,
      amountCents: Number(row.amount_cents),
      dueAt: row.due_at,
      status: row.status,
      paidById: row.paid_by_id,
      paidByName: row.paid_by_name,
      paidAt: row.paid_at,
    })),
    activity: ledgerRows.map((row) => ({
      id: row.id,
      memberId: row.member_id,
      memberName: row.member_name,
      memberColor: row.member_color,
      eventType: row.event_type,
      tokenDelta: Number(row.token_delta),
      note: row.note,
      createdAt: row.created_at,
    })),
    nudges: nudgeRows.map((row) => ({
      id: row.id,
      targetMemberId: row.target_member_id,
      targetName: row.target_name,
      tone: row.tone,
      message: row.message,
      model: row.model,
      createdAt: row.created_at,
    })),
    stats: {
      harmony,
      fairness,
      completionRate,
      totalTokens,
      pendingChores: pendingChores.length,
      overdueChores: overdueChores.length,
      pendingBills: pendingBills.length,
      urgentBills: urgentBills.length,
      attentionMember,
    },
  };
}

export async function completeChore(choreId: string, memberId: string) {
  const db = getD1();
  const chore = await db
    .prepare("SELECT id, title, category, assignee_id, points, recurrence, due_at, status FROM chores WHERE id = ? AND household_id = ?")
    .bind(choreId, HOUSEHOLD_ID)
    .first<{ id: string; title: string; category: string; assignee_id: string | null; points: number; recurrence: string; due_at: string; status: string }>();
  if (!chore) throw new Error("Chore not found");
  if (chore.status !== "pending") throw new Error("This chore is already complete");
  const now = new Date().toISOString();
  const update = await db
    .prepare("UPDATE chores SET status = 'completed', completed_at = ?, assignee_id = ? WHERE id = ? AND status = 'pending'")
    .bind(now, memberId, choreId)
    .run();
  if (!update.meta.changes) throw new Error("This chore was just completed by someone else");
  const reward = choreReward(chore.points, chore.due_at, now);
  await db
    .prepare(`INSERT INTO ledger
      (id, household_id, member_id, event_type, token_delta, reference_id, note, created_at)
      VALUES (?, ?, ?, 'chore', ?, ?, ?, ?)`) 
    .bind(crypto.randomUUID(), HOUSEHOLD_ID, memberId, reward, choreId, `${chore.title} completed`, now)
    .run();
  if (["daily", "weekly", "monthly"].includes(chore.recurrence)) {
    const nextDue = new Date(chore.due_at);
    // Advance missed cycles so the regenerated task is always actionable in the future.
    for (let cycle = 0; cycle < 120 && nextDue.getTime() <= Date.now(); cycle += 1) {
      if (chore.recurrence === "daily") nextDue.setUTCDate(nextDue.getUTCDate() + 1);
      if (chore.recurrence === "weekly") nextDue.setUTCDate(nextDue.getUTCDate() + 7);
      if (chore.recurrence === "monthly") nextDue.setUTCMonth(nextDue.getUTCMonth() + 1);
    }
    await db
      .prepare(`INSERT INTO chores
        (id, household_id, title, category, assignee_id, points, recurrence, due_at, status, completed_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NULL, ?)`) 
      .bind(
        crypto.randomUUID(), HOUSEHOLD_ID, chore.title, chore.category, chore.assignee_id,
        chore.points, chore.recurrence, nextDue.toISOString(), now,
      )
      .run();
  }
  return reward;
}

export async function payBill(billId: string, memberId: string) {
  const db = getD1();
  const bill = await db
    .prepare("SELECT id, title, due_at, status FROM bills WHERE id = ? AND household_id = ?")
    .bind(billId, HOUSEHOLD_ID)
    .first<{ id: string; title: string; due_at: string; status: string }>();
  if (!bill) throw new Error("Bill not found");
  if (bill.status !== "pending") throw new Error("This bill is already marked paid");
  const now = new Date().toISOString();
  const update = await db
    .prepare("UPDATE bills SET status = 'paid', paid_at = ?, paid_by_id = ? WHERE id = ? AND status = 'pending'")
    .bind(now, memberId, billId)
    .run();
  if (!update.meta.changes) throw new Error("This bill was just paid by someone else");
  const reward = billReward(bill.due_at, now);
  await db
    .prepare(`INSERT INTO ledger
      (id, household_id, member_id, event_type, token_delta, reference_id, note, created_at)
      VALUES (?, ?, ?, 'bill', ?, ?, ?, ?)`) 
    .bind(crypto.randomUUID(), HOUSEHOLD_ID, memberId, reward, billId, `${bill.title} marked paid`, now)
    .run();
  return reward;
}

export async function createChore(input: {
  title: string;
  category: string;
  assigneeId: string;
  points: number;
  recurrence: string;
  dueAt: string;
}) {
  const db = getD1();
  await db
    .prepare(`INSERT INTO chores
      (id, household_id, title, category, assignee_id, points, recurrence, due_at, status, completed_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NULL, ?)`) 
    .bind(
      crypto.randomUUID(),
      HOUSEHOLD_ID,
      input.title,
      input.category,
      input.assigneeId,
      Math.max(1, Math.min(30, Math.round(input.points))),
      ["daily", "weekly", "monthly"].includes(input.recurrence) ? input.recurrence : "none",
      new Date(input.dueAt).toISOString(),
      new Date().toISOString(),
    )
    .run();
}

export async function createBill(input: { title: string; amount: number; dueAt: string }) {
  const db = getD1();
  await db
    .prepare(`INSERT INTO bills
      (id, household_id, title, amount_cents, due_at, status, paid_by_id, paid_at, created_at)
      VALUES (?, ?, ?, ?, ?, 'pending', NULL, NULL, ?)`) 
    .bind(
      crypto.randomUUID(),
      HOUSEHOLD_ID,
      input.title,
      Math.round(input.amount * 100),
      new Date(input.dueAt).toISOString(),
      new Date().toISOString(),
    )
    .run();
}

export async function saveNudge(input: {
  targetMemberId: string;
  tone: string;
  message: string;
  model: string;
}) {
  await ensureDatabase();
  await getD1()
    .prepare(`INSERT INTO nudges
      (id, household_id, target_member_id, tone, message, model, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`) 
    .bind(
      crypto.randomUUID(),
      HOUSEHOLD_ID,
      input.targetMemberId,
      input.tone,
      input.message,
      input.model,
      new Date().toISOString(),
    )
    .run();
}
