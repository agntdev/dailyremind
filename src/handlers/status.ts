import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, mainMenuKeyboard } from "../toolkit/index.js";
import { getOwnerConfig, getSchedule, getLogs } from "../storage.js";

const composer = new Composer<Ctx>();

// Slash command entry point
composer.command("status", async (ctx) => {
  await showStatus(ctx);
});

// Button entry from main menu
composer.callbackQuery("status:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  await showStatusEdit(ctx);
});

async function showStatus(ctx: Ctx) {
  const config = await getOwnerConfig();
  const schedule = await getSchedule();
  const logs = await getLogs();

  if (!config) {
    await ctx.reply(
      "📊 Status\n\nBot is not configured yet. Tap ⚙️ Setup to get started.",
      { reply_markup: mainMenuKeyboard() },
    );
    return;
  }

  const recentLogs = logs.slice(-5).reverse();
  const logLines = recentLogs.length > 0
    ? recentLogs.map((l) => `• ${l.timestamp.slice(11, 16)} — ${l.eventType}`).join("\n")
    : "No activity yet";

  const scheduleLines = schedule.length > 0
    ? schedule.map((e) => `${e.time} — ${e.messageText}`).join("\n")
    : "No schedule configured";

  await ctx.reply(
    `📊 Status\n\n` +
    `Channel: ${config.channelId}\n` +
    `Timezone: ${config.timezone}\n` +
    `Schedule entries: ${schedule.length}\n\n` +
    `📅 Current schedule:\n${scheduleLines}\n\n` +
    `📝 Recent activity:\n${logLines}`,
    { reply_markup: mainMenuKeyboard() },
  );
}

async function showStatusEdit(ctx: Ctx) {
  const config = await getOwnerConfig();
  const schedule = await getSchedule();
  const logs = await getLogs();

  if (!config) {
    await ctx.editMessageText(
      "📊 Status\n\nBot is not configured yet. Tap ⚙️ Setup to get started.",
      { reply_markup: mainMenuKeyboard() },
    );
    return;
  }

  const recentLogs = logs.slice(-5).reverse();
  const logLines = recentLogs.length > 0
    ? recentLogs.map((l) => `• ${l.timestamp.slice(11, 16)} — ${l.eventType}`).join("\n")
    : "No activity yet";

  const scheduleLines = schedule.length > 0
    ? schedule.map((e) => `${e.time} — ${e.messageText}`).join("\n")
    : "No schedule configured";

  await ctx.editMessageText(
    `📊 Status\n\n` +
    `Channel: ${config.channelId}\n` +
    `Timezone: ${config.timezone}\n` +
    `Schedule entries: ${schedule.length}\n\n` +
    `📅 Current schedule:\n${scheduleLines}\n\n` +
    `📝 Recent activity:\n${logLines}`,
    { reply_markup: mainMenuKeyboard() },
  );
}

export default composer;
