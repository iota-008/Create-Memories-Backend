import mongoose from "mongoose";
import Users from "../models/Users.js";
import bcrypt from "bcrypt";
import jsonwebtoken from "jsonwebtoken";



export const registerUser = async (req, res) => {
	// hash password
	const salt = await bcrypt.genSalt(10);
	const hashedPassword = await bcrypt.hash(req.body.password, salt);

	try {
		const userData = new Users({
			userName: req.body.userName,
			password: hashedPassword,
			email: req.body.email,
		});

		const userExists = await Users.findOne({ userName: req.body.userName });

		if (userExists)
			return res.status(409).json({ message: `username not available` });

		const emailExists = await Users.findOne({
			email: req.body.email,
		});

		if (emailExists)
			return res.status(409).json({ message: `email already registered` });

		const user = await userData.save();

		jsonwebtoken.sign(
			{ _id: user._id, userName: user.userName },
			process.env.SECRET_KEY,
			(err, token) => {
				return res.status(201).json({
					success: true,
					message: "Registration Successfull!",
					accessToken: token,
				});
			}
		);
	} catch (error) {
		return res.status(500).json({
			message: error.message,
		});
	}
};

export const loginUser = async (req, res) => {
	try {
		var user = await Users.findOne({ email: req.body.email });
		if (!user) {
			return res
				.status(400)
				.json({ message: "invalid email id or user not found" });
		}
		const validPassword = await bcrypt.compare(
			req.body.password,
			user.password
		);
		if (!validPassword)
			return res.status(409).json({ message: "invalid password" });
		else {
			jsonwebtoken.sign(
				{ _id: user._id, userName: user.userName },
				process.env.SECRET_KEY,
				(err, token) => {
					return res.status(200).json({
						success: true,
						message: "LoggedIn successfully!",
						accessToken: token,
					});
				}
			);
		}
	} catch (error) {
		return res.status(500).json({
			message: error.message,
		});
	}
};

export const logoutUser = async (req, res) => {
	try {
		return res.status(200).json({ message: `Logged out Successfully` });
	} catch (error) {
		return res.status(500).json({
			message: error.message,
		});
	}
};
