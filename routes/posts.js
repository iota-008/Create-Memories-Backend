import express from "express";
import { verify } from "./verify-token.js";
import {
  getPosts,
  createPost,
  updatePost,
  deletePost,
  likePost,
} from "../controllers/posts.js";
import Joi from "joi";

const router = express.Router();

/**
 * @openapi
 * /posts:
 *   get:
 *     summary: Get paginated list of posts
 *     tags: [Posts]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           example: -createdAt
 *     responses:
 *       200:
 *         description: Paginated posts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 posts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PostMessage'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                 message:
 *                   type: string
 *             examples:
 *               success:
 *                 summary: Example with derived likeCount
 *                 value:
 *                   posts:
 *                     - _id: "671f0e2f9a3a123456789001"
 *                       title: "First Post"
 *                       message: "Hello world"
 *                       creator: "123"
 *                       tags: ["intro"]
 *                       selectedFile: ""
 *                       createdAt: "2025-10-31T18:30:00.000Z"
 *                       likedPosts: ["671f0e2f9a3a1234567890aa", "671f0e2f9a3a1234567890ab"]
 *                       likeCount: 2
 *                       userName: "alice"
 *                   pagination:
 *                     total: 1
 *                     page: 1
 *                     pages: 1
 *                     limit: 10
 *                   message: "Fetched posts"
 *       401:
 *         description: Unauthorized
 */
router.get("/", verify, getPosts);

/**
 * @openapi
 * /posts:
 *   post:
 *     summary: Create a new post
 *     tags: [Posts]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               message:
 *                 type: string
 *               selectedFile:
 *                 type: string
 *                 description: Base64 or URL
 *               creator:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               userName:
 *                 type: string
 *     responses:
 *       201:
 *         description: Post created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 post:
 *                   $ref: '#/components/schemas/PostMessage'
 *                 message:
 *                   type: string
 *             examples:
 *               created:
 *                 summary: Example with derived likeCount
 *                 value:
 *                   post:
 *                     _id: "671f0e2f9a3a123456789002"
 *                     title: "New Post"
 *                     message: "Content"
 *                     creator: "123"
 *                     tags: ["tag1", "tag2"]
 *                     selectedFile: ""
 *                     createdAt: "2025-10-31T18:30:00.000Z"
 *                     likedPosts: []
 *                     likeCount: 0
 *                     userName: "alice"
 *                   message: "Post created successfully"
 *       401:
 *         description: Unauthorized
 */
const upsertPostSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  message: Joi.string().min(1).max(5000).required(),
  selectedFile: Joi.string().max(2_000_000).allow(""),
  creator: Joi.string().min(1).max(100).required(),
  tags: Joi.array().items(Joi.string().max(50)).default([]),
  userName: Joi.string().min(1).max(64).required(),
});

const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    const message = error.details.map((d) => d.message).join("; ");
    return res.status(400).json({ message });
  }
  req.body = value;
  next();
};

router.post("/", verify, validate(upsertPostSchema), createPost);

/**
 * @openapi
 * /posts/{id}:
 *   patch:
 *     summary: Update a post by id
 *     tags: [Posts]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           description: MongoDB ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Post updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 post:
 *                   $ref: '#/components/schemas/PostMessage'
 *                 message:
 *                   type: string
 *             examples:
 *               updated:
 *                 summary: Example with derived likeCount
 *                 value:
 *                   post:
 *                     _id: "671f0e2f9a3a123456789003"
 *                     title: "Updated title"
 *                     message: "Updated content"
 *                     creator: "123"
 *                     tags: ["tag1"]
 *                     selectedFile: ""
 *                     createdAt: "2025-10-31T18:30:00.000Z"
 *                     likedPosts: ["671f0e2f9a3a1234567890aa"]
 *                     likeCount: 1
 *                     userName: "alice"
 *                   message: "Post updated successfully"
 *       400:
 *         description: Invalid id
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 */
router.patch("/:id", verify, validate(upsertPostSchema.fork(["title","message"], (s)=>s.optional())), updatePost);

/**
 * @openapi
 * /posts/{id}:
 *   delete:
 *     summary: Delete a post by id
 *     tags: [Posts]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Post deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid id
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 */
router.delete("/:id", verify, deletePost);

/**
 * @openapi
 * /posts/{id}/likePost:
 *   patch:
 *     summary: Toggle like on a post
 *     tags: [Posts]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Like toggled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 post:
 *                   $ref: '#/components/schemas/PostMessage'
 *                 message:
 *                   type: string
 *             examples:
 *               liked:
 *                 summary: Example after like
 *                 value:
 *                   post:
 *                     _id: "671f0e2f9a3a123456789003"
 *                     title: "Updated title"
 *                     message: "Updated content"
 *                     creator: "123"
 *                     tags: ["tag1"]
 *                     selectedFile: ""
 *                     createdAt: "2025-10-31T18:30:00.000Z"
 *                     likedPosts: ["671f0e2f9a3a1234567890aa", "671f0e2f9a3a1234567890ab"]
 *                     likeCount: 2
 *                     userName: "alice"
 *                   message: "Post liked"
 *               unliked:
 *                 summary: Example after unlike
 *                 value:
 *                   post:
 *                     _id: "671f0e2f9a3a123456789003"
 *                     title: "Updated title"
 *                     message: "Updated content"
 *                     creator: "123"
 *                     tags: ["tag1"]
 *                     selectedFile: ""
 *                     createdAt: "2025-10-31T18:30:00.000Z"
 *                     likedPosts: ["671f0e2f9a3a1234567890aa"]
 *                     likeCount: 1
 *                     userName: "alice"
 *                   message: "Like removed from post"
 *       400:
 *         description: Invalid id
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 */
router.patch("/:id/likePost", verify, likePost);

export default router;
