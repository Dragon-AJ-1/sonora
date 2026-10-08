# SONORA ↔ Telegram Bot Integration

چون پروژه فقط روی **GitHub Pages** اجرا می‌شود و هاست واقعی ندارد، ربات تلگرام باید از **GitHub API** استفاده کند تا فایل MP3 و `audio/manifest.json` را مستقیم در ریپو کامیت کند.

## معماری پیشنهادی

```
کانال تلگرام  →  ربات (هر جایی که رایگان اجرا شود)  →  GitHub Contents API  →  commit به main  →  GitHub Pages آپدیت می‌شود
```

ربات می‌تواند روی:
- Cloudflare Workers (رایگان)
- Railway / Render free tier
- یا حتی یک VPS کوچک
اجرا شود. خود سایت نیازی به سرور ندارد.

## پیش‌نیازها

1. یک **Personal Access Token** از GitHub با دسترسی `repo` (یا fine-grained: Contents + Metadata).
2. یک ربات تلگرام از [@BotFather](https://t.me/BotFather).
3. ربات را به کانال مورد نظر ادمین کنید (تا بتواند پیام‌های صوتی را ببیند).

## جریان کار

1. کاربر/ادمین در کانال یک فایل صوتی (MP3 یا voice) بفرستد.
2. ربات فایل را دانلود می‌کند.
3. با GitHub API:
   - فایل را در مسیر `audio/<id>.mp3` آپلود/آپدیت می‌کند.
   - `audio/manifest.json` را می‌خواند، یک آبجکت جدید به آرایه `tracks` اضافه می‌کند، و دوباره می‌نویسد.
4. بعد از کامیت، GitHub Pages در کمتر از ۱ دقیقه سایت را به‌روز می‌کند و ترک جدید در اپ ظاهر می‌شود.

## مثال ساده (Node.js + node-telegram-bot-api + @octokit/rest)

فایل نمونه در `tools/telegram-add-track.js` قرار دارد. خلاصه منطق:

```js
// 1. دریافت فایل از پیام تلگرام
// 2. استخراج title / artist از کپشن یا نام فایل
// 3. ساخت id یکتا (slug)
// 4. آپلود binary به GitHub Contents API
// 5. آپدیت manifest.json
```

### متغیرهای محیطی لازم

```
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
GITHUB_OWNER=Dragon-AJ-1
GITHUB_REPO=sonora
TELEGRAM_BOT_TOKEN=123456:ABC...
TELEGRAM_CHANNEL_ID=-100xxxxxxxxxx   # یا @channelusername
```

## نکات مهم

- فایل‌های بزرگ (>100MB) با Contents API محدودیت دارند؛ برای فایل‌های خیلی بزرگ از Git LFS یا روش‌های دیگر استفاده کنید (در عمل برای موزیک معمولی کافی است).
- همیشه `sha` فعلی فایل را قبل از آپدیت بخوانید تا conflict نشود.
- بهتر است ربات فقط از ادمین‌های مشخص دستور بگیرد.
- می‌توانید یک کامند `/add` هم بسازید که فقط با کپشن کار کند.

## جایگزین سبک‌تر (بدون ربات دائمی)

اگر نمی‌خواهید ربات همیشه روشن باشد:

1. فایل‌ها را دستی در کانال بفرستید.
2. یک GitHub Action با `workflow_dispatch` یا `repository_dispatch` داشته باشید.
3. از یک اسکریپت ساده (یا حتی از خود تلگرام با webhook موقت) payload بفرستید.

اما روش API مستقیم از ربات ساده‌ترین و پایدارترین راه برای «از داخل کانال → داخل ریپو» است.

---

اگر اسکریپت کامل Node.js یا نسخه Cloudflare Worker می‌خواهید، بگویید تا اضافه کنم.
