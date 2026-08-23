// =============================================
// SECTION: Auth Routes (Authentication API)
// Handles user registration, login, logout,
// and checking if a user is currently logged in.
// All routes are prefixed with /api/auth
// (set in server.js)
// =============================================

const express = require("express")
const bcrypt = require("bcryptjs")    // Used to hash & compare passwords securely
const router = express.Router()        // Creates a mini-router we can attach endpoints to
const userModel = require("../models/user")  // Mongoose User model

// ─────────────────────────────────────────────
// API: POST /api/auth/register
// PURPOSE: Creates a new user account
//
// FRONTEND SENDS (JSON body):
//   { username, email, password }
//
// BACKEND RETURNS:
//   201 → { message, username }        (success – user created & session started)
//   400 → { message }                  (email already exists OR username taken)
//   500 → { message }                  (server / database error)
//
// DATA FLOW:
//   1. Frontend collects username, email, password from the register form
//   2. Sends POST /api/auth/register with JSON body
//   3. Backend checks if email or username already exist in DB
//   4. Hashes the password with bcrypt (salt rounds = 10)
//   5. Creates a new User document in MongoDB
//   6. Saves user._id and user.username in the session (logs user in)
//   7. Returns 201 with success message & username
//   8. Frontend receives 201 → redirects to dashboard.html
// ─────────────────────────────────────────────
router.post("/register", async (req, res) => {
    try {
        // Extract fields from the request body sent by the frontend
        const username = req.body.username
        const email = req.body.email
        const password = req.body.password

        // Check if this email is already registered
        const existingEmail = await userModel.findOne({ email })
        // Check if this username is already taken
        const existingUsername = await userModel.findOne({ username })

        if (existingEmail) {
            return res.status(400).json({ message: "Email already exists" })
        }
        if (existingUsername) {
            return res.status(400).json({ message: "Username already taken" })
        }

        // Hash the plain-text password before storing (10 salt rounds)
        const hashedPassword = await bcrypt.hash(password, 10)

        // Create the user document in MongoDB
        const user = await userModel.create({
            username,
            email,
            password: hashedPassword   // Only the hash is stored, never the real password
        })

        // Store user info in the session → this logs the user in
        req.session.userId = user._id
        req.session.username = user.username

        // Send success response back to the frontend
        res.status(201).json({ message: "Registered successfully", username: user.username })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Internal server error" })
    }
})

// ─────────────────────────────────────────────
// API: POST /api/auth/login
// PURPOSE: Authenticates an existing user
//
// FRONTEND SENDS (JSON body):
//   { email, password }
//
// BACKEND RETURNS:
//   200 → { message, username }        (success – session created)
//   400 → { message }                  (email not found OR wrong password)
//   500 → { message }                  (server error)
//
// DATA FLOW:
//   1. Frontend collects email & password from the login form
//   2. Sends POST /api/auth/login with JSON body
//   3. Backend looks up the user by email
//   4. Compares the plain password with the stored hash using bcrypt
//   5. If match → saves userId & username in session
//   6. Returns 200 with success message
//   7. Frontend receives 200 → redirects to dashboard.html
// ─────────────────────────────────────────────
router.post("/login", async (req, res) => {
    try {
        const email = req.body.email
        const password = req.body.password

        // Find user by email
        const existingEmail = await userModel.findOne({ email })
        if (!existingEmail) {
            return res.status(400).json({ message: "Email not found" })
        }

        // Compare submitted password with the stored bcrypt hash
        const isMatch = await bcrypt.compare(password, existingEmail.password)
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid password" })
        }

        // Create session → user is now logged in
        req.session.userId = existingEmail._id
        req.session.username = existingEmail.username

        // Send success response back to the frontend
        res.status(200).json({ message: "Login successful", username: existingEmail.username })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Internal server error" })
    }
})

// ─────────────────────────────────────────────
// API: POST /api/auth/logout
// PURPOSE: Destroys the user's session (logs out)
//
// FRONTEND SENDS: nothing (just a POST request)
//
// BACKEND RETURNS:
//   200 → { message: "Logout successful" }
//   500 → { message }                  (if session destroy fails)
//
// DATA FLOW:
//   1. Frontend sends POST /api/auth/logout
//   2. Backend calls req.session.destroy() which removes session from MongoDB
//   3. The session cookie on the browser becomes invalid
//   4. Frontend receives 200 → redirects to index.html (login page)
// ─────────────────────────────────────────────
router.post("/logout", (req, res) => {
    // Destroy the session stored in MongoDB
    req.session.destroy((err) => {
        if (err) {
            console.log(err)
            return res.status(500).json({ message: "Internal server error" })
        }
        res.status(200).json({ message: "Logout successful" })
    })
})

// ─────────────────────────────────────────────
// API: GET /api/auth/me
// PURPOSE: Checks if the current user is logged in
//          (used on page load to auto-redirect)
//
// FRONTEND SENDS: nothing (just a GET request;
//   the session cookie is sent automatically)
//
// BACKEND RETURNS:
//   200 → { loggedIn: true,  username }   (session exists)
//   200 → { loggedIn: false }             (no session / not logged in)
//
// DATA FLOW:
//   1. Frontend calls GET /api/auth/me on page load
//   2. Browser automatically sends the session cookie
//   3. Backend checks if req.session.userId exists
//   4. Returns loggedIn: true/false
//   5. Frontend uses this to decide whether to redirect:
//      - On index.html → if loggedIn, redirect to dashboard.html
//      - On dashboard.html → if NOT loggedIn, redirect to index.html
// ─────────────────────────────────────────────
router.get("/me", (req, res) => {
    if (req.session.userId) {
        // User has a valid session → they are logged in
        res.status(200).json({ loggedIn: true, username: req.session.username })
    } else {
        // No session → not logged in
        res.status(200).json({ loggedIn: false })
    }
})

module.exports = router