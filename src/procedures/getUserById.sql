DROP PROCEDURE IF EXISTS get_user_by_id;

CREATE PROCEDURE get_user_by_id(IN uid INT)
BEGIN
    SELECT id, name, email ,created_at, updated_at
    FROM users
    WHERE id = uid;
END;
