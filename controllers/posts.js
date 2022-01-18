import PostMessage from "../models/PostMessage.js";
import jsonwebtoken from "jsonwebtoken";
import mongoose from "mongoose";
export const getPosts = async (req, res) => {
	try {
		const posts = await PostMessage.find();
		return res.status(200).json({ posts, message: "Fetched all posts" });
	} catch (error) {
		return res.status(500).json({
			message: error.message,
		});
	}
};

export const createPost = async (req, res) => {
	const { title, message, selectedFile, creator, tags, userName } = req.body;
	const newPostMessage = new PostMessage({
		title,
		message,
		selectedFile,
		creator,
		tags,
		userName,
	});

	try {
		await newPostMessage.save();
		return res
			.status(201)
			.json({ post: newPostMessage, message: "Post created successfully" });
	} catch (error) {
		return res.status(500).json({
			message: error.message,
		});
	}
};

export const updatePost = async (req, res) => {
	const { id } = req.params;
	const { title, message, creator, selectedFile, tags, userName } = req.body;

	try {
		if (!mongoose.Types.ObjectId.isValid(id))
			return res.status(400).json({ message: id + " is invalid mongoDB id" });

		const updatedPost = {
			creator,
			title,
			message,
			tags,
			selectedFile,
			userName,
			_id: id,
		};
		await PostMessage.findByIdAndUpdate(id, updatedPost, {
			new: true,
		});

		return res
			.status(200)
			.json({ post: updatedPost, message: "Post updated successfully" });
	} catch (error) {
		return res.status(500).json({
			message: error.message,
		});
	}
};
export const deletePost = async (req, res) => {
	const { id } = req.params;

	try {
		if (!mongoose.Types.ObjectId.isValid(id))
			return res.status(400).json({ message: id + " is invalid mongoDB id" });

		await PostMessage.findByIdAndRemove(id);
		return res.json({ message: `Post Deleted Successfully` });
	} catch (error) {
		return res.status(500).json({
			message: error.message,
		});
	}
};

export const likePost = async (req, res) => {
	const { id } = req.params;

	try {
		if (!mongoose.Types.ObjectId.isValid(id))
			return res.status(400).json({ message: id + " is invalid mongoDB id" });

		const authHeader = req.headers["auth-token"];
		const token = authHeader && authHeader.split(" ")[1];

		if (!token) return res.status(401).json({ message: "Access Denied, Please sign-in again" });

		const user = jsonwebtoken.verify(token, process.env.SECRET_KEY);

		const post = await PostMessage.findById(id);

		let likedPost;
		let message = "";

		if (post.likedPosts.indexOf(user.userName) != -1) {
			likedPost = await PostMessage.findByIdAndUpdate(
				id,
				{
					likeCount: post.likeCount - 1,
					likedPosts: post.likedPosts.filter(
						(userName) => userName !== user.userName
					),
				},
				{ new: true }
			);
			message = "Like removed from post";
		} else {
			likedPost = await PostMessage.findByIdAndUpdate(
				id,
				{
					likeCount: post.likeCount + 1,
					likedPosts: [...post.likedPosts, user.userName],
				},
				{ new: true }
			);
			message = "Post liked";
		}
		return res.status(200).json({ post: likedPost, message: message });
	} catch (error) {
		return res.status(500).json({
			message: error.message,
		});
	}
};
