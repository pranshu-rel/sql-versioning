DROP PROCEDURE IF EXISTS update_user;

CREATE PROCEDURE update_user(IN p_id INT, IN p_name VARCHAR(255), IN p_email VARCHAR(255), IN p_password VARCHAR(255))
BEGIN
    UPDATE users
    SET 
        name = COALESCE(p_name, name),
        email = COALESCE(p_email, email),
        password = COALESCE(p_password, password),
        updated_at = NOW()
    WHERE id = p_id;
    
    SELECT ROW_COUNT() as affected_rows;
END;

