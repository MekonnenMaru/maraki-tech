// Company website + admin dashboard — start here.
//   npm start      → run
//   npm run dev    → run and restart when files change
const config = require("./src/config");
const db = require("./src/db");
const { createApp } = require("./src/app");

async function start() {
  try {
    await db.init();
  } catch (error) {
    console.error("Could not connect to MySQL.");
    console.error(error.message || error);
    console.error("Check DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, and DB_NAME in .env.");
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(config.port, async () => {
    console.log(`Website is running at http://localhost:${config.port}`);
    console.log(`Admin dashboard: http://localhost:${config.port}/admin`);
    if (await db.passwordChangeRequired()) {
      console.log("Admin login: admin / admin123  — change this after you sign in.");
    }
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`Port ${config.port} is already in use. Set PORT in .env or stop the other process.`);
      process.exit(1);
    }
    throw error;
  });
}

start();
