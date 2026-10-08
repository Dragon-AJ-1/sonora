# SONORA ↔ Telegram Bot Integration

چون پروژه فقط روی **GitHub Pages** اجرا می‌شود و هاست واقعی ندارد، ربات تلگرام باید از **GitHub API** استفاده کند تا فایل MP3 و `audio/manifest.json` را مستقیم در ریپو کامیت کند.

## معماری

```
کانال تلگرام  →  ربات (هر جایی رایگان)  →  GitHub Contents API  →  commit به main  →  GitHub Pages
```

ربات می‌تواند روی Cloudflare Workers، Railway، Render free tier یا هر سرور کوچکی اجرا شود. خود سایت نیازی به سرور ندارد.

## پیش‌نیازها

1. **Personal Access Token** گیت‌هاب با دسترسی `repo` (یا fine-grained: Contents + Metadata).
2. ربات از [@BotFather](https://t.me/BotFather).
3. ربات را ادمین کانال کنید تا پیام‌های صوتی را دریافت کند.

## فرمت کپشن پیشنهادی

```
عنوان آهنگ - نام هنرمند | نام آلبوم | ژانر
```

مثال:
```
Midnight Signals - Aurora Vale | Glass Horizon | Ambient
```

اگر فقط عنوان بفرستید هم کار می‌کند.

## راه‌اندازی سریع

```bash
npm i node-telegram-bot-api @octokit/rest
export GITHUB_TOKEN=ghp_xxxxxxxxxxxx
export GITHUB_OWNER=Dragon-AJ-1
export GITHUB_REPO=sonora
export TELEGRAM_BOT_TOKEN=123456:ABC...
export TELEGRAM_ADMIN_IDS=123456789   # اختیاری — لیست ID ادمین‌ها
node tools/telegram-add-track.example.js
```

اسکریپت نمونه در `tools/telegram-add-track.example.js` شامل:

- محدودیت حجم (پیش‌فرض ۲۰ مگابایت)
- لیست سفید ادمین
- پارس کپشن فارسی/انگلیسی
- آپلود باینری + آپدیت manifest
- پیام وضعیت در تلگرام

## نکات مهم

- Contents API برای فایل‌های خیلی بزرگ محدودیت دارد؛ برای موزیک معمولی کافی است.
- همیشه `sha` فعلی فایل را قبل از آپدیت بخوانید (اسکریپت این کار را می‌کند).
- بعد از کامیت، GitHub Pages معمولاً زیر ۱ دقیقه سایت را به‌روز می‌کند.
- برای امنیت بیشتر حتماً `TELEGRAM_ADMIN_IDS` را تنظیم کنید.

## جایگزین بدون ربات دائمی

می‌توانید از `repository_dispatch` یا `workflow_dispatch` در GitHub Actions استفاده کنید و از یک اسکریپت موقت payload بفرستید. اما روش مستقیم API از ربات ساده‌ترین راه برای «از داخل کانال → داخل ریپو» است.

---

اگر نسخه Cloudflare Worker یا نسخه با کامند `/add` می‌خواهید، بگویید تا اضافه شود.
