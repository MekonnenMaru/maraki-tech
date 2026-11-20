# Google Analytics 4 and Google Search Console

- **Google Analytics 4 (GA4)** shows who visits, from where, and what they do.
- **Google Search Console** shows how your site appears in normal (free) Google search.

Both are free.

---

## Google Analytics 4

### Set up

1. Go to **https://analytics.google.com** → **Start measuring**.
2. Create an **account** (`Maraki Tech`) and a **property** (`maraki.tech`). Choose your time zone and currency.
3. Choose **Web**, enter your domain, and name the stream.
4. Copy the **Measurement ID**. It looks like `G-ABC123XYZ9`.
5. Admin dashboard → **Site settings** → **Google Ads, AdSense & Analytics** → **GA4 Measurement ID** → paste → **Save changes**.

Analytics loads only for visitors who click **Accept** on the cookie banner.

### What the site sends to Analytics

| Event | When |
| --- | --- |
| `page_view` | A visitor opens the site (automatic) |
| `generate_lead` | The contact form was sent successfully |
| `contact_click` | A visitor clicked the phone number, email or Telegram link (`method` = phone / email / telegram) |

### Mark leads as important

GA4 → **Admin** → **Events** (or **Key events**) → find `generate_lead` → mark it as a **key event**.
Do the same for `contact_click` if you want.

### Connect to Google Ads

GA4 → **Admin** → **Product links** → **Google Ads links** → **Link**. Then you can see
Google Ads visitors in Analytics, and Analytics audiences in Google Ads.

### Check it works

Open the site, click **Accept**, then look at GA4 → **Reports** → **Realtime**. You should appear within a minute.

---

## Google Search Console

1. Go to **https://search.google.com/search-console** → **Add property**.
2. Choose **Domain** and enter `maraki.tech`.
3. Google gives you a **TXT record**. Add it in your domain's **DNS settings** (where you bought the domain). Click **Verify**.
4. In Search Console → **Sitemaps**, submit: `sitemap.xml`
   (the site creates it automatically at `https://your-domain/sitemap.xml`).
5. Optional: **Settings** → **Associations** → link with Google Analytics.

After a few days you'll see which searches show your site, and how many people click.

---

## Your numbers in the admin dashboard

The admin **Overview** also counts visits itself (no cookies needed). It counts every visitor,
including people who decline cookies, so the number is usually **higher** than in GA4. Both are correct;
they just measure differently.
