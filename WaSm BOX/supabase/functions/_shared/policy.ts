export class AppError extends Error {
  constructor(public code: string, message: string, public status = 400) {
    super(message);
  }
}
export function checkBot(
  bot: { status: string; is_published: boolean; deleted_at?: string | null },
  production = true,
) {
  if (bot.deleted_at) throw new AppError("BOT_NOT_FOUND", "Bot not found", 404);
  if (bot.status === "BLOCKED") {
    throw new AppError("BOT_BLOCKED", "This bot is blocked.", 403);
  }
  if (bot.status === "DISABLED") {
    throw new AppError("BOT_DISABLED", "This bot is currently disabled.", 403);
  }
  if (production && (!bot.is_published || bot.status !== "ACTIVE")) {
    throw new AppError("BOT_NOT_PUBLISHED", "This bot is not published.", 403);
  }
}
export function checkKey(
  key: {
    revoked_at?: string | null;
    scopes: string[];
    allowed_bot_ids: string[] | null;
    user_id: string;
  },
  bot: { id: string; user_id: string },
  scope: string,
) {
  if (key.revoked_at) {
    throw new AppError("API_KEY_REVOKED", "API key revoked.", 401);
  }
  if (
    key.user_id !== bot.user_id || !key.scopes.includes(scope) ||
    (key.allowed_bot_ids && !key.allowed_bot_ids.includes(bot.id))
  ) throw new AppError("FORBIDDEN", "Key cannot access this bot.", 403);
}
export function domainAllowed(domains: string[], origin: string | null) {
  if (!domains.length) return true;
  if (!origin) return false;
  try {
    return domains.map((x) => x.toLowerCase()).includes(
      new URL(origin).host.toLowerCase(),
    );
  } catch {
    return false;
  }
}
export function checkOwner(bot: { user_id: string }, userId: string) {
  if (bot.user_id !== userId) {
    throw new AppError("FORBIDDEN", "You do not own this bot.", 403);
  }
}
