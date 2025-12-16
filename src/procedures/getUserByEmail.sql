DROP PROCEDURE IF EXISTS get_user_by_email;

CREATE PROCEDURE get_user_by_email(IN p_email VARCHAR(255))
BEGIN
    SELECT id, name, email, created_at, updated_at
    FROM users
    WHERE email = p_email
    LIMIT 1;
END;

