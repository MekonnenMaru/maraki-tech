// Names of every cookie and browser-storage item the site uses.
// The privacy policy's cookie table is built from this list, so keep it complete.
// The browser code uses the same names: public/js/features/tracking.js, public/js/features/page-ui.js,
// public/index.html, public/admin/index.html, public/admin/js/core/shell.js, public/admin/js/pages/settings.js.

module.exports = {
  SESSION_COOKIE: "session_id", // staff login (server)
  VISIT_COOKIE: "visit_counted", // counts a visit once per 30 minutes (server)
  CONSENT_KEY: "cookie_choice", // cookie banner answer (browser)
  CAMPAIGN_KEY: "campaign_source", // which ad/link brought the visitor (browser, this tab)
  THEME_KEY: "theme", // light/dark mode (browser)
  ADMIN_USERNAME_KEY: "admin_username", // "Remember me" username (browser, staff)
  ADMIN_TAB_KEY: "admin_settings_tab", // last open settings tab (browser, staff)
};
