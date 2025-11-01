import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    postId: { type: mongoose.Schema.Types.ObjectId, ref: "PostMessage", required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true, index: true },
    content: { type: String, required: true, trim: true },
    userName: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

commentSchema.index({ postId: 1, createdAt: -1 });

const Comment = mongoose.model("Comment", commentSchema);
export default Comment;
