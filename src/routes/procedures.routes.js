const express = require("express");
const router = express.Router();
const {
  syncProcedure,
  getProcedureVersions,
  getAllProcedures,
  syncAllProcedures
} = require("../services/procedureSync.service");

/**
 * GET /api/procedures
 * Get all procedures with their latest versions
 */
router.get("/", async (req, res) => {
  try {
    const procedures = await getAllProcedures();
    res.json({
      success: true,
      data: procedures
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/procedures/:name/versions
 * Get all versions of a specific procedure
 */
router.get("/:name/versions", async (req, res) => {
  try {
    const { name } = req.params;
    const versions = await getProcedureVersions(name);
    res.json({
      success: true,
      procedure: name,
      versions: versions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/procedures/sync
 * Sync a specific procedure
 * Body: { procedureName: string, sqlFile: string }
 */
router.post("/sync", async (req, res) => {
  try {
    const { procedureName, sqlFile } = req.body;
    
    if (!procedureName || !sqlFile) {
      return res.status(400).json({
        success: false,
        error: "procedureName and sqlFile are required"
      });
    }

    const result = await syncProcedure(procedureName, sqlFile);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/procedures/sync-all
 * Sync all procedures from the procedures directory
 */
router.post("/sync-all", async (req, res) => {
  try {
    const results = await syncAllProcedures();
    res.json({
      success: true,
      results: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

