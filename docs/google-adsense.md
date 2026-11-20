# Showing Google ads on the website (Google AdSense)

With **Google AdSense**, Google shows ads from other companies on your website,
and **Google pays you** when visitors see or click them.

> Not the same as **Google Ads**. Google Ads is when *you* pay Google to advertise
> Maraki Tech. That guide is [google-ads.md](google-ads.md). You can use both.

---

## 1. Before you start: is AdSense right for this site?

Read this first. It can save you weeks.

| Point | What it means for Maraki Tech |
| --- | --- |
| **Ads can show your competitors** | A visitor looking for a software company may click an ad for another software company and leave. |
| **Small income at first** | Income depends on visitors. With a few hundred visits a month, expect very little (often less than a few dollars). |
| **Google wants real content** | A one-page company site is often refused as *"low value content"*. Articles, guides and case studies help a lot. |
| **Gambling content is restricted** | Keep **Entertainment apps (Bingo, Keno, Spin)** hidden while ads are on. |
| **Paying for traffic and showing ads on the same page** | If you run Google Ads *to* this page, you pay for each visitor, and then an ad may take them away. Keep the contact form free of ads (see step 7). |

**Recommendation:** AdSense works best when the site has many pages of useful content
(for example a blog with articles about payments, software, or business in Ethiopia).
If you mainly want new clients, focus on [Google Ads](google-ads.md) first.

---

## 2. What you need

- [ ] A Google account (Gmail) that you will keep. Use a company account, not a personal one if possible.
- [ ] You are **18 or older**.
- [ ] The website is **live on your own domain with HTTPS**, e.g. `https://maraki.tech` (see [going-live.md](going-live.md)).
  AdSense cannot review `localhost`.
- [ ] Real content. No sample text, fake testimonials, or "coming soon" sections.
- [ ] The **privacy policy** is online at `/privacy`. It already explains AdSense cookies. ✅
- [ ] Your real address and phone number for payments.

---

## 3. Create the AdSense account

1. Go to **https://adsense.google.com** and click **Get started**.
2. Enter your website address, e.g. `https://maraki.tech`.
3. Choose your country and accept the terms.
4. Fill in your **payment address** (the name must match your bank account).

---

## 4. Connect the site to AdSense

AdSense shows your **publisher ID**. It looks like `ca-pub-1234567890123456`.
You can always find it in **AdSense → Account → Settings → Account information**.

1. Open the admin dashboard → **Site settings** → tab **Google Ads, AdSense & Analytics**.
2. Paste the ID into **AdSense publisher ID**.
3. Click **Save changes**.

The website now does three things automatically:

| What | Where | Why |
| --- | --- | --- |
| Verification tag `<meta name="google-adsense-account">` | Home page `<head>` | Proves you own the site |
| AdSense script (`adsbygoogle.js`) | Home page `<head>` | Shows the ads |
| `ads.txt` file | `https://your-domain/ads.txt` | Tells ad buyers that your account may sell ads here |

**Check it worked:**

- Open `https://your-domain/ads.txt`. You should see one line like:
  `google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0`
- Open the home page, right-click → **View page source**, and search for `adsbygoogle`.

In AdSense, when it asks how to connect, choose **AdSense code snippet** or **Meta tag**
(both are already on the page). Tick **"I've placed the code"** and click **Verify**.

If you remove the publisher ID later, the script and `ads.txt` disappear on their own.

---

## 5. Ask Google to review the site

1. In AdSense → **Sites**, click your site → **Request review**.
2. Review usually takes **a few days to 2–4 weeks**. Don't change the code during review.
3. You get an email when it's done.

**If the site is refused**, the email says why. The most common reasons:

| Reason | What to do |
| --- | --- |
| Low value content | Add more useful pages and text. Remove sample content. Wait a few weeks and request review again. |
| Site down or unavailable | Make sure the site is online and loads over HTTPS. |
| Policy violation | Read the reason. Hide Entertainment apps. Remove anything misleading. |
| ads.txt problem | Open `/ads.txt` and check it shows your ID (step 4). |

---

## 6. Privacy and consent (important for visitors from Europe)

- **Visitors in the EU, UK and Switzerland** must be asked before personalised ads are shown.
  Google requires a **Google-certified consent message** for this.
- The website's own cookie banner is **not** Google-certified. It only controls Analytics and Google Ads tracking.
- **What to do:** in AdSense → **Privacy & messaging** → **European regulations**, create and publish the
  free consent message. It appears automatically on your site for European visitors only.
- Other countries may have their own rules. Check what applies where your visitors live.

The privacy policy (`public/privacy.html`) already includes the text AdSense requires about
advertising cookies and how to opt out.

---

## 7. Turn on ads

1. AdSense → **Ads** → **By site** → click the pencil next to your site.
2. Switch on **Auto ads**. Google picks the places for ads.
3. Set **Ad load** low to start. Fewer ads make a better impression on clients.
4. Under **Page exclusions**, exclude any page you don't want ads on.
5. Click **Apply**. Ads can take up to an hour to appear.

Tip: you'll see empty spaces or no ads at first. That is normal.

---

## 8. Rules you must follow (or the account gets closed)

- ❌ **Never click your own ads**, even to test. Use the AdSense **preview** instead.
- ❌ Don't ask anyone to click ads ("support us by clicking").
- ❌ Don't buy cheap traffic or use bots.
- ❌ No ads on pages with only an error or "thank you" message.
- ❌ No gambling, adult, or copied content on pages with ads.
- ✅ Keep content original and up to date.

Full policies: **https://support.google.com/adsense/answer/48182**

---

## 9. Getting paid

- Google pays once a month when your balance reaches the **payment threshold** (usually **US$100**).
- Before the first payment, Google may mail a **PIN letter** to your address. Enter the PIN in AdSense.
- Add your bank details in **AdSense → Payments → Payments info**. The payment methods depend on your country.
- Tax information may be required (**Payments → Settings → Manage settings → Tax info**).

---

## 10. Quick checklist

- [ ] Site is live on HTTPS with real content
- [ ] AdSense account created
- [ ] Publisher ID pasted in **Site settings** and saved
- [ ] `/ads.txt` shows your ID
- [ ] Site verified and review requested
- [ ] European consent message published (Privacy & messaging)
- [ ] Entertainment apps hidden
- [ ] Approved → Auto ads on, with a low ad load
- [ ] Payment details and PIN done
