import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    userName: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    accountCreatedAt: { type: Date, default: new Date() },
});

var Users = mongoose.model("Users", userSchema);

export default Users;
