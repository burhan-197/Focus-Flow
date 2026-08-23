// =============================================
// SECTION: Import Packages
// These are all the npm packages this file needs
// =============================================
const express = require("express");        // Web framework – creates the server, handles routes & middleware
const mongoose = require("mongoose");      // ODM for MongoDB – lets us define schemas & query the DB
const cors = require("cors");              // Allows cross-origin requests (frontend ↔ backend on different ports)
const dotenv = require("dotenv");          // Loads variables from .env file into process.env
const session = require("express-session");// Manages user sessions (login state) via cookies
const MongoStore = require("connect-mongo").default; // Stores session data in MongoDB instead of memory
const path = require("path");             // Node built-in – helps build cross-platform file paths

// =============================================
// SECTION: Load Environment Variables
// Reads .env file so we can use process.env.*
// =============================================
dotenv.config()

// =============================================
// SECTION: Import Route Files
// Each file contains a group of API endpoints
// =============================================
const authRoutes = require("./routes/auth")   // Handles /api/auth/* (register, login, logout, me)
const taskRoutes = require("./routes/task")   // Handles /api/tasks/* (CRUD for tasks)

// =============================================
// SECTION: Create Express App & Apply Middleware
// Middleware runs on EVERY request before routes
// =============================================
const app = express();

// cors() – lets the browser call our API from a different origin (e.g. localhost:5500 → localhost:3000)
// Must come BEFORE express.json() so preflight OPTIONS requests are answered first
app.use(cors())

// express.json() – parses incoming JSON request bodies so we can read req.body
app.use(express.json())

// express.static() – serves HTML, CSS, JS, images from the /public folder
// When a user visits http://localhost:3000/ the browser gets public/index.html
app.use(express.static(path.join(__dirname, 'public')))

// =============================================
// SECTION: Session Configuration
// Creates a login session for each user; the
// session ID is stored in a cookie on the browser
// and session data is saved in MongoDB
// =============================================
app.use(session({
    secret: process.env.SESSION_SECRET,          // Secret key used to sign the session cookie
    resave: false,                               // Don't re-save session if nothing changed
    saveUninitialized: false,                    // Don't create a session until something is stored
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }), // Store sessions in MongoDB
    cookie: { maxAge: 1000 * 60 * 60 * 24 }     // Cookie expires after 24 hours (in milliseconds)
}))

// =============================================
// SECTION: Connect to MongoDB
// Uses the URI from .env to open a connection
// =============================================
const connectDB = require("./config/connectDB");
connectDB(process.env.MONGO_URI)

// =============================================
// SECTION: Register API Routes
// Maps URL prefixes to the corresponding router
// =============================================
// Any request starting with /api/auth goes to routes/auth.js
app.use('/api/auth', authRoutes)
// Any request starting with /api/tasks goes to routes/task.js
app.use('/api/tasks', taskRoutes)

// =============================================
// SECTION: Start the Server
// Listens on the port defined in .env (3000)
// =============================================
app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`)
})