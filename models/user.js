// =============================================
// SECTION: User Model (Mongoose Schema)
// Defines the shape of a User document in the
// "users" collection in MongoDB
// =============================================

const mongoose = require("mongoose");

/**
 * userScheme – Defines what fields each User document has:
 *
 *   username : String  – the display name (must be unique, whitespace trimmed)
 *   email    : String  – login email (must be unique, whitespace trimmed)
 *   password : String  – bcrypt-hashed password (never stored in plain text)
 *
 * Mongoose automatically adds an _id (ObjectId) and __v (version) field.
 */
const userScheme = new mongoose.Schema({
    username: { type: String, required: true, trim: true, unique: true },
    email:    { type: String, required: true, trim: true, unique: true },
    password: { type: String, required: true, trim: true }
})

// Creates (or reuses) a Mongoose model called "User"
// Mongoose will look for / create a collection named "users" (lowercase + plural)
const userModel = mongoose.model("User", userScheme)

module.exports = userModel