# SONORA Radio از کانال تلگرام (سبک، روی GitHub Pages)

## محدودیت‌ها (مهم)

- سایت فقط استاتیک است → **استریم زنده واقعی (WebRTC / Icecast)** روی خود GitHub Pages ممکن نیست.
- لینک فایل تلگرام منقضی می‌شود → ربات باید فایل را **دانلود و داخل ریپو کامیت** کند.
- صدا و کیفیت خوب = فایل MP3 داخل `audio/` + پخش با `<audio>` مرورگر.

## مدل پیشنهادی (سبک و پایدار)

```
کانال تلگرام
   │  (صوت / ویس / متن)
   ▼
ربات (Cloudflare Worker / Railway رایگان)
   │  دانلود MP3 + آپدیت JSON
   ▼
GitHub repo
  audio/*.mp3
  audio/manifest.json
  audio/radio-feed.json   ← صف پخش رادیو + پیام‌های On Air
   ▼
GitHub Pages → پخش پیوسته در صفحه Radio
```

## فایل `audio/radio-feed.json`

```json
{
  "updatedAt": "2026-10-08T12:00:00Z",
  "station": { "id": "tg-live", "name": "SONORA Live", "tag": "From the channel", "host": "Channel" },
  "streamUrl": "",
  "tracks": [
    { "id": "track-id", "title": "Title", "artist": "Artist", "file": "audio/track-id.mp3" }
  ],
  "messages": [
    { "t": "متن پست کانال یا حرف DJ", "at": "2026-10-08T12:00:00Z" }
  ]
}
```

- `tracks`: صف رادیو (ترتیب پخش)
- `messages`: حرف‌ها / اعلان‌ها روی صفحه (تیکر On Air)
- `streamUrl`: فقط اگر خودتان استریم خارجی (HLS/Icecast) دارید؛ وگرنه خالی بگذارید

## رفتار ربات برای رادیو

1. پیام **صوتی** در کانال → دانلود → `audio/<id>.mp3` → اضافه به `manifest.json` و **انتهای** `radio-feed.tracks`
2. پیام **متنی** → اضافه به `radio-feed.messages` (حداکثر ~۲۰ پیام آخر برای سبک ماندن)
3. ویس تلگرام هم مثل صوت MP3 ذخیره شود

اسکریپت نمونه ترک: `tools/telegram-add-track.example.js`  
همان منطق را با آپدیت `radio-feed.json` گسترش دهید.

## کیفیت و سرعت

- MP3 حدود ۱۲۸–۱۹۲ kbps کافی و سبک است
- فایل‌های خیلی بزرگ ریپو را سنگین می‌کنند → سقف ~۱۵–۲۰ مگابایت برای هر ترک منطقی است
- بعد از هر کامیت، Pages معمولاً زیر یک دقیقه به‌روز می‌شود

## استریم زنده واقعی (اختیاری، خارج از GitHub)

اگر بعداً استریم زنده خواستید:

1. یک Icecast/HLS رایگان یا ارزان بالا بیاورید
2. آدرس را در `radio-feed.json` → `streamUrl` بگذارید
3. سایت همان URL را پخش می‌کند — بدون سنگین شدن فرانت

## اشتراک‌گذاری پلی‌لیست کاربر

بدون اکانت:

- Download JSON از کتابخانه
- یا Copy share code و Paste در دستگاه دیگر

همه چیز localStorage همان مرورگر است تا وقتی کاربر خودش share کند.
