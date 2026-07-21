export type MemberMetrics = {
  id: string;
  name: string;
  tokens: number;
  choreTokens: number;
  billTokens: number;
  completedChores: number;
  paidBills: number;
  contributionScore: number;
  reputation: number;
  fairShareGap: number;
};

export function choreReward(points: number, dueAt: string, completedAt: string) {
  const due = new Date(dueAt).getTime();
  const completed = new Date(completedAt).getTime();
  const hoursFromDue = (due - completed) / 3_600_000;
  const timeliness = hoursFromDue >= 12 ? 1.25 : hoursFromDue >= 0 ? 1 : 0.7;
  return Math.max(1, Math.round(points * timeliness));
}

export function billReward(dueAt: string, paidAt: string) {
  const due = new Date(dueAt).getTime();
  const paid = new Date(paidAt).getTime();
  const daysEarly = (due - paid) / 86_400_000;
  return daysEarly >= 3 ? 8 : daysEarly >= 0 ? 6 : 3;
}

export function fairnessScore(metrics: Pick<MemberMetrics, "tokens">[]) {
  if (!metrics.length) return 100;
  const values = metrics.map((member) => Math.max(0, member.tokens));
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (mean === 0) return 100;
  let pairwise = 0;
  for (const left of values) {
    for (const right of values) pairwise += Math.abs(left - right);
  }
  const gini = pairwise / (2 * values.length * values.length * mean);
  return Math.max(0, Math.round((1 - gini) * 100));
}

export function contributionScore(
  memberTokens: number,
  totalTokens: number,
  memberCount: number,
) {
  if (!totalTokens || !memberCount) return 100;
  const actualShare = memberTokens / totalTokens;
  const expectedShare = 1 / memberCount;
  return Math.max(0, Math.min(140, Math.round((actualShare / expectedShare) * 100)));
}

export function fairShareGap(
  memberTokens: number,
  totalTokens: number,
  memberCount: number,
) {
  if (!memberCount) return 0;
  return Math.round(totalTokens / memberCount - memberTokens);
}

export function reputationFromScore(score: number, prior = 82) {
  return Math.max(0, Math.min(100, Math.round(prior * 0.7 + Math.min(score, 100) * 0.3)));
}
