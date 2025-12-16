DROP PROCEDURE IF EXISTS delete_user;

CREATE PROCEDURE delete_user(IN p_id INT)
BEGIN
    DELETE FROM users
    WHERE id = p_id;
    
    SELECT ROW_COUNT() as affected_rows;
END;

