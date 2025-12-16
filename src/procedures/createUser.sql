DROP PROCEDURE IF EXISTS create_user;

CREATE PROCEDURE create_user(IN p_name VARCHAR(255), IN p_email VARCHAR(255), IN p_password VARCHAR(255))
BEGIN
    INSERT INTO users (name, email, password, created_at, updated_at)
    VALUES (p_name, p_email, p_password, NOW(), NOW());
    
    SELECT LAST_INSERT_ID() as id;
END;

