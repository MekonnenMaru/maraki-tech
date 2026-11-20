# Using the admin dashboard

Open `https://your-domain/admin` and sign in. Everything on the public website can be changed here.
Changes appear on the website after a refresh. You don't need any code.

---

## The menu

| Page | What it's for |
| --- | --- |
| **Overview** | Visits, new messages, the *Ready for Google Ads* checklist, latest leads |
| **Inbox** | Messages from the contact form |
| **Telegram alerts** | Get a Telegram message for every new contact-form message |
| **Company profile** | Company name, logo, email, phone, location, time zone — used everywhere |
| **Site settings** | All texts, links, images, section on/off switches, Google IDs |
| **Privacy policy** | The full text of your Privacy Policy page, section by section |
| **Social links** | The social media icons in the footer (one row per network) |
| **Stats, Services, Products, Pricing** | The cards on the page |
| **Process, Team, Testimonials, FAQ, Technology** | More sections of the page |
| **Entertainment** | Bingo, Keno and Spin apps (keep hidden while advertising) |
| **Password** | Change your password |

---

## Telegram alerts

Menu → **Telegram alerts**. Get a Telegram message the moment someone sends the contact form.

1. **Bot token**: create a bot with **@BotFather** in Telegram (`/newbot`), paste the token, **Save token**.
2. **Connect a Telegram account** → **Open in Telegram** → press **Start**. The window closes when it's connected.
   Do this for everyone who should get alerts (each gets their own one-time link).
3. **Send test message** to check.

The switch turns alerts on/off. Remove a person with 🗑. Details: `src/telegram-bot/README.md`.

## Company profile

Menu → **Company profile**. Fill this in first — the whole site uses it:

| Field | Used for |
| --- | --- |
| **Company name** | Logo text (first word in capitals) when there's no logo image, footer, browser tab, Google, privacy policy, dashboard |
| **Logo** | Upload a PNG or WebP (transparent background, under 2 MB). Replaces the round mark + name in the header, footer, privacy page, dashboard and the browser tab icon |
| **Email / Phone / Location** | Contact section, footer, privacy policy, Google business details. Phone is also used for the WhatsApp link. The country (last part of the location) is used in the privacy policy |
| **Time zone** | The clock on the website, visit counts and dates in the dashboard |

The **Overview** checklist shows *Company profile filled in* until name, email and location are set.

## Site settings

The settings are in tabs:

| Tab | Contains |
| --- | --- |
| **Visibility** | Switch whole sections on or off. A hidden section also leaves the menu and footer. |
| **Google & browser tab** | The optional page title and description for Google |
| **Hero** | The first screen: headline, text, buttons, image |
| **Navigation** | Menu labels |
| **Section headings** | The small label, title and text above each section |
| **Contact section** | The text beside the form, the form button and the “message sent” text |
| **Call to action** | The banner above the footer |
| **Footer** | Short description and the three column titles. Footer links reuse your menu and section names. |
| **Cookie banner** | Banner text and button names (the banner only shows when a Google ID is filled in) |
| **Google Ads, AdSense & Analytics** | IDs from Google. See the guides in this folder. |

**Green words in titles:** write `{highlight}` in the title where the green words go,
and put the green words in the *highlight* box.
Example: title `Technology {highlight} business forward.` + highlight `that moves`.

**Your details inside any text** (from the Company profile): write `{company}`, `{email}`, `{phone}` or `{location}` in any text on the site
(for example an FAQ answer “Email us at {email}”). It's replaced with your current Site settings,
so when your email changes, every text changes with it.

Click **Save changes** at the bottom. The bar says *Unsaved changes* until you save.

Google IDs are checked when you save. A wrong format shows an error and nothing is saved.

---

## Social links

Menu → **Social links**. One row per network; they appear as icons in the footer, in this order.

| Column | What to type |
| --- | --- |
| **Platform** | Facebook, Instagram, TikTok, YouTube, LinkedIn, X, Telegram, WhatsApp, GitHub — or **Other link** for any other website |
| **Username or link** | Just the username (e.g. `marakitech`) and the link is made for you. Each network can have a different username. You can also paste a full link (`https://…`). **Other link** always needs a full link. **WhatsApp**: leave empty to use the phone from Site settings → Contact, or type another number with country code. |

Use the switch to show/hide a network, the arrows to change the order, and 🗑 to delete it.
At the start every network uses `marakitech` — **check each one really is your account**, and switch off
the ones you don't use.

## Privacy policy

Menu → **Privacy policy**. This is the full text of your public page `https://your-domain/privacy`.

Your company name, email, phone and location come from **Site settings**,
so you only type them once.

**Sections** (list below): every part of the policy, in page order.

| Button | What it does |
| --- | --- |
| **Add section** | Adds your own section (title + text). It appears before “Contact us about privacy”. |
| Click a row / ✏️ | **Edit** the title and text, then **Save section** |
| On/off switch | **On** (green) = shown on the public page. **Off** (grey) = hidden. Hidden rows are greyed out and have no number. |
| ⌃ ⌄ | **Move** the section up or down. “In short” always stays at the top. |
| ↺ | **Reset** a built-in section you edited back to the automatic text |
| 🗑 | **Delete** one of your own sections (asks first; can't be undone) |

Labels:

- **Automatic** (green): written for you, updates itself when your settings change
  (for example when you add a Google ID, the Google parts appear on their own).
- **Edited** (orange): a built-in section you changed. It stays exactly as you wrote it.
- **Your section**: a section you added.

Built-in sections can't be deleted, because the website writes them for you. **Hide** them instead;
you can always show them again.

**Switched on at first (necessary):** Who we are, What we collect, Why we use it, Cookies, How long we keep
information, Who we share it with, Your rights, Contact us about privacy — plus the Google sections
when a Google ID is filled in, and "Information stored outside your country" when Google is used.

**Switched off at first (optional):** In short, Spam protection and server logs, How we protect it,
Children, Changes to this policy. Switch them on if you want them.

Some parts are always automatic and can't be edited, so they are never wrong:
your email/phone/location (from Site settings → Contact details) and the cookie table.

**Writing text:**

| Write | You get |
| --- | --- |
| an empty line | a new paragraph |
| `- something` at the start of a line | a bullet point |
| `**words**` | **bold** words |
| `[text](https://example.com)` | a link |
| `{company}` `{email}` `{domain}` | your company name, contact email and website address from Site settings |

The **Last updated** date at the top of the page changes to today on its own whenever you change
a section or a Google ID.

**Recommended:** ask a lawyer to read `/privacy` once (Ethiopia: Personal Data Protection
Proclamation No. 1321/2024; EU/UK clients: GDPR). Make their changes directly in the sections.

---

## Lists (Services, FAQ, Team, Social links, …)

- **Add** with the green button at the top right.
- **Click a row** to edit it.
- **↑ ↓** change the order on the website.
- The **on/off switch** in each row shows or hides an item on the website without deleting it.
- **Images:** JPG, PNG, WebP or GIF up to **2 MB**. **Videos:** MP4 or WebM up to **40 MB**, or a YouTube link.

---

## Inbox

- **New** messages have a green line on the left. Opening one marks it as read.
- **Source** shows where the lead came from: *Google Ads*, *Campaign*, *Referral* or *Direct*.
- **Where this lead came from** (inside a message) shows the campaign details and Google click ID.
- **Reply** opens your email app with the address filled in.
- Use the **date** menu, the **All / New / Read** filter and the **search** box to find messages.

---

## Good habits

- Change the default password on day one.
- Only publish real testimonials, team members and numbers.
- Check the **Overview** checklist after big changes.
- Never click your own Google ads (AdSense rule).
