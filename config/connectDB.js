// =============================================
// SECTION: Database Connection
// This function connects Mongoose to MongoDB
// using the URI passed from server.js
// =============================================

const mongoose = require("mongoose");

/**
 * connectDB – Connects to MongoDB using the provided connection string.
 * 
 * HOW IT WORKS:
 *   1. server.js calls connectDB(process.env.MONGO_URI)
 *   2. mongoose.connect() opens a persistent connection to the DB
 *   3. If successful, logs "Database Connected ..."
 *   4. If the URI is wrong or Mongo is down, the error is caught and logged
 *
 * @param {string} DATABASE_URL - MongoDB connection string (e.g. mongodb://localhost:27017/auth-app)
 */
const connectDB = async (DATABASE_URL) => {
    try {
        await mongoose.connect(DATABASE_URL);
        console.log("Database Connected ...");
    } catch (error) {
        console.log(error);
    }
}

module.exports = connectDB