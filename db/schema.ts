import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const households = sqliteTable("households", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: text("created_at").notNull(),
});

export const members = sqliteTable("members", {
  id: text("id").primaryKey(),
  householdId: text("household_id").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  color: text("color").notNull(),
  createdAt: text("created_at").notNull(),
});

export const chores = sqliteTable("chores", {
  id: text("id").primaryKey(),
  householdId: text("household_id").notNull(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  assigneeId: text("assignee_id"),
  points: integer("points").notNull(),
  recurrence: text("recurrence").notNull().default("none"),
  dueAt: text("due_at").notNull(),
  status: text("status").notNull(),
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull(),
});

export const bills = sqliteTable("bills", {
  id: text("id").primaryKey(),
  householdId: text("household_id").notNull(),
  title: text("title").notNull(),
  amountCents: integer("amount_cents").notNull(),
  dueAt: text("due_at").notNull(),
  status: text("status").notNull(),
  paidById: text("paid_by_id"),
  paidAt: text("paid_at"),
  createdAt: text("created_at").notNull(),
});

export const ledger = sqliteTable("ledger", {
  id: text("id").primaryKey(),
  householdId: text("household_id").notNull(),
  memberId: text("member_id").notNull(),
  eventType: text("event_type").notNull(),
  tokenDelta: integer("token_delta").notNull(),
  referenceId: text("reference_id"),
  note: text("note").notNull(),
  createdAt: text("created_at").notNull(),
});

export const nudges = sqliteTable("nudges", {
  id: text("id").primaryKey(),
  householdId: text("household_id").notNull(),
  targetMemberId: text("target_member_id").notNull(),
  tone: text("tone").notNull(),
  message: text("message").notNull(),
  model: text("model").notNull(),
  createdAt: text("created_at").notNull(),
});
