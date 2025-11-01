import Users from "../models/Users.js";
import bcrypt from "bcryptjs";
import jsonwebtoken from "jsonwebtoken";
import PostMessage from "../models/PostMessage.js";
import Comment from "../models/Comment.js";
import crypto from "crypto";
import nodemailer from "nodemailer";
import qs from "querystring";

// Google OAuth helpers (top-level)
const googleAuthURL = () => {
    const root = "https://accounts.google.com/o/oauth2/v2/auth";
    const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        response_type: "code",
        scope: ["openid", "email", "profile"].join(" "),
        include_granted_scopes: "true",
        access_type: "offline",
        prompt: "consent",
    });
    return `${root}?${params.toString()}`;
};

export const startGoogleOAuth = async (_req, res) => {
    try {
        const url = googleAuthURL();
        return res.redirect(url);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const googleOAuthCallback = async (req, res) => {
    try {
        const code = req.query.code;
        if (!code) return res.status(400).json({ message: "Missing code" });

        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code,
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                redirect_uri: process.env.GOOGLE_REDIRECT_URI,
                grant_type: "authorization_code",
            }),
        });
        if (!tokenRes.ok) {
            const text = await tokenRes.text();
            return res.status(400).send(text);
        }
        const tokens = await tokenRes.json();
        const accessToken = tokens.access_token;
        if (!accessToken) return res.status(400).json({ message: "Failed to obtain access token" });

        const profRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!profRes.ok) {
            const text = await profRes.text();
            return res.status(400).send(text);
        }
        const profile = await profRes.json();
        const email = profile.email;
        let name = profile.name || (email ? email.split("@")[0] : "user");
        if (!email) return res.status(400).json({ message: "Email not available from Google" });

        let user = await Users.findOne({ email });
        if (!user) {
            let userName = name.replace(/\s+/g, "").toLowerCase();
            if (!userName) userName = email.split("@")[0];
            let suffix = 0;
            while (await Users.findOne({ userName })) {
                suffix += 1;
                userName = `${name.replace(/\s+/g, "").toLowerCase()}${suffix}`;
            }
            const salt = await bcrypt.genSalt(10);
            const randomPass = crypto.randomBytes(16).toString("hex");
            const hashedPassword = await bcrypt.hash(randomPass, salt);
            user = await Users.create({ userName, email, password: hashedPassword });
        }

        const expiresIn = "30d";
        jsonwebtoken.sign(
            { _id: user._id, userName: user.userName },
            process.env.SECRET_KEY,
            { expiresIn },
            (err, token) => {
                if (err) return res.status(500).json({ message: "Failed to create access token" });
                const isProd = process.env.NODE_ENV === "production";
                const cookieOptions = {
                    httpOnly: true,
                    secure: isProd,
                    sameSite: isProd ? "none" : "lax",
                    maxAge: 30 * 24 * 60 * 60 * 1000,
                };
                res.cookie("accessToken", token, cookieOptions);
                const frontend = (process.env.FRONTEND_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
                const redirectUrl = `${frontend}/auth/login?oauth=1&token=${encodeURIComponent(token)}`;
                return res.redirect(redirectUrl);
            }
        );
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const registerUser = async (req, res) => {
    try {
        const { userName, email, password, remember } = req.body || {};
        if (!userName || !email || !password) {
            return res.status(400).json({ message: "userName, email and password are required" });
        }
        const emailRegex = /[^@\s]+@[^@\s]+\.[^@\s]+/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: "Invalid email format" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const userData = new Users({
            userName,
            password: hashedPassword,
            email,
        });

        // Optional pre-checks for better UX; unique indexes still enforce at DB level
        const [userExists, emailExists] = await Promise.all([
            Users.findOne({ userName }).lean(),
            Users.findOne({ email }).lean(),
        ]);
        if (userExists) return res.status(409).json({ message: "username not available" });
        if (emailExists) return res.status(409).json({ message: "email already registered" });

        const user = await userData.save();

        const expiresIn = remember ? "30d" : "1d";
        jsonwebtoken.sign(
            { _id: user._id, userName: user.userName },
            process.env.SECRET_KEY,
            { expiresIn },
            (err, token) => {
                if (err) {
                    return res.status(500).json({ message: "Failed to create access token" });
                }
                const isProd = process.env.NODE_ENV === "production";
                const cookieOptions = {
                    httpOnly: true,
                    secure: isProd,
                    sameSite: isProd ? "none" : "lax",
                    maxAge: remember ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000,
                };
                res.cookie("accessToken", token, cookieOptions);
                return res.status(201).json({
                    success: true,
                    message: "Registration Successfull!",
                    accessToken: token,
                    user: { _id: user._id, userName: user.userName, email: user.email },
                });
            }
        );
    } catch (error) {
        // Handle duplicate key error from unique indexes
        if (error && error.code === 11000) {
            const field = Object.keys(error.keyPattern || {})[0] || "field";
            return res.status(409).json({ message: `${field} already registered` });
        }
        return res.status(500).json({
            message: error.message,
        });
    }
};

export const getMyBookmarks = async (req, res) => {
    try {
        const user = req.user;
        if (!user || !user._id) {
            return res.status(401).json({ message: "Access Denied, Please sign-in again" });
        }

        const page = Math.max(parseInt(req.query.page || "1", 10), 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit || "10", 10), 1), 100);

        const me = await Users.findById(user._id).select("bookmarks").lean();
        const bookmarks = me?.bookmarks || [];
        const total = bookmarks.length;

        if (total === 0) {
            return res.status(200).json({
                posts: [],
                pagination: { total: 0, page, pages: 1, limit },
                message: "No bookmarks",
            });
        }

        const ids = bookmarks.map((id) => id);
        const posts = await PostMessage.find({ _id: { $in: ids } })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean({ virtuals: true });

        const postIds = posts.map((p) => p._id);
        const commentCounts = postIds.length
            ? await Comment.aggregate([
                  { $match: { postId: { $in: postIds } } },
                  { $group: { _id: "$postId", count: { $sum: 1 } } },
              ])
            : [];
        const countMap = new Map(commentCounts.map((c) => [String(c._id), c.count]));
        const postsWithCounts = posts.map((p) => ({ ...p, commentCount: countMap.get(String(p._id)) || 0 }));

        return res.status(200).json({
            posts: postsWithCounts,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit) || 1,
                limit,
            },
            message: "Fetched bookmarks",
        });
    } catch (error) {
        console.error("[Password Reset] Error while handling forgot password:", error);
        return res.status(500).json({ message: error.message });
    }
};

export const loginUser = async (req, res) => {
    try {
        const { email, password, remember } = req.body || {};
        if (!email || !password) {
            return res.status(400).json({ message: "email and password are required" });
        }

        const user = await Users.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: "Invalid email or user not found" });
        }
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ message: "Invalid password" });
        }

        const expiresIn = remember ? "30d" : "1d";
        jsonwebtoken.sign(
            { _id: user._id, userName: user.userName },
            process.env.SECRET_KEY,
            { expiresIn },
            (err, token) => {
                if (err) {
                    return res.status(500).json({ message: "Failed to create access token" });
                }
                const isProd = process.env.NODE_ENV === "production";
                const cookieOptions = {
                    httpOnly: true,
                    secure: isProd,
                    sameSite: isProd ? "none" : "lax",
                    maxAge: remember ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000,
                };
                res.cookie("accessToken", token, cookieOptions);
                return res.status(200).json({
                    success: true,
                    message: "LoggedIn successfully!",
                    accessToken: token,
                    user: { _id: user._id, userName: user.userName, email: user.email },
                });
            }
        );
    } catch (error) {
        return res.status(500).json({
            message: error.message,
        });
    }
};

export const logoutUser = async (req, res) => {
    try {
        const isProd = process.env.NODE_ENV === "production";
        const cookieOptions = {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? "none" : "lax",
        };
        res.clearCookie("accessToken", cookieOptions);
        return res.status(200).json({ message: `Logged out Successfully` });
    } catch (error) {
        return res.status(500).json({
            message: error.message,
        });
    }
};

// Forgot password: create reset token valid for 15 minutes
export const requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body || {};
        if (!email) return res.status(400).json({ message: "email is required" });
        const user = await Users.findOne({ email });
        if (!user) {
            // Do not reveal whether email exists
            return res.status(200).json({ message: "If the email exists, a reset link has been created" });
        }
        const token = crypto.randomBytes(24).toString("hex");
        user.resetPasswordToken = token;
        user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
        await user.save();
        const frontendBase = process.env.FRONTEND_URL || "http://127.0.0.1:3000";
        const resetUrl = `${frontendBase.replace(/\/$/, "")}/auth/reset?token=${token}`;

        // If SMTP config is available, send the email
        const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM } = process.env;
        if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS && MAIL_FROM) {
            console.log(`[Password Reset] SMTP detected. Sending via ${SMTP_HOST}:${SMTP_PORT} as ${SMTP_USER}`);
            const transporter = nodemailer.createTransport({
                host: SMTP_HOST,
                port: Number(SMTP_PORT),
                secure: String(SMTP_PORT) === "465",
                auth: { user: SMTP_USER, pass: SMTP_PASS },
            });
            const info = await transporter.sendMail({
                from: MAIL_FROM,
                to: user.email,
                subject: "Reset your Memories password",
                html: `
                    <p>Hello ${user.userName},</p>
                    <p>We received a request to reset your password. Click the link below to set a new password. This link will expire in 15 minutes.</p>
                    <p><a href="${resetUrl}">${resetUrl}</a></p>
                    <p>If you did not request this, you can safely ignore this email.</p>
                    <p>— Memories Team</p>
                `,
            });
            console.log(`[Password Reset] Mail sent to ${user.email}. messageId=${info && info.messageId}`);
        } else {
            // Fallback for development: log the link to server console
            console.log(`[Password Reset - DEV URL] ${user.email} -> ${resetUrl}`);
        }

        const includeToken = process.env.NODE_ENV !== "production";
        return res.status(200).json({ message: "Reset link created", ...(includeToken ? { resetToken: token, resetUrl } : {}) });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body || {};
        if (!token || !password) return res.status(400).json({ message: "token and password are required" });
        const user = await Users.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: new Date() },
        });
        if (!user) return res.status(400).json({ message: "Invalid or expired reset token" });
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        return res.status(200).json({ message: "Password has been reset" });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
