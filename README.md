# SQL Versioning - MySQL Procedure Management Server

A Node.js server for maintaining, versioning, and automatically syncing MySQL stored procedures.

## Features

- ✅ **Automatic Change Detection**: Detects when procedures are modified and updates them automatically
- ✅ **Versioning**: Tracks all versions of stored procedures with full history
- ✅ **RESTful API**: Manage procedures via HTTP endpoints
- ✅ **Hash-based Comparison**: Uses SHA256 hashing to detect changes efficiently
- ✅ **Version History**: View complete version history for any procedure

## Installation

1. Install dependencies:
```bash
npm install
```

2. Configure your MySQL connection in `src/db/mysql.js`:
```javascript
const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "your_password",
  database: "your_database",
  multipleStatements: true
});
```

3. Start the server:
```bash
npm start
```

The server will:
- Initialize the versioning table
- Sync all procedures from the `src/procedures/` directory
- Start the Express server on port 3000 (or PORT environment variable)

## Environment Variables

- `PORT`: Server port (default: 3000)
- `SYNC_ON_STARTUP`: Whether to sync procedures on startup (default: true)

## API Endpoints

### Health Check
```
GET /health
```
Returns server status.

### Get All Procedures
```
GET /api/procedures
```
Returns all procedures with their latest version information.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "procedure_name": "get_user_by_id",
      "latest_version": 3,
      "definition_hash": "abc123...",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-15T00:00:00.000Z",
      "exists_in_db": 1
    }
  ]
}
```

### Get Procedure Versions
```
GET /api/procedures/:name/versions
```
Returns all versions of a specific procedure.

**Example:**
```
GET /api/procedures/get_user_by_id/versions
```

**Response:**
```json
{
  "success": true,
  "procedure": "get_user_by_id",
  "versions": [
    {
      "id": 1,
      "version": 3,
      "definition_hash": "abc123...",
      "definition_text": "BEGIN ... END",
      "created_at": "2024-01-15T00:00:00.000Z",
      "updated_at": "2024-01-15T00:00:00.000Z"
    }
  ]
}
```

### Sync Single Procedure
```
POST /api/procedures/sync
```
Syncs a specific procedure from a SQL file.

**Request Body:**
```json
{
  "procedureName": "get_user_by_id",
  "sqlFile": "getUserById.sql"
}
```

**Response:**
```json
{
  "success": true,
  "action": "updated",
  "version": 3,
  "changed": true
}
```

### Sync All Procedures
```
POST /api/procedures/sync-all
```
Syncs all procedures from the `src/procedures/` directory.

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "procedure": "get_user_by_id",
      "file": "getUserById.sql",
      "success": true,
      "action": "updated",
      "version": 3,
      "changed": true
    }
  ]
}
```

## Procedure File Format

Store your procedures in `src/procedures/` directory. Each file should follow this format:

```sql
DROP PROCEDURE IF EXISTS procedure_name;

CREATE PROCEDURE procedure_name(IN param1 INT)
BEGIN
    -- Your procedure logic here
    SELECT * FROM table_name WHERE id = param1;
END;
```

**Note:** The procedure name in the SQL file should match the naming convention:
- File: `getUserById.sql` → Procedure: `get_user_by_id`
- The service automatically converts camelCase to snake_case

## How It Works

1. **Change Detection**: When syncing a procedure, the service:
   - Reads the SQL file
   - Extracts the procedure definition
   - Calculates a SHA256 hash of the normalized definition
   - Compares with the latest stored version hash

2. **Versioning**: If the procedure has changed:
   - Creates a new version entry in the `procedure_versions` table
   - Updates the procedure in MySQL using `DROP` and `CREATE`
   - Stores the full definition and hash for history

3. **Automatic Sync**: On server startup, all procedures are automatically synced (unless `SYNC_ON_STARTUP=false`)

## Database Schema

The server creates a `procedure_versions` table to track versions:

```sql
CREATE TABLE procedure_versions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  procedure_name VARCHAR(255) NOT NULL,
  version INT NOT NULL DEFAULT 1,
  definition_hash VARCHAR(64) NOT NULL,
  definition_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## Example Usage

### Using cURL

```bash
# Get all procedures
curl http://localhost:3000/api/procedures

# Get versions of a procedure
curl http://localhost:3000/api/procedures/get_user_by_id/versions

# Sync a specific procedure
curl -X POST http://localhost:3000/api/procedures/sync \
  -H "Content-Type: application/json" \
  -d '{"procedureName": "get_user_by_id", "sqlFile": "getUserById.sql"}'

# Sync all procedures
curl -X POST http://localhost:3000/api/procedures/sync-all
```

## Project Structure

```
sql-versioning/
├── src/
│   ├── db/
│   │   └── mysql.js              # MySQL connection pool
│   ├── procedures/                # SQL procedure files
│   │   └── getUserById.sql
│   ├── routes/
│   │   └── procedures.routes.js  # API routes
│   ├── schema/
│   │   ├── procedure_versions.schema.sql
│   │   └── users.schema.sql
│   ├── services/
│   │   ├── procedureSync.service.js  # Core versioning logic
│   │   └── schemaSync.service.js
│   ├── index.js                   # Server entry point
│   └── server.js                  # Express server setup
├── package.json
└── README.md
```

## License

ISC
