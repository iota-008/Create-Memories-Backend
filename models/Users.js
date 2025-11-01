import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  userName: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  accountCreatedAt: { type: Date, default: new Date() },
  bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: "PostMessage" }],
  resetPasswordToken: { type: String, index: true },
  resetPasswordExpires: { type: Date },
});

// index for bookmarks lookups
userSchema.index({ bookmarks: 1 });

var Users = mongoose.model("Users", userSchema);

export default Users;

/**
 * @openapi
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         userName:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         accountCreatedAt:
 *           type: string
 *           format: date-time
 *         bookmarks:
 *           type: array
 *           items:
 *             type: string
 */
