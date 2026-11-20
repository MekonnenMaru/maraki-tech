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

## Where things live

```
server.js                 Starts everything (read this first; it's short)
src/
  config.js               Reads .env
  app.js                  Express setup: headers, sessions, routes, errors
  settings.js             Every text/setting the admin can edit, plus defaults
  content.js              Rules for the editable lists (fields, limits, types)
  seed.js                 Sample content inserted on the very first start
  rate-limit.js           Stops spam on the contact form and login
  routes/
    pages.js              Home page (with Google tags), privacy, sitemap, 404
    public.js             /api/content (page data) and /api/contact (form)
    admin.js              /api/admin/* (everything the dashboard does)
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
  privacy.html            Privacy policy
  css/style.css           Main styles
  css/enhancements.css    Newer styles that build on style.css
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

## Google Ads checklist

- [ ] Paste the GA4 ID, Google Ads ID and conversion label in the admin.
- [ ] Use only real testimonials, team members and numbers. The sample ones are hidden by default.
- [ ] Use a real phone number and email.
- [ ] Keep the Entertainment apps (Bingo/Keno/Spin) hidden on the page you advertise.
      Google restricts gambling ads.
- [ ] Serve the site over HTTPS on your own domain.
- [ ] Change the admin password.
