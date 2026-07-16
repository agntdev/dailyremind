import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";

const composer = new Composer<Ctx>();

const HELP =
  "ℹ️ How to use this bot:\n\n" +
  "1. Tap ⚙️ Setup to connect your channel and add your schedule\n" +
  "2. Reminders are posted automatically at scheduled times\n" +
  "3. Tap 📅 Update schedule to change your reminders\n" +
  "4. Tap 📊 Status to see logs and configuration\n\n" +
  "Need help? Tap /start to open the menu.";

const backToMenu = inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]);

composer.command("help", async (ctx) => {
  await ctx.reply(HELP);
});

composer.callbackQuery("menu:help", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(HELP, { reply_markup: backToMenu });
});

export default composer;
