const db = require("../config/db");

const User = {

    async create(full_name, email, password) {
        const [result] = await db.execute(
            `INSERT INTO users (full_name, email, password)
             VALUES (?, ?, ?)`,
            [full_name, email, password]
        );

        return result;
    },

    async findByEmail(email) {
        const [rows] = await db.execute(
            "SELECT * FROM users WHERE email = ?",
            [email]
        );

        return rows[0];
    }

};

module.exports = User;
