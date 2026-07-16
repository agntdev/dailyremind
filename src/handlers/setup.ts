import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, mainMenuKeyboard } from "../toolkit/index.js";
import { getOwnerConfig, setOwnerConfig, setSchedule, addLog } from "../storage.js";

const composer = new Composer<Ctx>();

composer.callbackQuery("setup:start", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    "⚙️ Let's set up your reminder bot.\n\nFirst, I need the Telegram channel where reminders will be posted.\n\nPlease send me the channel's username (e.g. @mychannel) or its numeric ID (e.g. -1001234567890).\n\nNote: You must add this bot as an administrator in the channel with posting permissions.",
    { reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]) },
  );
  ctx.session.step = "awaiting_channel";
});

composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "awaiting_channel") return next();

  const channelId = ctx.message.text.trim();
  if (!channelId) {
    await ctx.reply("Please provide a valid channel username or ID.");
    return;
  }

  // Validate the channel format
  if (!/^@[\w]+$/.test(channelId) && !/^-?\d+$/.test(channelId)) {
    await ctx.reply(
      "That doesn't look like a valid channel. Use a @username or numeric ID (e.g. -1001234567890).",
    );
    return;
  }

  ctx.session.channelId = channelId;

  // Try to send a test message to validate permissions
  try {
    await ctx.api.sendMessage(channelId, "✅ Bot connected successfully! Reminders will be posted here.");
  } catch (err) {
    const error = err as { response?: { description?: string } };
    const reason = error.response?.description ?? "Unknown error";
    await addLog({
      timestamp: new Date().toISOString(),
      eventType: "channel_validation_failed",
      description: `Failed to post to ${channelId}: ${reason}`,
    });
    await ctx.reply(
      `I couldn't post to that channel. Make sure I'm added as an administrator with posting permissions.\n\nError: ${reason}\n\nFix the permissions and try again, or enter a different channel.`,
    );
    return;
  }

  await addLog({
    timestamp: new Date().toISOString(),
    eventType: "channel_validated",
    description: `Channel ${channelId} validated successfully`,
  });

  ctx.session.step = "awaiting_schedule";
  await ctx.reply(
    "✅ Channel connected!\n\nNow, please send me your daily schedule. Use this format:\n\n```\n09:00 Daily standup\n14:00 Team sync\n17:00 End of day review\n```\n\nOr describe your schedule in plain text and I'll parse it.",
    {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
      parse_mode: "Markdown",
    },
  );
});

composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "awaiting_schedule") return next();

  const scheduleText = ctx.message.text.trim();
  if (!scheduleText) {
    await ctx.reply("Please provide your schedule.");
    return;
  }

  // Parse the schedule entries
  const entries = parseSchedule(scheduleText);
  if (entries.length === 0) {
    await ctx.reply(
      "I couldn't parse any schedule entries. Please use the format:\n\nHH:MM Description\n\nFor example:\n09:00 Daily standup\n14:00 Team sync",
    );
    return;
  }

  const channelId = ctx.session.channelId ?? "";
  const timezone = "UTC"; // Default timezone

  // Save the owner config
  await setOwnerConfig({
    ownerUserId: ctx.from.id,
    channelId,
    timezone,
  });

  // Save the schedule entries
  await setSchedule(entries);

  await addLog({
    timestamp: new Date().toISOString(),
    eventType: "setup_complete",
    description: `Setup complete. Channel: ${channelId}, ${entries.length} schedule entries`,
  });

  ctx.session.step = "idle";
  ctx.session.channelId = undefined;

  const scheduleSummary = entries
    .map((e) => `${e.time} — ${e.messageText}`)
    .join("\n");

  await ctx.reply(
    `✅ Setup complete!\n\nChannel: ${channelId}\nSchedule:\n${scheduleSummary}\n\nReminders will be posted automatically at the scheduled times.`,
    { reply_markup: mainMenuKeyboard() },
  );
});

function parseSchedule(text: string): Array<{ days: string[]; time: string; messageText: string; isRecurring: boolean }> {
  const lines = text.split("\n").filter((l) => l.trim());
  const entries: Array<{ days: string[]; time: string; messageText: string; isRecurring: boolean }> = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Try to match "HH:MM description" pattern
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
