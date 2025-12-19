const db = require('../config/database');

async function testConnection() {
    try {
        console.log("Attempting to connect to the database...");
        
        const [rows] = await db.query('SELECT * FROM BOOK');
        
        if (rows.length > 0) {
            console.log("Database connected.");
            console.log("Books found in DB:");
            console.table(rows); 
        } else {
            console.log("Connected, but the BOOK table is empty.");
        }
        
    } catch (error) {
        console.error("Database Connection Failed!");
        console.error("Error Details:", error.message);
    } finally {
        process.exit(); 
    }
}

testConnection();