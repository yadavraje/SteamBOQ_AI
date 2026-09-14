/**
 * SteamBOQ public-beta D1 schema contract.
 * Runtime migrations live in ../drizzle and are the deployment source of truth.
 */
export const schema = {
  users: {
    primaryKey: "id",
    fields: ["id", "email", "display_name", "auth_provider", "created_at", "updated_at", "last_seen_at"]
  },
  projects: {
    primaryKey: "id",
    ownerKey: "user_id",
    fields: ["id", "user_id", "name", "payload", "created_at", "updated_at"]
  },
  calculationHistory: {
    primaryKey: "id",
    ownerKey: "user_id",
    fields: [
      "id", "user_id", "project_name", "method", "trigger_type", "steam_demand",
      "steam_pipe_nb", "pressure_drop_bar", "boq_value_inr", "rate_as_of",
      "engine_version", "payload", "created_at"
    ]
  },
  feedback: {
    primaryKey: "id",
    ownerKey: "user_id",
    fields: [
      "id", "submitted_at", "user_id", "rating", "category", "comment", "role", "email",
      "follow_up_consent", "calculation_context", "app_version", "status"
    ]
  }
} as const;
