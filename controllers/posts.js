import PostMessage from "../models/PostMessage.js";
import mongoose from "mongoose";



export const getPosts = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page || "1", 10), 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit || "10", 10), 1), 100);
        const sort = req.query.sort || "-createdAt"; // default newest first

        const [total, posts] = await Promise.all([
            PostMessage.countDocuments({}),
            PostMessage.find({}).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
        ]);

        return res.status(200).json({
            posts,
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

        return res.status(200).json({ post: updatedPost, message: "Post updated successfully" });
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
        if (!user || !user.userName) {
            return res.status(401).json({ message: "Access Denied, Please sign-in again" });
        }

        const post = await PostMessage.findById(id).lean();
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        let likedPost;
        let message = "";

        const hasLiked = Array.isArray(post.likedPosts) && post.likedPosts.indexOf(user.userName) !== -1;
        if (hasLiked) {
            likedPost = await PostMessage.findByIdAndUpdate(
                id,
                {
                    $pull: { likedPosts: user.userName },
                    $inc: { likeCount: -1 },
                },
                { new: true }
            );
            message = "Like removed from post";
        } else {
            likedPost = await PostMessage.findByIdAndUpdate(
                id,
                {
                    $addToSet: { likedPosts: user.userName },
                    $inc: { likeCount: 1 },
                },
                { new: true }
            );
            message = "Post liked";
        }
        return res.status(200).json({ post: likedPost, message: message });
    } catch (error) {
        return res.status(500).json({
            message: error.message,
        });
    }
};
