import mysql from "mysql2/promise";
import dotenv from 'dotenv'
dotenv.config()

const dbConfig = {
  host: process.env.DBHOSTNAME,  // Change to your DB host
  user: process.env.DBUSERNAME,       // Change to your DB username
  password: process.env.DBPASSWORD,       // Change to your DB password
  database: process.env.DBNAME, // Change to your DB name
  port: process.env.DBPORT
};

let connection;

async function connectDB() {
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log("✅ MySQL Connected!");
  } catch (error) {
    console.error("❌ MySQL Connection Error:", error.message);
    process.exit(1);
  }
}

export { connectDB, connection };
