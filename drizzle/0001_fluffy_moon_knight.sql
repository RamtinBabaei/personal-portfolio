ALTER TABLE `inquiries` ADD `details` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `inquiries` ADD `stage` text DEFAULT 'new' NOT NULL;--> statement-breakpoint
ALTER TABLE `inquiries` ADD `isRead` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `inquiries` ADD `archived` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `inquiries` ADD `privateNotes` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `inquiries` ADD `meetingAt` integer;--> statement-breakpoint
ALTER TABLE `inquiries` ADD `meetingNotes` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `inquiries` ADD `followUpAt` integer;--> statement-breakpoint
ALTER TABLE `inquiries` ADD `nextAction` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `inquiries` ADD `updatedAt` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `inquiries` ADD `notificationAttempts` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `inquiries` ADD `firstNotificationAt` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `inquiries` ADD `nextNotificationAt` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `inquiries` ADD `notificationLeaseUntil` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `inquiries` ADD `notificationLease` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `inquiries` ADD `lastNotificationError` text;--> statement-breakpoint
CREATE INDEX `inquiries_outbox` ON `inquiries` (`status`,`nextNotificationAt`);--> statement-breakpoint
CREATE INDEX `inquiries_workflow` ON `inquiries` (`archived`,`stage`,`createdAt`);