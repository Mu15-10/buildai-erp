CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`action` varchar(100) NOT NULL,
	`entityType` varchar(100),
	`entityId` int,
	`changes` json,
	`ipAddress` varchar(45),
	`userAgent` text,
	`location` varchar(255),
	`fingerprint` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `budgetTracking` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`materialCategory` varchar(100) NOT NULL,
	`budgetedAmount` decimal(15,2) NOT NULL,
	`spentAmount` decimal(15,2) DEFAULT '0',
	`projectionPercentage` decimal(5,2) DEFAULT '0',
	`projectCompletionPercentage` decimal(5,2) DEFAULT '0',
	`alertThreshold` decimal(5,2) DEFAULT '10',
	`lastAlertSent` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `budgetTracking_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `materials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` varchar(100),
	`quantity` decimal(15,2) NOT NULL,
	`unit` varchar(50),
	`unitPrice` decimal(15,2),
	`budgetedQuantity` decimal(15,2),
	`status` enum('ordered','received','used','returned') NOT NULL DEFAULT 'ordered',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `materials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`status` enum('planning','active','paused','completed','cancelled') NOT NULL DEFAULT 'planning',
	`startDate` timestamp,
	`endDate` timestamp,
	`budget` decimal(15,2),
	`location` varchar(255),
	`managerId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`type` enum('expense','income','adjustment') NOT NULL,
	`category` varchar(100),
	`amount` decimal(15,2) NOT NULL,
	`description` text,
	`invoiceUrl` varchar(512),
	`status` enum('pending','approved','rejected','reconciled') NOT NULL DEFAULT 'pending',
	`createdBy` int NOT NULL,
	`approvedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `voiceCommands` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`projectId` int,
	`audioUrl` varchar(512),
	`transcription` text,
	`extractedData` json,
	`confidence` decimal(3,2),
	`status` enum('pending','processed','failed','manual_review') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`processedAt` timestamp,
	CONSTRAINT `voiceCommands_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','engineer','accountant','manager') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `departmentId` int;--> statement-breakpoint
CREATE INDEX `audit_user_idx` ON `auditLogs` (`userId`);--> statement-breakpoint
CREATE INDEX `audit_action_idx` ON `auditLogs` (`action`);--> statement-breakpoint
CREATE INDEX `audit_entity_idx` ON `auditLogs` (`entityType`,`entityId`);--> statement-breakpoint
CREATE INDEX `budget_project_idx` ON `budgetTracking` (`projectId`);--> statement-breakpoint
CREATE INDEX `budget_category_idx` ON `budgetTracking` (`materialCategory`);--> statement-breakpoint
CREATE INDEX `material_project_idx` ON `materials` (`projectId`);--> statement-breakpoint
CREATE INDEX `material_category_idx` ON `materials` (`category`);--> statement-breakpoint
CREATE INDEX `project_status_idx` ON `projects` (`status`);--> statement-breakpoint
CREATE INDEX `project_manager_idx` ON `projects` (`managerId`);--> statement-breakpoint
CREATE INDEX `transaction_project_idx` ON `transactions` (`projectId`);--> statement-breakpoint
CREATE INDEX `transaction_type_idx` ON `transactions` (`type`);--> statement-breakpoint
CREATE INDEX `transaction_status_idx` ON `transactions` (`status`);--> statement-breakpoint
CREATE INDEX `voice_user_idx` ON `voiceCommands` (`userId`);--> statement-breakpoint
CREATE INDEX `voice_status_idx` ON `voiceCommands` (`status`);--> statement-breakpoint
CREATE INDEX `openId_idx` ON `users` (`openId`);--> statement-breakpoint
CREATE INDEX `role_idx` ON `users` (`role`);