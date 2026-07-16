import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, mainMenuKeyboard } from "../toolkit/index.js";
import { getOwnerConfig, setSchedule, addLog } from "../storage.js";

const composer = new Composer<Ctx>();

// Slash command entry point
composer.command("update_schedule", async (ctx) => {
  const config = await getOwnerConfig();
  if (!config) {
    await ctx.reply(
      "⚠️ You haven't set up the bot yet. Please run /start to configure your channel and schedule first.",
      { reply_markup: mainMenuKeyboard() },
    );
    return;
  }

  ctx.session.step = "updating_schedule";
  await ctx.reply(
    "📅 Send me your updated schedule. Use this format:\n\n```\n09:00 Daily standup\n14:00 Team sync\n17:00 End of day review\n```\n\nThis will replace your existing schedule.",
    {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Cancel", "menu:main")]]),
      parse_mode: "Markdown",
    },
  );
});

// Button entry from main menu
composer.callbackQuery("schedule:update", async (ctx) => {
  await ctx.answerCallbackQuery();
  const config = await getOwnerConfig();
  if (!config) {
    await ctx.editMessageText(
      "⚠️ You haven't set up the bot yet. Please tap ⚙️ Setup first to configure your channel and schedule.",
      { reply_markup: mainMenuKeyboard() },
    );
    return;
  }

  ctx.session.step = "updating_schedule";
  await ctx.editMessageText(
    "📅 Send me your updated schedule. Use this format:\n\n```\n09:00 Daily standup\n14:00 Team sync\n17:00 End of day review\n```\n\nThis will replace your existing schedule.",
    {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Cancel", "menu:main")]]),
      parse_mode: "Markdown",
    },
  );
});

// Handle the new schedule text
composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "updating_schedule") return next();

  const scheduleText = ctx.message.text.trim();
  if (!scheduleText) {
    await ctx.reply("Please provide your updated schedule.");
    return;
  }

  const entries = parseSchedule(scheduleText);
  if (entries.length === 0) {
    await ctx.reply(
      "I couldn't parse any schedule entries. Please use the format:\n\nHH:MM Description\n\nFor example:\n09:00 Daily standup\n14:00 Team sync",
    );
    return;
  }

  await setSchedule(entries);

  await addLog({
    timestamp: new Date().toISOString(),
    eventType: "schedule_updated",
    description: `Schedule updated: ${entries.length} entries`,
  });

  ctx.session.step = "idle";

  const scheduleSummary = entries.map((e) => `${e.time} — ${e.messageText}`).join("\n");

  await ctx.reply(
    `✅ Schedule updated!\n\nNew schedule:\n${scheduleSummary}\n\nReminders will follow this new schedule.`,
    { reply_markup: mainMenuKeyboard() },
  );
});

function parseSchedule(text: string): Array<{ days: string[]; time: string; messageText: string; isRecurring: boolean }> {
  const lines = text.split("\n").filter((l) => l.trim());
  const entries: Array<{ days: string[]; time: string; messageText: string; isRecurring: boolean }> = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^(\d{1,2}:\d{2})\s+(.+)$/);
    if (match) {
      entries.push({
        days: ["mon", "tue", "wed", "thu", "fri"],
        time: match[1],
        messageText: match[2],
        isRecurring: true,
      });
    }
  }

  return entries;
}

export default composer;
