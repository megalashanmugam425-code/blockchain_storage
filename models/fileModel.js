const db = require("../config/db");

const File = {

    async create(
        user_id,
        original_name,
        encrypted_name,
        file_size,
        ipfs_cid,
        upload_status
    ) {

        const [result] = await db.execute(
            `INSERT INTO files
            (
                user_id,
                original_name,
                encrypted_name,
                file_size,
                ipfs_cid,
                upload_status
            )
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                user_id,
                original_name,
                encrypted_name,
                file_size,
                ipfs_cid,
                upload_status
            ]
        );

        return result;
    },

    async findByUserId(user_id) {

        const [rows] = await db.execute(
            `SELECT
                id,
                original_name,
                encrypted_name,
                file_size,
                ipfs_cid,
                upload_status,
                created_at
             FROM files
             WHERE user_id = ?
             ORDER BY created_at DESC`,
            [user_id]
        );

        return rows;
    },

    async findById(id, user_id) {

        const [rows] = await db.execute(
            `SELECT *
             FROM files
             WHERE id = ? AND user_id = ?`,
            [id, user_id]
        );

        return rows[0];
    }

};

module.exports = File;
