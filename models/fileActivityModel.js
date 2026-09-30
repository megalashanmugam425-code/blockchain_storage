const db = require("../config/db");

const FileActivity = {

    async create(
        user_id,
        file_id,
        activity_type,
        activity_description,
        ip_address
    ) {

        const [result] =
            await db.execute(
                `INSERT INTO file_activity_logs
                (
                    user_id,
                    file_id,
                    activity_type,
                    activity_description,
                    ip_address
                )
                VALUES (?, ?, ?, ?, ?)`,
                [
                    user_id,
                    file_id,
                    activity_type,
                    activity_description,
                    ip_address
                ]
            );

        return result;
    },


    async findByUserId(
        user_id
    ) {

        const [rows] =
            await db.execute(
                `SELECT
                    id,
                    user_id,
                    file_id,
                    activity_type,
                    activity_description,
                    ip_address,
                    created_at
                 FROM file_activity_logs
                 WHERE user_id = ?
                 ORDER BY created_at DESC`,
                [
                    user_id
                ]
            );

        return rows;
    },


    async findByFileId(
        file_id,
        user_id
    ) {

        const [rows] =
            await db.execute(
                `SELECT
                    id,
                    user_id,
                    file_id,
                    activity_type,
                    activity_description,
                    ip_address,
                    created_at
                 FROM file_activity_logs
                 WHERE file_id = ?
                 AND user_id = ?
                 ORDER BY created_at DESC`,
                [
                    file_id,
                    user_id
                ]
            );

        return rows;
    }

};

module.exports = FileActivity;
