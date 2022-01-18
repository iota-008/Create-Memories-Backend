import express from "express";
import { verify } from "./verify-token.js";
import {
	getPosts,
	createPost,
	updatePost,
	deletePost,
	likePost,
} from "../controllers/posts.js";

const router = express.Router();
router.get("/", verify, getPosts);
router.post("/", verify, createPost);
router.patch("/:id", verify, updatePost);
router.delete("/:id", verify, deletePost);
router.patch("/:id/likePost", verify, likePost);

export default router;
