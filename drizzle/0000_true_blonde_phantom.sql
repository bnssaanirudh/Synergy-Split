CREATE TABLE `bills` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`title` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`due_at` text NOT NULL,
	`status` text NOT NULL,
	`paid_by_id` text,
	`paid_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chores` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`assignee_id` text,
	`points` integer NOT NULL,
	`due_at` text NOT NULL,
	`status` text NOT NULL,
	`completed_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `households` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`member_id` text NOT NULL,
	`event_type` text NOT NULL,
	`token_delta` integer NOT NULL,
	`reference_id` text,
	`note` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`color` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `nudges` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`target_member_id` text NOT NULL,
	`tone` text NOT NULL,
	`message` text NOT NULL,
	`model` text NOT NULL,
	`created_at` text NOT NULL
);
