import PostMessage from "../models/PostMessage.js";
import Comment from "../models/Comment.js";
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
            { $match: { postId: mongoose.Types.ObjectId(id) } },
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

export const likePost = async (req, res) => {
    const { id } = req.params;

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

        let likedPost;
        let message = "";

        const userId = String(user._id);
        const hasLiked = Array.isArray(post.likedPosts) && post.likedPosts.some((u) => String(u) === userId);
        if (hasLiked) {
            likedPost = await PostMessage.findByIdAndUpdate(
                id,
                {
                    $pull: { likedPosts: userId },
                },
                { new: true }
            );
            message = "Like removed from post";
        } else {
            likedPost = await PostMessage.findByIdAndUpdate(
                id,
                {
                    $addToSet: { likedPosts: userId },
                },
                { new: true }
            );
            message = "Post liked";
        }
        // attach commentCount
        const agg = await Comment.aggregate([
            { $match: { postId: mongoose.Types.ObjectId(id) } },
            { $group: { _id: "$postId", count: { $sum: 1 } } },
        ]);
        const commentCount = agg.length ? agg[0].count : 0;
        return res.status(200).json({ post: { ...likedPost.toObject?.() || likedPost, commentCount }, message });
    } catch (error) {
        return res.status(500).json({
            message: error.message,
        });
    }
};
