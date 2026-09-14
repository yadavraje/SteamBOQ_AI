PRAGMA foreign_keys = ON;

CREATE TABLE `users` (
  `id` text PRIMARY KEY NOT NULL,
  `email` text NOT NULL,
  `display_name` text,
  `auth_provider` text NOT NULL DEFAULT 'chatgpt',
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  `last_seen_at` text NOT NULL
);

CREATE UNIQUE INDEX `users_provider_email_unique` ON `users` (`auth_provider`, `email`);

CREATE TABLE `projects` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `name` text NOT NULL,
  `payload` text NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE cascade ON DELETE cascade
);

CREATE INDEX `projects_user_updated_idx` ON `projects` (`user_id`, `updated_at`);

CREATE TABLE `feedback` (
  `id` text PRIMARY KEY NOT NULL,
  `submitted_at` text NOT NULL,
  `user_id` text NOT NULL,
  `rating` integer NOT NULL,
  `category` text NOT NULL,
  `comment` text NOT NULL,
  `role` text NOT NULL,
  `email` text,
  `follow_up_consent` integer NOT NULL DEFAULT 0,
  `calculation_context` text,
  `app_version` text NOT NULL,
  `status` text NOT NULL DEFAULT 'new',
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE cascade ON DELETE cascade,
  CONSTRAINT `feedback_rating_check` CHECK (`rating` >= 1 AND `rating` <= 5),
  CONSTRAINT `feedback_follow_up_check` CHECK (`follow_up_consent` IN (0, 1))
);

CREATE INDEX `feedback_status_submitted_idx` ON `feedback` (`status`, `submitted_at`);

PRAGMA optimize;
