import mongoose from "mongoose";
import mongooseLeanVirtuals from "mongoose-lean-virtuals";

const postSchema = new mongoose.Schema(
    {
        title: String,
        message: String,
        creator: String,
        tags: [String],
        selectedFile: String,
        createdAt: {
            type: Date,
            default: new Date(),
        },
        likedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Users" }],
        userName: {
            type: String,
        },
    },
    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// virtual likeCount derived from likedPosts length
postSchema.virtual("likeCount").get(function () {
    return Array.isArray(this.likedPosts) ? this.likedPosts.length : 0;
});

// index for faster analytics/queries by liked user
postSchema.index({ likedPosts: 1 });

// enable virtuals for lean queries
postSchema.plugin(mongooseLeanVirtuals);

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
 *             description: User ObjectId
 *           example:
 *             - "60f7a2c2e1c3a12b4c8f9e0a"
 *             - "60f7a2c2e1c3a12b4c8f9e0b"
 *         userName:
 *           type: string
 */
