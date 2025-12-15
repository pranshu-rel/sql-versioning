const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "root",
  database: "database_development",
  multipleStatements: true
});

module.exports = pool;
