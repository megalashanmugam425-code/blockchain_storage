
const db = require("../config/db");

const File = {
    async create(
        user_id,
        original_name,
        encrypted_name,
        file_size,
        compressed_size,
        compression_ratio,
        ipfs_cid,
        upload_status,
        blockchain_file_id,
        blockchain_tx_hash
    ) {
        const [result] = await db.execute(
            `INSERT INTO files
            (
                user_id,
                original_name,
                encrypted_name,
                file_size,
                compressed_size,
                compression_ratio,
                ipfs_cid,
                upload_status,
                blockchain_file_id,
                blockchain_tx_hash
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                user_id,
                original_name,
                encrypted_name,
                file_size,
                compressed_size,
                compression_ratio,
                ipfs_cid,
                upload_status,
                blockchain_file_id,
                blockchain_tx_hash
            ]
        );

        return result;
    },

    async findByUserId(user_id) {
        const [rows] = await db.execute(
            `SELECT
                id,
                user_id,
                original_name,
                encrypted_name,
                file_size,
                compressed_size,
                compression_ratio,
                ipfs_cid,
                upload_status,
                blockchain_file_id,
                blockchain_tx_hash,
                created_at
             FROM files
             WHERE user_id = ?
             AND deleted_at IS NULL
             ORDER BY created_at DESC`,
            [user_id]
        );

        return rows;
    },

    async findById(id, user_id) {
        const [rows] = await db.execute(
            `SELECT *
             FROM files
             WHERE id = ?
             AND user_id = ?
             AND deleted_at IS NULL`,
            [id, user_id]
        );

        return rows[0];
    },

    async softDelete(id, user_id) {
        const [result] = await db.execute(
            `UPDATE files
             SET deleted_at = CURRENT_TIMESTAMP
             WHERE id = ?
             AND user_id = ?
             AND deleted_at IS NULL`,
            [id, user_id]
        );

        return result.affectedRows;
    },

    async findPendingTransactions() {
        const [rows] = await db.execute(
            `SELECT
                id,
                blockchain_tx_hash
             FROM files
             WHERE upload_status = 'pending'
             AND blockchain_tx_hash IS NOT NULL
             ORDER BY created_at ASC
             LIMIT 50`
        );

        return rows;
    },

    async markAsConfirmed(
        id,
        fileId,
        transactionHash
    ) {
        const [result] = await db.execute(
            `UPDATE files
             SET upload_status = 'uploaded',
                 blockchain_file_id = ?
             WHERE id = ?
             AND blockchain_tx_hash = ?
             AND upload_status = 'pending'`,
            [
                fileId,
                id,
                transactionHash
            ]
        );

        return result.affectedRows;
    },

    async markAsFailed(
        id,
        transactionHash
    ) {
        const [result] = await db.execute(
            `UPDATE files
             SET upload_status = 'failed'
             WHERE id = ?
             AND blockchain_tx_hash = ?
             AND upload_status = 'pending'`,
            [
                id,
                transactionHash
            ]
        );

        return result.affectedRows;
    }
};

module.exports = File;
