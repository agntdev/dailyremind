import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { mainMenuKeyboard } from "../toolkit/index.js";
import { registerMainMenuItem } from "../toolkit/index.js";

// Register menu items for features.
// The setup button comes first (order: 10), then update schedule (20), status (30).
registerMainMenuItem({ label: "⚙️ Setup", data: "setup:start", order: 10 });
registerMainMenuItem({ label: "📅 Update schedule", data: "schedule:update", order: 20 });
registerMainMenuItem({ label: "📊 Status", data: "status:show", order: 30 });

const WELCOME = "👋 Welcome! Tap a button below to get started.";

const composer = new Composer<Ctx>();

composer.command("start", async (ctx) => {
  ctx.session.step = "idle";
  ctx.session.channelId = undefined;
  ctx.session.scheduleText = undefined;
  await ctx.reply(WELCOME, { reply_markup: mainMenuKeyboard() });
});

composer.callbackQuery("menu:main", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "idle";
  ctx.session.channelId = undefined;
  ctx.session.scheduleText = undefined;
  await ctx.editMessageText(WELCOME, { reply_markup: mainMenuKeyboard() });
});

export default composer;
