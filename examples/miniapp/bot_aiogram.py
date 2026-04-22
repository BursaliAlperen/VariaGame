"""
Kurulum:
  pip install aiogram==3.* python-dotenv

.env:
  BOT_TOKEN=123456:ABC
  WEB_APP_URL=https://variagame.onrender.com/examples/miniapp/index.html
  BOT_USERNAME=MyBot

Çalıştırma:
  python examples/miniapp/bot_aiogram.py
"""

import os
import asyncio
import logging
from dotenv import load_dotenv
from aiogram import Bot, Dispatcher
from aiogram.filters import CommandStart, Command
from aiogram.filters.command import CommandObject
from aiogram.types import (
    Message,
    InlineKeyboardMarkup,
    InlineKeyboardButton,
    WebAppInfo,
    BotCommand,
)

load_dotenv()
logging.basicConfig(level=logging.INFO)

BOT_TOKEN = os.getenv("BOT_TOKEN", "")
WEB_APP_URL = os.getenv("WEB_APP_URL", "")
BOT_USERNAME = os.getenv("BOT_USERNAME", "MyBot")

if not BOT_TOKEN:
    raise RuntimeError("BOT_TOKEN eksik. .env dosyanı kontrol et.")
if not WEB_APP_URL.startswith("https://"):
    raise RuntimeError("WEB_APP_URL mutlaka https:// olmalı")

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()


def start_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="🚀 Mini App Aç",
                    web_app=WebAppInfo(url=WEB_APP_URL),
                )
            ]
        ]
    )


def build_ref_link(user_id: int) -> str:
    return f"https://t.me/{BOT_USERNAME}?start=ref_{user_id}"


@dp.message(CommandStart())
async def start_handler(message: Message, command: CommandObject) -> None:
    user_id = message.from_user.id
    ref_link = build_ref_link(user_id)

    deep_link = command.args  # /start <args>
    if deep_link and deep_link.startswith("ref_"):
        inviter_id = deep_link.replace("ref_", "", 1)
        await message.answer(f"🎉 Referans ile giriş algılandı: {inviter_id}")

    text = (
        "Merhaba! 👋\n\n"
        "Aşağıdaki butona basıp Mini App'i açabilirsin.\n"
        f"Kişisel davet linkin:\n{ref_link}"
    )
    await message.answer(text, reply_markup=start_keyboard())


@dp.message(Command("help"))
async def help_handler(message: Message) -> None:
    await message.answer("Komutlar:\n/start - Karşılama ve Mini App butonu\n/help - Yardım")


async def on_startup() -> None:
    await bot.set_my_commands(
        [
            BotCommand(command="start", description="Botu başlat"),
            BotCommand(command="help", description="Yardım"),
        ]
    )
    logging.info("Bot commands set: /start, /help")


async def main() -> None:
    await on_startup()
    await dp.start_polling(bot, allowed_updates=dp.resolve_used_update_types())


if __name__ == "__main__":
    asyncio.run(main())
