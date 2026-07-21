import {
  completeChore,
  createBill,
  createChore,
  ensureDatabase,
  getSnapshot,
  payBill,
  resetDatabase,
} from "@/lib/household-store";

export const dynamic = "force-dynamic";

function badRequest(message: string) {
  return Response.json({ error: message }, { status: 400 });
}

export async function GET() {
  try {
    return Response.json({ snapshot: await getSnapshot() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load the household";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureDatabase();
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action ?? "");
    let reward: number | undefined;

    if (action === "complete_chore") {
      const choreId = String(body.choreId ?? "");
      const memberId = String(body.memberId ?? "");
      if (!choreId || !memberId) return badRequest("choreId and memberId are required");
      reward = await completeChore(choreId, memberId);
    } else if (action === "pay_bill") {
      const billId = String(body.billId ?? "");
      const memberId = String(body.memberId ?? "");
      if (!billId || !memberId) return badRequest("billId and memberId are required");
      reward = await payBill(billId, memberId);
    } else if (action === "create_chore") {
      const title = String(body.title ?? "").trim();
      const category = String(body.category ?? "Home").trim();
      const assigneeId = String(body.assigneeId ?? "");
      const dueAt = String(body.dueAt ?? "");
      const points = Number(body.points ?? 10);
      const recurrence = String(body.recurrence ?? "none");
      if (!title || !assigneeId || !dueAt || Number.isNaN(points)) {
        return badRequest("title, assigneeId, dueAt and points are required");
      }
      await createChore({ title, category, assigneeId, dueAt, points, recurrence });
    } else if (action === "create_bill") {
      const title = String(body.title ?? "").trim();
      const dueAt = String(body.dueAt ?? "");
      const amount = Number(body.amount ?? 0);
      if (!title || !dueAt || !Number.isFinite(amount) || amount <= 0) {
        return badRequest("title, a positive amount and dueAt are required");
      }
      await createBill({ title, dueAt, amount });
    } else if (action === "reset_demo") {
      await resetDatabase();
    } else {
      return badRequest("Unknown action");
    }

    return Response.json({ snapshot: await getSnapshot(), reward });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The update could not be completed";
    return Response.json({ error: message }, { status: 409 });
  }
}
