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
        // reactions: one per user with type string (emoji or label)
        reactions: [
            {
                user: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true },
                type: { type: String, required: true, trim: true },
            },
        ],
        userName: {
            type: String,
        },
    },
    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// likeCount derived from reactions of type 'like'
postSchema.virtual("likeCount").get(function () {
    if (!Array.isArray(this.reactions)) return 0;
    return this.reactions.reduce((acc, r) => (r && r.type === "like" ? acc + 1 : acc), 0);
});

// indexes for reactions lookups
postSchema.index({ "reactions.user": 1 });
postSchema.index({ "reactions.type": 1 });
// text index for full-text search on title and message
postSchema.index({ title: "text", message: "text" });

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
