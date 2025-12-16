DROP PROCEDURE IF EXISTS get_all_users;

CREATE PROCEDURE get_all_users()
BEGIN
    SELECT id, name, email, created_at, updated_at
    FROM users
    ORDER BY created_at DESC;
END;

