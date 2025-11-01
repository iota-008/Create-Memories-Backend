import express from "express";
import { registerUser, loginUser, logoutUser, getMyBookmarks, requestPasswordReset, resetPassword } from "../controllers/users.js";
import Joi from "joi";
import { verify } from "./verify-token.js";
import cors from "cors";

const routerUser = express.Router();

const registerSchema = Joi.object({
    userName: Joi.string().min(3).max(64).required(),
    email: Joi.string().email().max(254).required(),
    password: Joi.string().min(6).max(128).required(),
});

const loginSchema = Joi.object({
    email: Joi.string().email().max(254).required(),
    password: Joi.string().min(6).max(128).required(),
    remember: Joi.boolean().optional(),
});

// Forgot/Reset password
const forgotSchema = Joi.object({
    email: Joi.string().email().max(254).required(),
});
const resetSchema = Joi.object({
    token: Joi.string().min(10).required(),
    password: Joi.string().min(6).max(128).required(),
});

const validate = (schema) => (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
        const message = error.details.map((d) => d.message).join("; ");
        return res.status(400).json({ message });
    }
    next();
};

/**
 * @openapi
 * /user/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userName, email, password]
 *             properties:
 *               userName:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 64
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 128
 *     responses:
 *       201:
 *         description: Registration successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 accessToken:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error
 *       409:
 *         description: Username or email already registered
 */
routerUser.post("/register", validate(registerSchema), registerUser);

/**
 * @openapi
 * /user/login:
 *   post:
 *     summary: Log in an existing user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 128
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 accessToken:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid credentials
 *       429:
 *         description: Too many login attempts
 */
routerUser.post("/login", validate(loginSchema), loginUser);

// Apply per-route CORS to guarantee headers on preflight and requests
const allowlist = (process.env.CORS_ORIGINS || "http://127.0.0.1:3000,http://localhost:3000,https://create-your-memory.netlify.app")
  .split(",").map((o)=>o.trim()).filter(Boolean);
const routeCors = cors({
  origin: true, // reflect request origin
  credentials: true,
  allowedHeaders: ["Content-Type","Authorization","auth-token","Accept","Origin","X-Requested-With"],
  methods: ["GET","HEAD","PUT","PATCH","POST","DELETE","OPTIONS"],
  optionsSuccessStatus: 204,
});

routerUser.options("/forgot", routeCors);
routerUser.options("/reset", routeCors);
routerUser.post("/forgot", routeCors, validate(forgotSchema), requestPasswordReset);
routerUser.post("/reset", routeCors, validate(resetSchema), resetPassword);

/**
 * @openapi
 * /user/logout:
 *   post:
 *     summary: Log out user (clears auth cookie)
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
routerUser.post("/logout", logoutUser);

/**
 * @openapi
 * /user/me:
 *   get:
 *     summary: Get current authenticated user profile
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 */
routerUser.get("/me", verify, (req, res) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    return res.status(200).json({ user: { _id: user._id, userName: user.userName, email: user.email } });
});

/**
 * @openapi
 * /user/me/bookmarks:
 *   get:
 *     summary: Get paginated list of current user's bookmarked posts
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Bookmarked posts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 posts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PostMessage'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *                     limit:
 *                       type: integer
 */
routerUser.get("/me/bookmarks", verify, getMyBookmarks);

export default routerUser;
