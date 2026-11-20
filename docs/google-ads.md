# Advertising Maraki Tech on Google (Google Ads)

With **Google Ads**, *you* pay Google so Maraki Tech appears when people search
for things like "software company Addis Ababa". You pay when someone clicks.

> Want Google to pay *you* for showing ads on your site? That's AdSense: see [google-adsense.md](google-adsense.md).

---

## 1. What the website already does for you

| Feature | What it means |
| --- | --- |
| **Conversion tracking** | When someone sends the contact form, Google Ads counts a "conversion". You see which ads bring real leads. |
| **Click ID saved with each lead** | Each lead in the **Inbox** shows "Google Ads" and the click ID, so you know it came from an ad. |
| **Phone, email, Telegram and WhatsApp clicks** | Counted in Google Analytics as `contact_click`. |
| **Cookie banner + Consent Mode v2** | Google tags load only after a visitor clicks **Accept**. |
| **Google-friendly page** | Title, description, preview image and business details are in the HTML. |
| **Launch checklist** | Admin → **Overview** → *Ready for Google Ads* shows what is still missing. |

---

## 2. Create the account

1. Go to **https://ads.google.com** and sign in with the company Google account.
2. Choose **Expert mode** (small link at the bottom of the first screen). It gives you more control.
3. Choose **Create an account without a campaign**. Set the country, time zone and currency.
   ⚠️ The time zone and currency **cannot be changed later**.
4. Add a payment method in **Billing**.

---

## 3. Set up conversion tracking (the most important step)

1. In Google Ads: **Goals** → **Conversions** → **Summary** → **+ New conversion action**.
2. Choose **Website** and enter your domain.
3. Choose **Add a conversion action manually**:
   - Goal category: **Submit lead form**
   - Name: `Contact form`
   - Value: use one value, e.g. the average value of a new client (optional)
   - Count: **One**
4. Save. Choose **Use Google tag** → **Install the tag yourself**.
5. Google shows code. You need two values from it:

   ```
   gtag('config', 'AW-123456789');                          ← Google Ads ID:   AW-123456789
   send_to: 'AW-123456789/AbC-D_efG12'                       ← Conversion label: AbC-D_efG12
   ```

6. Admin dashboard → **Site settings** → **Google Ads, AdSense & Analytics**:
   - **Google Ads ID** → `AW-123456789`
   - **Ads conversion label** → `AbC-D_efG12` (only the part after the slash)
7. **Save changes.** You don't need to paste any code. The website handles it.

**Turn on auto-tagging** so each lead gets its click ID:
Google Ads → **Admin** → **Account settings** → **Auto-tagging** → ✅ on.

---

## 4. Test it

1. Open your live site in a private window, and click **Accept** on the cookie banner.
2. Go to **https://tagassistant.google.com**, connect your site, and send a test message through the contact form.
3. Tag Assistant should show the Google Ads conversion firing.
4. In Google Ads, the conversion status changes to **Recording conversions** within about a day.
5. Delete your test message in the admin **Inbox**.

---

## 5. Your first campaign (simple setup)

| Setting | Suggestion |
| --- | --- |
| Campaign type | **Search** |
| Goal | **Leads** → the `Contact form` conversion |
| Locations | The countries or cities where your clients are, e.g. Ethiopia |
| Languages | English (+ Amharic if you target local searches) |
| Budget | Start small, e.g. US$5–10 per day, for 2–4 weeks |
| Bidding | **Maximize conversions**. Switch to *Target CPA* after ~30 conversions. |
| Keywords | Specific phrases: `software development company ethiopia`, `payment integration addis ababa`, `custom business software` |
| Negative keywords | `free`, `jobs`, `course`, `salary`, `download` |
| Final URL | `https://your-domain/` (or `/#contact` to go straight to the form) |

Write 3–4 ad versions with real benefits: what you build, where you are, and how fast you reply.

---

## 6. Rules: avoid having your ads rejected

Google checks the page your ad sends people to. Before launching:

- [ ] **Real contact details.** No sample phone number.
- [ ] **Only real testimonials, team members and numbers.** Made-up reviews break the *Misrepresentation* policy.
  The sample ones are hidden. Turn those sections on only after adding real content.
- [ ] **Entertainment apps (Bingo/Keno/Spin) hidden.** Gambling ads need special Google approval per country.
- [ ] **Privacy policy** linked in the footer and the form. ✅
- [ ] Site loads over **HTTPS** and works on phones. ✅
- [ ] Ads say only what the site says (no promises the page doesn't support).

The admin **Overview → Ready for Google Ads** checklist checks most of these for you.

---

## 7. Every week

- Admin **Inbox**: which leads came from **Google Ads**? Were they good clients?
- Google Ads → **Keywords** → **Search terms**: add bad searches as negative keywords.
- Pause ads and keywords that cost money without conversions.
- Link Google Ads with Google Analytics ([google-analytics.md](google-analytics.md)) to see what visitors do on the site.
