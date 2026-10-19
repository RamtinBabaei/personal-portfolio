CREATE TABLE `entries` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`slug` text NOT NULL,
	`status` text NOT NULL,
	`featured` integer NOT NULL,
	`sortOrder` integer NOT NULL,
	`data` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `entries_kind_slug` ON `entries` (`kind`,`slug`);--> statement-breakpoint
CREATE INDEX `entries_published` ON `entries` (`kind`,`status`,`sortOrder`);--> statement-breakpoint
CREATE TABLE `inquiries` (
	`id` text PRIMARY KEY NOT NULL,
	`idempotencyKey` text NOT NULL,
	`fingerprint` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`subject` text NOT NULL,
	`message` text NOT NULL,
	`status` text NOT NULL,
	`createdAt` integer NOT NULL,
	`providerId` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `inquiries_idempotencyKey_unique` ON `inquiries` (`idempotencyKey`);--> statement-breakpoint
CREATE INDEX `inquiries_created` ON `inquiries` (`createdAt`);--> statement-breakpoint
CREATE TABLE `media` (
	`id` text PRIMARY KEY NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rate_buckets` (
	`id` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expiresAt` integer NOT NULL
);
