import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    userName: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    accountCreatedAt: { type: Date, default: new Date() },
});

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
 */
