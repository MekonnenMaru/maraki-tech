# Telegram alerts

Sends a Telegram message to the website team for every new contact-form message
(name, email, phone, company, location, service, where they came from, and the message).

## Set up (in the dashboard)

1. In Telegram, talk to **@BotFather** → `/newbot` → copy the token.
2. Dashboard → **Telegram alerts** → paste the token → **Save token**.
3. Click **Connect a Telegram account** → **Open in Telegram** → press **Start**.
   The window closes by itself when it's connected. Repeat for each person who should get alerts.
4. Click **Send test message**.

Use the switch on that page to turn alerts on or off.

## Changing the bot

The bot's username is **not stored** anywhere — it's read from Telegram with the token every time the
page opens. To use another bot, paste its token and save; the page and the connect link switch to the
new bot. (Changing the token disconnects everyone, so connect again.)

## How it's safe

- The token is stored only in the database (table `telegram_bot`), never in the code or in git.
  The dashboard shows only its first and last 4 characters.
- Only accounts that open a one-time link (valid 10 minutes) get alerts. Anyone else who writes to
  the bot gets "This bot only sends notifications to the website's team."
- If Telegram is slow or down, the visitor's message is still saved and the visitor sees "sent"
  right away; the alert is sent afterwards (10-second limit).
- While alerts are on, the privacy policy says that Telegram receives the details of new messages.

## Files

| File | What it does |
| --- | --- |
| `index.js` | Entry point: sends alerts, the dashboard API (`/api/admin/telegram/…`), the privacy note |
| `telegram-api.js` | Small client for the Telegram Bot API |
| `message.js` | The text of the alert |
| `connect.js` | Connecting an account with a one-time link |
| `store.js` | Saved settings (own database table, created automatically) |
| `admin-page.js` | The dashboard page (runs in the browser) |

## Hooks in the rest of the app

| Where | Line |
| --- | --- |
| `src/app.js` | `app.use(telegramBot.router)` |
| `src/routes/public.js` | `telegramBot.notifyNewMessage(message, { base })` after a message is saved |
| `src/routes/pages.js`, `src/routes/admin.js` | `telegramBot.privacyShares()` for the privacy policy |
| `public/admin/js/config/menu.js` | menu item `telegram` |
| `public/admin/js/main.js` | `registerPage("telegram", renderTelegram)` |

To remove the feature: delete this folder and those lines (the `telegram_bot` table can be dropped too).

## Limits

- The bot uses Telegram's `getUpdates` only while you connect an account, so it must **not** have a
  webhook set elsewhere.
- The "Open inbox" button in alerts appears only when the site runs on `https://` (Telegram rule).
