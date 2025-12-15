const { syncSchema } = require("./services/schemaSync.service");
const { syncAllProcedures } = require("./services/procedureSync.service");
const db = require("./db/mysql");
const fs = require("fs");
const path = require("path");
const app = require("./server");

const PORT = process.env.PORT || 3000;

async function initializeDatabase() {
  console.log("📦 Initializing database...");

  // 1️⃣ Sync versioning table
  const versioningSchemaPath = path.join(__dirname, "schema", "procedure_versions.schema.sql");
  if (fs.existsSync(versioningSchemaPath)) {
    const versioningSchema = fs.readFileSync(versioningSchemaPath, "utf8");
    await db.query(versioningSchema);
    console.log("✅ Versioning table initialized");
  }

  // 2️⃣ Sync other tables (if any)
  try {
    await syncSchema("users.schema.sql");
  } catch (error) {
    console.log("⚠️  Could not sync users schema (may not exist):", error.message);
  }
}

async function start() {
  try {
    console.log("🚀 Starting MySQL Procedure Versioning Server...");

    // Initialize database tables
    await initializeDatabase();

    // Optionally sync all procedures on startup
    const syncOnStartup = process.env.SYNC_ON_STARTUP !== "false";
    if (syncOnStartup) {
      console.log("🔄 Syncing all procedures on startup...");
      const results = await syncAllProcedures();
      const changed = results.filter(r => r.changed).length;
      const unchanged = results.filter(r => !r.changed).length;
      console.log(`✅ Sync complete: ${changed} updated, ${unchanged} unchanged`);
    }

    // Start Express server
    app.listen(PORT, () => {
      console.log(`🌐 Server running on http://localhost:${PORT}`);
      console.log(`📡 API endpoints available at http://localhost:${PORT}/api/procedures`);
      console.log(`💚 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error("❌ Startup error:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGTERM", async () => {
  console.log("🛑 SIGTERM received, shutting down gracefully...");
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("🛑 SIGINT received, shutting down gracefully...");
  process.exit(0);
});

start();
