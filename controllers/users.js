import Users from "../models/Users.js";
import bcrypt from "bcryptjs";
import jsonwebtoken from "jsonwebtoken";
import PostMessage from "../models/PostMessage.js";
import Comment from "../models/Comment.js";

export const registerUser = async (req, res) => {
    try {
        const { userName, email, password } = req.body || {};

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

        jsonwebtoken.sign(
            { _id: user._id, userName: user.userName },
            process.env.SECRET_KEY,
            { expiresIn: "1d" },
            (err, token) => {
                if (err) {
                    return res.status(500).json({ message: "Failed to create access token" });
                }
                const isProd = process.env.NODE_ENV === "production";
                const cookieOptions = {
                    httpOnly: true,
                    secure: isProd,
                    sameSite: isProd ? "none" : "lax",
                    maxAge: 24 * 60 * 60 * 1000,
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
        return res.status(500).json({ message: error.message });
    }
};

export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body || {};
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

        jsonwebtoken.sign(
            { _id: user._id, userName: user.userName },
            process.env.SECRET_KEY,
            { expiresIn: "1d" },
            (err, token) => {
                if (err) {
                    return res.status(500).json({ message: "Failed to create access token" });
                }
                const isProd = process.env.NODE_ENV === "production";
                const cookieOptions = {
                    httpOnly: true,
                    secure: isProd,
                    sameSite: isProd ? "none" : "lax",
                    maxAge: 24 * 60 * 60 * 1000,
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
