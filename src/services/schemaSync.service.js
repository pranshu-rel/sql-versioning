const fs = require("fs");
const path = require("path");
const db = require("../db/mysql");

async function syncSchema(schemaFile) {
  const schemaPath = path.join(__dirname, "..", "schema", schemaFile);
  const sql = fs.readFileSync(schemaPath, "utf8");

  console.log(`📐 Syncing schema: ${schemaFile}`);
  await db.query(sql);
  console.log(`✅ Schema synced: ${schemaFile}`);
}

module.exports = {
  syncSchema
};
