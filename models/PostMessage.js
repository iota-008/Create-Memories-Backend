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

// reactionsCount: total number of reactions on the post
postSchema.virtual("reactionsCount").get(function () {
    return Array.isArray(this.reactions) ? this.reactions.length : 0;
});

// reactionsBreakdown: counts per supported reaction (normalized to emojis)
postSchema.virtual("reactionsBreakdown").get(function () {
    const EMOJIS = ['👍','❤️','😂','😮','🎉'];
    const ALIASES = {
        like: '👍',
        love: '❤️',
        haha: '😂',
        wow: '😮',
        party: '🎉',
        tada: '🎉',
        celebrate: '🎉',
    };
    const toEmoji = (t) => {
        const k = (t || '').toString().trim();
        if (EMOJIS.includes(k)) return k;
        const key = k.toLowerCase ? k.toLowerCase() : k;
        return ALIASES[key] || '';
    };
    const out = { '👍': 0, '❤️': 0, '😂': 0, '😮': 0, '🎉': 0 };
    if (!Array.isArray(this.reactions)) return out;
    for (const r of this.reactions) {
        const e = toEmoji(r && r.type);
        if (e && out.hasOwnProperty(e)) out[e] += 1;
    }
    return out;
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
 *         reactions:
 *           type: array
 *           description: List of user reactions with a single reaction per user.
 *           items:
 *             type: object
 *             properties:
 *               user:
 *                 type: string
 *               type:
 *                 type: string
 *                 description: Emoji (👍❤️😂😮🎉) or legacy alias (like, love, haha, wow, party/tada)
 *         reactionsCount:
 *           type: number
 *           description: Total number of reactions on the post
 *         reactionsBreakdown:
 *           type: object
 *           description: Per-emoji reaction counts (normalized)
 *           properties:
 *             "👍":
 *               type: number
 *             "❤️":
 *               type: number
 *             "😂":
 *               type: number
 *             "😮":
 *               type: number
 *             "🎉":
 *               type: number
 *         createdAt:
 *           type: string
 *           format: date-time
 *
 *         userName:
 *           type: string
 */
