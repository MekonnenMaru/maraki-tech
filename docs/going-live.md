# Putting the website online

Google Ads, AdSense and Search Console all need the site **online, on your own domain, with HTTPS**.

---

## 1. What you need

| Thing | Notes |
| --- | --- |
| A domain | e.g. `maraki.tech`, from any domain registrar |
| A server or hosting with **Node.js 20+** and **MySQL 8** | A small VPS (1 GB RAM) is enough. Some cPanel hosts also support Node.js apps. |
| HTTPS certificate | Free with **Let's Encrypt**, or automatic with Cloudflare or your host |

---

## 2. Install on the server

```bash
git clone <your-repository> maraki-tech
cd maraki-tech
npm install --omit=dev
npm start            # first start creates .env, then stops if MySQL details are missing
```

Edit `.env`:

```ini
PORT=3000
SESSION_SECRET=<long random text — created for you, keep it secret>
SESSION_HOURS=12
DB_HOST=localhost
DB_PORT=3306
DB_USER=maraki
DB_PASSWORD=<a strong password>
DB_NAME=maraki_tech
```

Create the database and user in MySQL first:

```sql
CREATE DATABASE maraki_tech CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'maraki'@'localhost' IDENTIFIED BY '<a strong password>';
GRANT ALL PRIVILEGES ON maraki_tech.* TO 'maraki'@'localhost';
```

The tables are created automatically on start.

---

## 3. Keep it running

Use a process manager so the site restarts after a crash or a reboot:

```bash
npm install -g pm2
pm2 start server.js --name maraki
pm2 save
pm2 startup          # follow the command it prints
```

---

## 4. HTTPS with nginx (typical VPS)

```nginx
server {
  server_name maraki.tech www.maraki.tech;
  client_max_body_size 45m;               # allows 40 MB video uploads

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Then run `sudo certbot --nginx -d maraki.tech -d www.maraki.tech` for a free certificate.

The app already trusts the proxy, marks login cookies as secure on HTTPS, and builds the
sitemap and canonical links from the real domain.

---

## 5. Before you announce the site

- [ ] Sign in at `https://your-domain/admin` and **change the password** (`admin` / `admin123` at first).
- [ ] Admin → **Overview** → work through the **Ready for Google Ads** checklist.
- [ ] Replace sample content: phone number, stats, team, testimonials.
- [ ] Upload a **JPG/PNG/WebP hero image** (not a GIF). It's also the preview picture when the link is shared.
- [ ] Open the site on a phone and send a test message through the contact form. Then delete it in the Inbox.
- [ ] Run `node scripts/smoke.js` with `BASE_URL=https://your-domain` to check the main features.
      (It signs in with the default password, so run it before you change the password, or skip the admin part.)

---

## 6. Backups (do this!)

Back up two things, ideally every day:

```bash
mysqldump -u maraki -p maraki_tech > backup-$(date +%F).sql      # database: content, leads, settings
tar czf uploads-$(date +%F).tar.gz public/uploads                 # uploaded images and videos
```

Keep copies on another computer or cloud storage.

---

## 7. Updating the site later

```bash
git pull
npm install --omit=dev
pm2 restart maraki
```
