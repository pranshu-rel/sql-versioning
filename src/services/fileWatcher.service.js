const fs = require("fs");
const path = require("path");
const { syncProcedure } = require("./procedureSync.service");

/**
 * File watcher service to automatically detect and sync procedure changes
 */
class FileWatcherService {
  constructor(proceduresDir) {
    this.proceduresDir = proceduresDir;
    this.watcher = null;
    this.debounceTimers = new Map(); // Track debounce timers for each file
    this.debounceDelay = 500; // Wait 500ms after last change before syncing
  }

  /**
   * Start watching the procedures directory
   */
  start() {
    if (!fs.existsSync(this.proceduresDir)) {
      console.error(`❌ Procedures directory not found: ${this.proceduresDir}`);
      return;
    }

    console.log(`👀 Watching procedures directory: ${this.proceduresDir}`);

    // Watch the directory for changes
    this.watcher = fs.watch(this.proceduresDir, { recursive: false }, (eventType, filename) => {
      if (!filename) return;

      // Only watch .sql files
      if (!filename.endsWith(".sql")) return;

      const filePath = path.join(this.proceduresDir, filename);

      // Handle file changes
      if (eventType === "change") {
        this.handleFileChange(filename, filePath);
      } else if (eventType === "rename") {
        // File might have been added or deleted
        // Check if file exists after a short delay
        setTimeout(() => {
          if (fs.existsSync(filePath)) {
            this.handleFileChange(filename, filePath);
          } else {
            console.log(`📝 File removed: ${filename} (no action taken)`);
          }
        }, 100);
      }
    });

    console.log("✅ File watcher started");
  }

  /**
   * Handle file change with debouncing
   */
  handleFileChange(filename, filePath) {
    // Clear existing timer for this file
    if (this.debounceTimers.has(filename)) {
      clearTimeout(this.debounceTimers.get(filename));
    }

    // Set new timer
    const timer = setTimeout(async () => {
      try {
        // Read the file to extract procedure name
        const sql = fs.readFileSync(filePath, "utf8");
        
        // Extract procedure name from SQL
        const procName = this.extractProcedureName(sql);
        
        if (!procName) {
          console.log(`⚠️  Could not extract procedure name from ${filename}`);
          return;
        }

        console.log(`🔄 Detected change in ${filename}, syncing procedure: ${procName}`);
        
        // Sync the procedure
        const result = await syncProcedure(procName, filename);
        
        if (result.changed) {
          console.log(`✅ Auto-synced: ${procName} (${result.action})`);
        } else {
          console.log(`✓ Auto-checked: ${procName} (unchanged)`);
        }
      } catch (error) {
        console.error(`❌ Error syncing ${filename}:`, error.message);
      } finally {
        // Remove timer from map
        this.debounceTimers.delete(filename);
      }
    }, this.debounceDelay);

    this.debounceTimers.set(filename, timer);
  }

  /**
   * Extract procedure name from SQL file
   */
  extractProcedureName(sql) {
    // Try to get from DROP PROCEDURE IF EXISTS
    const dropMatch = sql.match(/DROP\s+PROCEDURE\s+IF\s+EXISTS\s+([^\s;]+)/i);
    if (dropMatch) {
      return dropMatch[1];
    }
    
    // Try to get from CREATE PROCEDURE
    const createMatch = sql.match(/CREATE\s+PROCEDURE\s+([^\s(]+)/i);
    if (createMatch) {
      return createMatch[1];
    }
    
    return null;
  }

  /**
   * Stop watching
   */
  stop() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      
      // Clear all debounce timers
      this.debounceTimers.forEach(timer => clearTimeout(timer));
      this.debounceTimers.clear();
      
      console.log("🛑 File watcher stopped");
    }
  }
}

module.exports = FileWatcherService;

