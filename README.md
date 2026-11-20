# Maraki Tech

The Maraki Tech website and its admin dashboard. Built with Node.js, Express and MySQL.
There is no build step: edit a file, refresh the browser.

## Run it

1. Install Node.js 20+ and MySQL, and create an empty database named `maraki_tech`.
2. `npm install`
3. `npm start` (or `npm run dev` to restart automatically when you save a file).
   The first start creates `.env`. Put your MySQL user and password in it, then start again.
4. Open http://localhost:3000. The admin is at http://localhost:3000/admin.
   The first login is `admin` / `admin123`, and the dashboard makes you change it.

Tables are created automatically on start. To check that everything works, run
`node scripts/smoke.js` while the server is running.

## Use it for another company

Nothing about one company is written in the code — it's all in the database:

1. Install it with a new, empty database (see Run it).
2. Sign in to `/admin`, change the password, and fill in **Company profile**
   (name, logo, email, phone, location, time zone).
3. Replace the starter texts in **Site settings** and the lists (services, products, FAQ, …),
   and set up **Social links** and **Privacy policy**.

A new install starts neutral ("Your Company", UTC, empty contact details, sample texts that use
`{company}`). Cookie and storage names are neutral too (see `src/storage-names.js`).

## Where things live

```
server.js                 Starts everything (read this first; it's short)
src/
  config.js               Reads .env
  app.js                  Express setup: headers, sessions, routes, errors
  settings.js             Every text/setting the admin can edit (incl. Company profile), plus defaults
  social.js               Social platforms and how links are built
  time.js                 Dates in the company's time zone
  storage-names.js        Names of every cookie / browser-storage item
  content.js              Rules for the editable lists (fields, limits, types)
  seed.js                 Sample content inserted on the very first start
  rate-limit.js           Stops spam on the contact form and login
  routes/
    pages.js              Home page (with Google tags), privacy, sitemap, 404
    public.js             /api/content (page data) and /api/contact (form)
    admin.js              /api/admin/* (everything the dashboard does)
  views/
    html.js               Server-side HTML helpers (escaping, site URL)
    privacy.js            Privacy policy text; contact details come from Site settings
  telegram-bot/            Telegram alerts for new messages (standalone feature, see its README)
  db/
    index.js              One import for all database functions
    connection.js         MySQL pool + query helpers
    schema.js             Table definitions and first-start setup
    content.js            Settings and editable lists
    messages.js           Contact form leads
    visits.js             Visit counter
    admins.js             Admin accounts
public/
  index.html              Page shell; the content is filled in by js/main.js
  (privacy policy)        Built by the server: src/views/privacy.js
  css/style.css           All styles for the public pages (newer additions at the end)
  js/
    main.js               Loads the content and builds the page
    lib/html.js           Safe HTML helpers (esc, safeHref, sectionHeading...)
    lib/visibility.js     Decides which sections show
    sections/             One file per part of the page (hero, products, contact...)
    features/             Tracking + cookie banner, animations, menu/scroll/theme
  admin/                  The admin dashboard
    index.html            Sign-in screen + page frame (sidebar, top bar)
    css/admin.css         All dashboard styles (numbered sections, phone rules at the end)
    js/main.js            Starts the dashboard and registers the pages
    js/config/menu.js     The sidebar menu
    js/config/lists.js    Every editable list and the fields in its edit form
    js/core/              Shared parts: server calls, click handling, pop-ups,
                          form fields + uploads, date filter, layout, icons
    js/pages/             One file per page: dashboard, messages (inbox),
                          settings, list (all editable lists), account
  uploads/                Images and videos uploaded in the admin
```

## Common changes

| I want to...                               | Where                                                             |
| ------------------------------------------ | ----------------------------------------------------------------- |
| Change any text, link, contact info        | Admin → Site settings (no code needed)                            |
| Show/hide a section                        | Admin → Site settings → Visibility                                |
| Add Google Ads / Analytics                 | Admin → Site settings → Google Ads & Analytics                    |
| Change how a section looks                 | `public/js/sections/<section>.js` and the CSS                     |
| Add a new section to the page              | New file in `public/js/sections/`, then add one line in `main.js` |
| Add a new editable setting                 | `src/settings.js` (add it to a group AND to `DEFAULT_SETTINGS`)   |
| Add a field to a list (e.g. FAQ)           | `src/content.js` + `src/db/schema.js` + `admin/js/config/lists.js` |
| Add a page to the dashboard                | New file in `admin/js/pages/`, register it in `admin/js/main.js`, add it to `config/menu.js` |
| Change the dashboard look                  | `public/admin/css/admin.css` (colors are at the top)              |
| Change what's saved from the contact form  | `src/routes/public.js` + `src/db/messages.js` + `schema.js`       |

## Guides

Step-by-step guides are in [docs/](docs/README.md):

- [Going live](docs/going-live.md): domain, HTTPS, pm2, backups
- [Google AdSense](docs/google-adsense.md): show Google ads on the site and earn money
- [Google Ads](docs/google-ads.md): advertise Maraki Tech and track leads
- [Analytics and Search Console](docs/google-analytics.md)
- [Admin guide](docs/admin-guide.md): using the dashboard

## Google services in the code

| Service | Setting (admin) | Code |
| --- | --- | --- |
| GA4 + Google Ads tags, cookie banner, lead tracking | `ga4_measurement_id`, `google_ads_id`, `google_ads_conversion_label` | `public/js/features/tracking.js` |
| AdSense script, verification tag, `/ads.txt` | `adsense_client_id` | `src/routes/pages.js` |
| ID format checks on save | all of the above | `src/routes/admin.js` (`ID_FORMATS`) |
