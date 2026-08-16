const mysql = require("mysql2/promise");

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10
});

// Test database connection
(async () => {
    try {
        const connection = await db.getConnection();

        console.log("✅ MySQL Connected");
        console.log(`📦 Database: ${process.env.DB_NAME}`);

        connection.release();
    } catch (error) {
        console.error("❌ MySQL Connection Error:", error.message);
    }
})();

module.exports = db;