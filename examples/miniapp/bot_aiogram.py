"""
Kurulum:
  pip install aiogram==3.* python-dotenv

.env:
  BOT_TOKEN=123456:ABC
  WEB_APP_URL=https://variagame.onrender.com/examples/miniapp/index.html
  BOT_USERNAME=MyBot
"""

import os
import logging
from aiogram import Bot, Dispatcher, F
from aiogram.types import Message, InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from aiogram.filters import CommandStart
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO)

BOT_TOKEN = os.getenv("BOT_TOKEN", "")
WEB_APP_URL = os.getenv("WEB_APP_URL", "")
BOT_USERNAME = os.getenv("BOT_USERNAME", "MyBot")

if not BOT_TOKEN:
    raise RuntimeError("BOT_TOKEN eksik")
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


@dp.message(CommandStart())
async def start_handler(message: Message) -> None:
    user_id = message.from_user.id
    ref_link = f"https://t.me/{BOT_USERNAME}?start=ref_{user_id}"

    text = (
        "Merhaba!\n\n"
        "Aşağıdaki inline butona tıklayarak Mini App'i açabilirsin.\n"
        f"Kişisel referans linkin: {ref_link}"
    )
    await message.answer(text, reply_markup=start_keyboard())


@dp.message(F.text.startswith("/start ref_"))
async def referral_start_handler(message: Message) -> None:
    ref_code = message.text.split(" ", 1)[1].replace("ref_", "")
    await message.answer(f"Referans ile giriş algılandı: {ref_code}")


async def main() -> None:
    await dp.start_polling(bot)


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())
