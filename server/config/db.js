const mysql = require("mysql2/promise");

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 4000,

    // TiDB Cloud requires TLS on its public endpoint
    ssl: {
        minVersion: "TLSv1.2"
    },

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test database connection
(async () => {
    try {
        const connection = await db.getConnection();

        console.log("✅ TiDB/MySQL Connected");
        console.log(`📦 Database: ${process.env.DB_NAME}`);

        connection.release();
    } catch (error) {
        console.error("❌ MySQL Connection Error:", error.message);
    }
})();

module.exports = db;