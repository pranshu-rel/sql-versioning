CREATE TABLE IF NOT EXISTS procedure_versions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  procedure_name VARCHAR(255) NOT NULL,
  version INT NOT NULL DEFAULT 1,
  definition_hash VARCHAR(64) NOT NULL,
  definition_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_procedure_name (procedure_name),
  INDEX idx_procedure_version (procedure_name, version),
  UNIQUE KEY unique_procedure_version (procedure_name, version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

