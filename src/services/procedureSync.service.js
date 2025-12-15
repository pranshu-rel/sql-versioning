const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const db = require("../db/mysql");

/**
 * Check if a procedure exists in the database
 */
async function procedureExists(name) {
  const [rows] = await db.query(
    `SELECT ROUTINE_NAME
     FROM information_schema.ROUTINES
     WHERE ROUTINE_SCHEMA = DATABASE()
     AND ROUTINE_TYPE = 'PROCEDURE'
     AND ROUTINE_NAME = ?`,
    [name]
  );
  return rows.length > 0;
}

/**
 * Get the current procedure definition from MySQL
 */
async function getCurrentProcedureDefinition(name) {
  const [rows] = await db.query(
    `SELECT ROUTINE_DEFINITION
     FROM information_schema.ROUTINES
     WHERE ROUTINE_SCHEMA = DATABASE()
     AND ROUTINE_TYPE = 'PROCEDURE'
     AND ROUTINE_NAME = ?`,
    [name]
  );
  return rows.length > 0 ? rows[0].ROUTINE_DEFINITION : null;
}

/**
 * Calculate SHA256 hash of a string
 */
function calculateHash(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

/**
 * Normalize SQL definition for comparison (remove whitespace, comments, etc.)
 */
function normalizeDefinition(sql) {
  return sql
    .replace(/--.*$/gm, "") // Remove single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, "") // Remove multi-line comments
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim()
    .toLowerCase();
}

/**
 * Extract procedure name from SQL file
 */
function extractProcedureName(sql) {
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
 * Extract procedure definition from SQL file (removes DROP and CREATE wrapper)
 */
function extractProcedureDefinition(sql) {
  // Remove DROP PROCEDURE IF EXISTS line
  let cleaned = sql.replace(/DROP\s+PROCEDURE\s+IF\s+EXISTS\s+[^;]+;?/gi, "").trim();
  
  // Extract the procedure body from CREATE PROCEDURE
  const createMatch = cleaned.match(/CREATE\s+PROCEDURE\s+[^(]+\([^)]*\)\s*(BEGIN[\s\S]*END)/i);
  if (createMatch) {
    return createMatch[1];
  }
  return cleaned;
}

/**
 * Get the latest version of a procedure from versioning table
 */
async function getLatestVersion(procedureName) {
  const [rows] = await db.query(
    `SELECT version, definition_hash, definition_text
     FROM procedure_versions
     WHERE procedure_name = ?
     ORDER BY version DESC
     LIMIT 1`,
    [procedureName]
  );
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Save a new version of the procedure
 */
async function saveVersion(procedureName, definitionText, definitionHash) {
  const latest = await getLatestVersion(procedureName);
  const newVersion = latest ? latest.version + 1 : 1;

  await db.query(
    `INSERT INTO procedure_versions (procedure_name, version, definition_hash, definition_text)
     VALUES (?, ?, ?, ?)`,
    [procedureName, newVersion, definitionHash, definitionText]
  );

  return newVersion;
}

/**
 * Sync a procedure: detect changes, version, and update if needed
 */
async function syncProcedure(procName, sqlFile) {
  const sqlPath = path.join(__dirname, "..", "procedures", sqlFile);
  const sql = fs.readFileSync(sqlPath, "utf8");

  // Extract the actual procedure definition
  const newDefinition = extractProcedureDefinition(sql);
  const normalizedNew = normalizeDefinition(newDefinition);
  const newHash = calculateHash(normalizedNew);

  const exists = await procedureExists(procName);
  let currentDefinition = null;
  let currentHash = null;

  if (exists) {
    // Get current definition from database
    currentDefinition = await getCurrentProcedureDefinition(procName);
    if (currentDefinition) {
      const normalizedCurrent = normalizeDefinition(currentDefinition);
      currentHash = calculateHash(normalizedCurrent);
    }
  }

  // Check if procedure has changed
  const latestVersion = await getLatestVersion(procName);
  const hasChanged = !latestVersion || latestVersion.definition_hash !== newHash;

  if (hasChanged) {
    // Apply the procedure change
    console.log(
      exists
        ? `♻️ Updating procedure: ${procName}`
        : `🆕 Creating procedure: ${procName}`
    );

    await db.query(sql);

    // Save new version
    const version = await saveVersion(procName, newDefinition, newHash);
    console.log(`✅ Procedure synced: ${procName} (version ${version})`);
    
    return {
      success: true,
      action: exists ? "updated" : "created",
      version: version,
      changed: true
    };
  } else {
    console.log(`✓ Procedure unchanged: ${procName} (version ${latestVersion.version})`);
    return {
      success: true,
      action: "unchanged",
      version: latestVersion.version,
      changed: false
    };
  }
}

/**
 * Get all versions of a procedure
 */
async function getProcedureVersions(procedureName) {
  const [rows] = await db.query(
    `SELECT id, version, definition_hash, definition_text, created_at, updated_at
     FROM procedure_versions
     WHERE procedure_name = ?
     ORDER BY version DESC`,
    [procedureName]
  );
  return rows;
}

/**
 * Get all procedures with their latest versions
 */
async function getAllProcedures() {
  const [rows] = await db.query(
    `SELECT 
       pv.procedure_name,
       pv.version as latest_version,
       pv.definition_hash,
       pv.created_at,
       pv.updated_at,
       CASE WHEN r.ROUTINE_NAME IS NOT NULL THEN 1 ELSE 0 END as exists_in_db
     FROM (
       SELECT procedure_name, MAX(version) as max_version
       FROM procedure_versions
       GROUP BY procedure_name
     ) latest
     INNER JOIN procedure_versions pv 
       ON pv.procedure_name = latest.procedure_name 
       AND pv.version = latest.max_version
     LEFT JOIN information_schema.ROUTINES r
       ON r.ROUTINE_SCHEMA = DATABASE()
       AND r.ROUTINE_TYPE = 'PROCEDURE'
       AND r.ROUTINE_NAME = pv.procedure_name`
  );
  return rows;
}

/**
 * Sync all procedures from the procedures directory
 */
async function syncAllProcedures() {
  const proceduresDir = path.join(__dirname, "..", "procedures");
  const files = fs.readdirSync(proceduresDir).filter(f => f.endsWith(".sql"));
  
  const results = [];
  for (const file of files) {
    try {
      // Extract procedure name from SQL file
      const sqlPath = path.join(proceduresDir, file);
      const sql = fs.readFileSync(sqlPath, "utf8");
      const procName = extractProcedureName(sql);
      
      if (!procName) {
        results.push({ 
          procedure: null, 
          file, 
          success: false, 
          error: "Could not extract procedure name from SQL file" 
        });
        continue;
      }
      
      const result = await syncProcedure(procName, file);
      results.push({ procedure: procName, file, ...result });
    } catch (error) {
      results.push({ 
        procedure: null, 
        file, 
        success: false, 
        error: error.message 
      });
    }
  }
  return results;
}

module.exports = {
  syncProcedure,
  getProcedureVersions,
  getAllProcedures,
  syncAllProcedures
};
