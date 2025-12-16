const { syncAllProcedures } = require("./services/procedureSync.service");
const FileWatcherService = require("./services/fileWatcher.service");
const db = require("./db/mysql");
const fs = require("fs");
const path = require("path");

async function initializeDatabase() {
  console.log(" Initializing database...");

  // 1️⃣ Sync versioning table (required for procedure versioning)
  const versioningSchemaPath = path.join(__dirname, "schema", "procedure_versions.schema.sql");
  if (fs.existsSync(versioningSchemaPath)) {
    const versioningSchema = fs.readFileSync(versioningSchemaPath, "utf8");
    await db.query(versioningSchema);
    console.log("✅ Versioning table initialized");
  }
}

// Store watcher instance for cleanup
let fileWatcherInstance = null;

async function start() {
  try {
    console.log("🚀 Starting MySQL Procedure Versioning Server...");

    // Initialize database tables
    await initializeDatabase();

    // Optionally sync all procedures on startup
    const syncOnStartup =false;
    if (syncOnStartup) {
      console.log("🔄 Syncing all procedures on startup...");
      const results = await syncAllProcedures();
      const changed = results.filter(r => r.changed).length;
      const unchanged = results.filter(r => !r.changed).length;
      console.log(`✅ Sync complete: ${changed} updated, ${unchanged} unchanged`);

    }

    // Start file watcher for automatic sync
    const proceduresDir = path.join(__dirname, "procedures");
    fileWatcherInstance = new FileWatcherService(proceduresDir);
    fileWatcherInstance.start();

    console.log("✅ Initialization complete");
  } catch (error) {
    console.error("❌ Startup error:", error);
    process.exit(1);
  }
}

// Handle shutdown
process.on("SIGINT", async () => {
  console.log("🛑 SIGINT received, shutting down...");
  if (fileWatcherInstance) {
    fileWatcherInstance.stop();
  }
  process.exit(0);
});

start();
