DROP PROCEDURE IF EXISTS get_user_by_id;

CREATE PROCEDURE get_user_by_id(IN uid INT)
BEGIN
    SELECT id, name, email
    FROM users
    WHERE id = uid;
END;
