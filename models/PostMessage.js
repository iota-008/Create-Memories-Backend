import mongoose from "mongoose";

const postSchema = new mongoose.Schema({
    title: String,
    message: String,
    creator: String,
    tags: [String],
    selectedFile: String,
    likeCount: {
        type: Number,
        default: 0,
    },
    createdAt: {
        type: Date,
        default: new Date(),
    },
    likedPosts: {
        type: [String],
    },
    userName: {
        type: String,
    },
});

var PostMessage = mongoose.model("PostMessage", postSchema);

export default PostMessage;

/**
 * @openapi
 * components:
 *   schemas:
 *     PostMessage:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         title:
 *           type: string
 *         message:
 *           type: string
 *         creator:
 *           type: string
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         selectedFile:
 *           type: string
 *           description: Base64 or URL
 *         likeCount:
 *           type: number
 *         createdAt:
 *           type: string
 *           format: date-time
 *         likedPosts:
 *           type: array
 *           items:
 *             type: string
 *         userName:
 *           type: string
 */
