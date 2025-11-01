import mongoose from "mongoose";
import Comment from "../models/Comment.js";
import PostMessage from "../models/PostMessage.js";

export const listComments = async (req, res) => {
  const { postId } = req.params;
  try {
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: postId + " is invalid mongoDB id" });
    }
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 100);

    const [total, comments] = await Promise.all([
      Comment.countDocuments({ postId }),
      Comment.find({ postId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate({ path: "author", select: "userName email" })
        .lean(),
    ]);

    return res.status(200).json({
      comments,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit) || 1,
        limit,
      },
      message: "Fetched comments",
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const createComment = async (req, res) => {
  const { postId } = req.params;
  const { content } = req.body || {};
  try {
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: postId + " is invalid mongoDB id" });
    }
    if (!content || !content.trim()) {
      return res.status(400).json({ message: "content is required" });
    }
    const user = req.user;
    if (!user || !user._id) {
      return res.status(401).json({ message: "Access Denied, Please sign-in again" });
    }
    const post = await PostMessage.findById(postId).select("_id").lean();
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const doc = await Comment.create({
      postId,
      author: user._id,
      userName: user.userName,
      content: content.trim(),
    });

    return res.status(201).json({ comment: doc, message: "Comment created" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const deleteComment = async (req, res) => {
  const { id } = req.params;
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: id + " is invalid mongoDB id" });
    }
    const user = req.user;
    if (!user || !user._id) {
      return res.status(401).json({ message: "Access Denied, Please sign-in again" });
    }
    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }
    if (String(comment.author) !== String(user._id)) {
      return res.status(403).json({ message: "Not allowed to delete this comment" });
    }
    await comment.deleteOne();
    return res.status(200).json({ id, message: "Comment deleted" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
