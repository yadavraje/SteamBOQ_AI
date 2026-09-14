CREATE TABLE `calculation_history` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `project_name` text NOT NULL,
  `method` text NOT NULL,
  `trigger_type` text NOT NULL,
  `steam_demand` real NOT NULL,
  `steam_pipe_nb` integer NOT NULL,
  `pressure_drop_bar` real NOT NULL,
  `boq_value_inr` real NOT NULL,
  `rate_as_of` text,
  `engine_version` text NOT NULL,
  `payload` text NOT NULL,
  `created_at` text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE cascade ON DELETE cascade,
  CONSTRAINT `history_trigger_check` CHECK (`trigger_type` IN ('calculated', 'scenario_saved'))
);

CREATE INDEX `calculation_history_user_created_idx`
  ON `calculation_history` (`user_id`, `created_at`, `id`);

PRAGMA optimize;
