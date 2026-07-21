export const HOUSEHOLD_ID = "hh-sunrise";

export const seedMembers = [
  { id: "m-ananya", name: "Ananya", role: "Planner", color: "#7865f4" },
  { id: "m-rahul", name: "Rahul", role: "Bill keeper", color: "#ff6a3d" },
  { id: "m-zoya", name: "Zoya", role: "Kitchen lead", color: "#18a999" },
  { id: "m-dev", name: "Dev", role: "Supplies", color: "#d19b00" },
];

function isoFromNow(days: number, hours = 0) {
  return new Date(Date.now() + days * 86_400_000 + hours * 3_600_000).toISOString();
}

export function createSeedData() {
  return {
    household: { id: HOUSEHOLD_ID, name: "Sunrise House" },
    members: seedMembers,
    chores: [
      { id: "c-dishes", title: "Load the dishwasher", category: "Kitchen", assigneeId: "m-zoya", points: 12, recurrence: "daily", dueAt: isoFromNow(0, 6), status: "pending" },
      { id: "c-groceries", title: "Weekly grocery run", category: "Errands", assigneeId: "m-dev", points: 18, recurrence: "weekly", dueAt: isoFromNow(1, 3), status: "pending" },
      { id: "c-laundry", title: "Fold shared laundry", category: "Cleaning", assigneeId: "m-rahul", points: 10, recurrence: "weekly", dueAt: isoFromNow(-1, 2), status: "pending" },
      { id: "c-plants", title: "Water balcony plants", category: "Home", assigneeId: "m-ananya", points: 7, recurrence: "weekly", dueAt: isoFromNow(2), status: "pending" },
      { id: "c-bathroom", title: "Clean the bathroom", category: "Cleaning", assigneeId: "m-dev", points: 16, recurrence: "weekly", dueAt: isoFromNow(-2), status: "completed", completedAt: isoFromNow(-2, -4) },
      { id: "c-trash", title: "Take out recycling", category: "Home", assigneeId: "m-zoya", points: 8, recurrence: "weekly", dueAt: isoFromNow(-3), status: "completed", completedAt: isoFromNow(-3, -10) },
    ],
    bills: [
      { id: "b-rent", title: "July rent", amountCents: 3200000, dueAt: isoFromNow(4), status: "pending" },
      { id: "b-electric", title: "Electricity", amountCents: 486000, dueAt: isoFromNow(2), status: "pending" },
      { id: "b-wifi", title: "Wi-Fi", amountCents: 119900, dueAt: isoFromNow(-4), status: "paid", paidById: "m-rahul", paidAt: isoFromNow(-7) },
    ],
    ledger: [
      { id: "l-1", memberId: "m-zoya", eventType: "chore", tokenDelta: 10, referenceId: "c-trash", note: "Recycling completed early", createdAt: isoFromNow(-3, -10) },
      { id: "l-2", memberId: "m-dev", eventType: "chore", tokenDelta: 20, referenceId: "c-bathroom", note: "Bathroom completed early", createdAt: isoFromNow(-2, -4) },
      { id: "l-3", memberId: "m-rahul", eventType: "bill", tokenDelta: 8, referenceId: "b-wifi", note: "Wi-Fi paid three days early", createdAt: isoFromNow(-7) },
      { id: "l-4", memberId: "m-ananya", eventType: "streak", tokenDelta: 14, referenceId: null, note: "Seven-day response streak", createdAt: isoFromNow(-1) },
      { id: "l-5", memberId: "m-zoya", eventType: "streak", tokenDelta: 6, referenceId: null, note: "Helpful hand-off bonus", createdAt: isoFromNow(-5) },
    ],
  };
}
