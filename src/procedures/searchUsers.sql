DROP PROCEDURE IF EXISTS search_users;

CREATE PROCEDURE search_users(IN p_search_term VARCHAR(255))
BEGIN
    SELECT id, name, email, created_at, updated_at
    FROM users
    WHERE 
        name LIKE CONCAT('%', p_search_term, '%')
        OR email LIKE CONCAT('%', p_search_term, '%')
    ORDER BY name ASC;
END;

