import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
	userName: { type: String, require: true },
	password: { type: String, require: true },
	email: { type: String, require: false },
	accountCreatedAt: { type: Date, default: new Date() },
});

var Users = mongoose.model("Users", userSchema);

export default Users;
