# اتصال کانال Telegram به SONORA

## وضعیت فعلی

| مورد | مقدار |
|------|--------|
| کانال | [@MrA_Music](https://t.me/MrA_Music) |
| ربات | `@MrA_Music_bot` |
| نقش ربات | **administrator** (post/edit/delete) |
| همگام‌سازی | GitHub Action `telegram-sync.yml` هر ۱۰ دقیقه |
| قالب کپشن | [CHANNEL-POST-TEMPLATE.md](./CHANNEL-POST-TEMPLATE.md) |

نمونه ترک‌های قالب‌دار روی کانال پست شده‌اند (Glass Horizon / Midnight Signals).

## Secrets ضروری

در GitHub → Settings → Secrets and variables → Actions:

```
TELEGRAM_BOT_TOKEN = <توکن از BotFather — هرگز در چت/ریپو نگذار>
TELEGRAM_CHANNEL_ID = @MrA_Music
```

بدون این دو Secret، Action اجرا می‌شود ولی خطای Missing token می‌دهد.

## محدودیت Bot API

- ربات **تاریخچه قدیمی** کانال را نمی‌خواند؛ فقط پست‌های **جدید** بعد از ادمین شدن.
- پیام‌هایی که **خود ربات** می‌فرستد معمولاً به‌عنوان `channel_post` به همان ربات برنمی‌گردند.
- برای همگام‌سازی واقعی، یک **ادمین انسانی** باید فایل صوتی را با کپشن قالب در کانال بفرستد.

## جریان کار

```
ادمین کانال → پست MP3 + کپشن قالب
        ↓
Bot getUpdates (channel_post)
        ↓
GitHub Action / tools/telegram-sync.mjs
        ↓
audio/*.mp3 + manifest.json + radio-feed.json
        ↓
GitHub Pages (~1 دقیقه)
```

## تست دستی Action

1. یک MP3 با کپشن قالب در کانال بفرست (از اکانت خودت، نه فقط ربات)
2. GitHub → Actions → **Telegram channel sync** → Run workflow
3. بعد از موفقیت، `audio/manifest.json` باید ترک جدید داشته باشد

## امنیت

اگر توکن جایی لو رفت → BotFather → Revoke → Secret را عوض کن.
