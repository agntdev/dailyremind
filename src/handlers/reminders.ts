import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { getOwnerConfig, getSchedule, addReminder, addLog } from "../storage.js";

const composer = new Composer<Ctx>();

// Check for due reminders every minute
async function checkReminders(bot: { api: { sendMessage: (chatId: string, text: string) => Promise<unknown> } }) {
  const config = await getOwnerConfig();
  if (!config) return;

  const schedule = await getSchedule();
  if (schedule.length === 0) return;

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const currentDay = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][now.getDay()];

  for (const entry of schedule) {
    if (entry.time === currentTime && entry.days.includes(currentDay)) {
      try {
        await bot.api.sendMessage(config.channelId, entry.messageText);
        await addReminder({
          scheduledTime: entry.time,
          actualPostTime: now.toISOString(),
          messageText: entry.messageText,
          status: "posted",
        });
        await addLog({
          timestamp: now.toISOString(),
          eventType: "reminder_posted",
          description: `Posted: ${entry.messageText}`,
        });
      } catch (err) {
        const error = err as { response?: { description?: string } };
        const reason = error.response?.description ?? "Unknown error";
        await addReminder({
          scheduledTime: entry.time,
          actualPostTime: now.toISOString(),
          messageText: entry.messageText,
          status: "failed",
        });
        await addLog({
          timestamp: now.toISOString(),
          eventType: "reminder_failed",
          description: `Failed to post: ${reason}`,
        });
        // Notify owner of failure
        try {
          await bot.api.sendMessage(
            String(config.ownerUserId),
            `⚠️ Failed to post reminder\n\nChannel: ${config.channelId}\nTime: ${entry.time}\nMessage: ${entry.messageText}\n\nError: ${reason}`,
          );
        } catch {
          // Owner notification also failed — log it
          await addLog({
            timestamp: now.toISOString(),
            eventType: "owner_notification_failed",
            description: `Could not notify owner of posting failure`,
          });
        }
      }
    }
  }
}

// Export for external cron integration
export { checkReminders };

// Register the handler for manual triggering (for testing)
composer.command("check_reminders", async (ctx) => {
  const config = await getOwnerConfig();
  if (!config) {
    await ctx.reply("Bot is not configured yet. Run /start first.");
    return;
  }

  const schedule = await getSchedule();
  if (schedule.length === 0) {
    await ctx.reply("No schedule configured. Run /start to set up your schedule.");
    return;
  }

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const dueNow = schedule.filter((e) => e.time === currentTime);
  if (dueNow.length === 0) {
    await ctx.reply(`No reminders due at ${currentTime}. Next scheduled: ${schedule[0]?.time ?? "none"}`);
    return;
  }

  let posted = 0;
  let failed = 0;

  for (const entry of dueNow) {
    try {
      await ctx.api.sendMessage(config.channelId, entry.messageText);
      posted++;
      await addReminder({
        scheduledTime: entry.time,
        actualPostTime: now.toISOString(),
        messageText: entry.messageText,
        status: "posted",
      });
    } catch {
      failed++;
      await addReminder({
        scheduledTime: entry.time,
        actualPostTime: now.toISOString(),
        messageText: entry.messageText,
        status: "failed",
      });
    }
  }

  await ctx.reply(`Checked reminders at ${currentTime}:\n• Posted: ${posted}\n• Failed: ${failed}`);
});

export default composer;
