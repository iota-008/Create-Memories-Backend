import PostMessage from "../models/PostMessage.js";
import Comment from "../models/Comment.js";
import Users from "../models/Users.js";
import mongoose from "mongoose";



export const getPosts = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page || "1", 10), 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit || "10", 10), 1), 100);
        const sort = req.query.sort || "-createdAt"; // default newest first

        const [total, posts] = await Promise.all([
            PostMessage.countDocuments({}),
            PostMessage.find({}).sort(sort).skip((page - 1) * limit).limit(limit).lean({ virtuals: true }),
        ]);

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
            message: "Fetched posts",
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message,
        });
    }
};

export const addBookmark = async (req, res) => {
    const { id } = req.params;
    try {
        if (!mongoose.Types.ObjectId.isValid(id))
            return res.status(400).json({ message: id + " is invalid mongoDB id" });
        const user = req.user;
        if (!user || !user._id) return res.status(401).json({ message: "Access Denied, Please sign-in again" });
        const post = await PostMessage.findById(id).select("_id").lean();
        if (!post) return res.status(404).json({ message: "Post not found" });
        await Users.updateOne({ _id: user._id }, { $addToSet: { bookmarks: id } });
        return res.status(200).json({ id, message: "Bookmarked" });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const removeBookmark = async (req, res) => {
    const { id } = req.params;
    try {
        if (!mongoose.Types.ObjectId.isValid(id))
            return res.status(400).json({ message: id + " is invalid mongoDB id" });
        const user = req.user;
        if (!user || !user._id) return res.status(401).json({ message: "Access Denied, Please sign-in again" });
        await Users.updateOne({ _id: user._id }, { $pull: { bookmarks: id } });
        return res.status(200).json({ id, message: "Bookmark removed" });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const getPostById = async (req, res) => {
    const { id } = req.params;
    try {
        if (!mongoose.Types.ObjectId.isValid(id))
            return res.status(400).json({ message: id + " is invalid mongoDB id" });

        const post = await PostMessage.findById(id).lean({ virtuals: true });
        if (!post) return res.status(404).json({ message: "Post not found" });

        const [agg, comments] = await Promise.all([
            Comment.aggregate([
                { $match: { postId: new mongoose.Types.ObjectId(id) } },
                { $group: { _id: "$postId", count: { $sum: 1 } } },
            ]),
            Comment.find({ postId: id })
                .sort({ createdAt: -1 })
                .limit(Math.min(parseInt(req.query.preview || "3", 10), 10) || 3)
                .populate({ path: "author", select: "userName email" })
                .lean(),
        ]);
        const commentCount = agg.length ? agg[0].count : 0;
        return res.status(200).json({ post: { ...post, commentCount }, commentsPreview: comments });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const createPost = async (req, res) => {
    const { title, message, selectedFile, creator, tags, userName } = req.body;
    const newPostMessage = await new PostMessage({
        title,
        message,
        selectedFile,
        creator,
        tags,
        userName,
    });

    try {
        await newPostMessage.save();
        return res
            .status(201)
            .json({ post: newPostMessage, message: "Post created successfully" });
    } catch (error) {
        return res.status(500).json({
            message: error.message,
        });
    }
};

export const updatePost = async (req, res) => {
    const { id } = req.params;
    const { title, message, creator, selectedFile, tags, userName } = req.body;

    try {
        if (!mongoose.Types.ObjectId.isValid(id))
            return res.status(400).json({ message: id + " is invalid mongoDB id" });

        const updatedPost = await PostMessage.findByIdAndUpdate(
            id,
            { creator, title, message, tags, selectedFile, userName },
            { new: true }
        );

        if (!updatedPost) {
            return res.status(404).json({ message: "Post not found" });
        }

        // attach commentCount
        const agg = await Comment.aggregate([
            { $match: { postId: new mongoose.Types.ObjectId(id) } },
            { $group: { _id: "$postId", count: { $sum: 1 } } },
        ]);
        const commentCount = agg.length ? agg[0].count : 0;
        return res.status(200).json({ post: { ...updatedPost.toObject?.() || updatedPost, commentCount }, message: "Post updated successfully" });
    } catch (error) {
        return res.status(500).json({
            message: error.message,
        });
    }
};

export const deletePost = async (req, res) => {
    const { id } = req.params;

    try {
        if (!mongoose.Types.ObjectId.isValid(id))
            return res.status(400).json({ message: id + " is invalid mongoDB id" });

        const deleted = await PostMessage.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ message: "Post not found" });
        }
        return res.status(200).json({ id: id, message: `Post Deleted Successfully` });
    } catch (error) {
        return res.status(500).json({
            message: error.message,
        });
    }
};

export const reactToPost = async (req, res) => {
    const { id } = req.params;
    const { type } = req.body || {};

    try {
        if (!mongoose.Types.ObjectId.isValid(id))
            return res.status(400).json({ message: id + " is invalid mongoDB id" });

        const user = req.user; // set by verify middleware
        if (!user || !user._id) {
            return res.status(401).json({ message: "Access Denied, Please sign-in again" });
        }

        const post = await PostMessage.findById(id).lean();
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        const userId = new mongoose.Types.ObjectId(user._id);
        // Remove any prior reaction by this user
        await PostMessage.updateOne({ _id: id }, { $pull: { reactions: { user: userId } } });
        let message = "Reaction removed";
        if (type && typeof type === "string" && type.trim()) {
            // Add the new reaction
            await PostMessage.updateOne(
                { _id: id },
                { $addToSet: { reactions: { user: userId, type: type.trim() } } }
            );
            message = "Reaction added";
        }
        const reactedPost = await PostMessage.findById(id).lean({ virtuals: true });
        // attach commentCount
        const agg = await Comment.aggregate([
            { $match: { postId: new mongoose.Types.ObjectId(id) } },
            { $group: { _id: "$postId", count: { $sum: 1 } } },
        ]);
        const commentCount = agg.length ? agg[0].count : 0;
        return res.status(200).json({ post: { ...reactedPost, commentCount }, message });
    } catch (error) {
        return res.status(500).json({
            message: error.message,
        });
    }
};

export const searchPosts = async (req, res) => {
    try {
        const {
            query = "",
            tags = "",
            author = "",
            from,
            to,
            sort = "-createdAt",
            page: pageStr = "1",
            limit: limitStr = "10",
        } = req.query;
        const page = Math.max(parseInt(pageStr, 10), 1);
        const limit = Math.min(Math.max(parseInt(limitStr, 10), 1), 100);

        const filter = {};
        if (query) filter.$text = { $search: query };
        if (tags) filter.tags = { $in: tags.split(",").map((t) => t.trim()).filter(Boolean) };
        if (author) {
            filter.$or = [
                { creator: author },
                { userName: author },
            ];
        }
        if (from || to) {
            filter.createdAt = {};
            if (from) filter.createdAt.$gte = new Date(from);
            if (to) filter.createdAt.$lte = new Date(to);
        }

        // Build aggregation to compute reaction and comment counts for sorting
        const pipeline = [
            { $match: filter },
            {
                $addFields: {
                    reactionsCount: { $size: { $ifNull: ["$reactions", []] } },
                },
            },
            {
                $lookup: {
                    from: "comments",
                    let: { pid: "$_id" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$postId", "$$pid"] } } },
                        { $count: "count" },
                    ],
                    as: "_commentsAgg",
                },
            },
            {
                $addFields: {
                    commentCount: { $ifNull: [{ $arrayElemAt: ["$_commentsAgg.count", 0] }, 0] },
                },
            },
            { $project: { _commentsAgg: 0 } },
        ];

        // Trending: simple score = reactionsCount + 1.5*commentCount - ageDays
        if (sort === "trending") {
            pipeline.push({
                $addFields: {
                    ageDays: { $divide: [{ $subtract: [new Date(), "$createdAt"] }, 1000 * 60 * 60 * 24] },
                    trendingScore: { $subtract: [ { $add: ["$reactionsCount", { $multiply: [1.5, "$commentCount"] }] }, { $divide: [ { $subtract: [new Date(), "$createdAt"] }, 1000 * 60 * 60 * 24 ] } ] },
                },
            });
            pipeline.push({ $sort: { trendingScore: -1 } });
        } else if (sort === "likeCount") {
            pipeline.push({ $sort: { reactionsCount: -1, createdAt: -1 } });
        } else if (sort === "commentCount") {
            pipeline.push({ $sort: { commentCount: -1, createdAt: -1 } });
        } else {
            // default
            pipeline.push({ $sort: { createdAt: -1 } });
        }

        const [totalArr, results] = await Promise.all([
            PostMessage.aggregate([...pipeline, { $count: "total" }]),
            PostMessage.aggregate([...pipeline, { $skip: (page - 1) * limit }, { $limit: limit }]),
        ]);
        const total = totalArr[0]?.total || 0;

        return res.status(200).json({
            posts: results,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit) || 1,
                limit,
            },
            message: "Search results",
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
