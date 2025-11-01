import express from "express";
import { verify } from "./verify-token.js";
import { listComments, createComment, deleteComment } from "../controllers/comments.js";
import Joi from "joi";

const router = express.Router();

const createSchema = Joi.object({
  content: Joi.string().min(1).max(2000).required(),
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

/**
 * @openapi
 * /comments/{postId}:
 *   get:
 *     summary: List comments for a post (newest first)
 *     tags: [Comments]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Paginated comments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 comments:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Comment'
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
 *                 value:
 *                   comments:
 *                     - _id: "671f0e2f9a3a123456789101"
 *                       postId: "671f0e2f9a3a123456789001"
 *                       author: "671f0e2f9a3a1234567890aa"
 *                       userName: "alice"
 *                       content: "Nice post!"
 *                       createdAt: "2025-10-31T18:30:00.000Z"
 *                       updatedAt: "2025-10-31T18:30:00.000Z"
 *                   pagination:
 *                     total: 1
 *                     page: 1
 *                     pages: 1
 *                     limit: 20
 *                   message: "Fetched comments"
 */
router.get("/:postId", verify, listComments);

/**
 * @openapi
 * /comments/{postId}:
 *   post:
 *     summary: Create a new comment on a post
 *     tags: [Comments]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 maxLength: 2000
 *     responses:
 *       201:
 *         description: Comment created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 comment:
 *                   $ref: '#/components/schemas/Comment'
 *                 message:
 *                   type: string
 *             examples:
 *               created:
 *                 value:
 *                   comment:
 *                     _id: "671f0e2f9a3a123456789102"
 *                     postId: "671f0e2f9a3a123456789001"
 *                     author: "671f0e2f9a3a1234567890aa"
 *                     userName: "alice"
 *                     content: "Another comment"
 *                     createdAt: "2025-10-31T18:35:00.000Z"
 *                     updatedAt: "2025-10-31T18:35:00.000Z"
 *                   message: "Comment created"
 */
router.post("/:postId", verify, validate(createSchema), createComment);

/**
 * @openapi
 * /comments/{id}:
 *   delete:
 *     summary: Delete a comment (author only)
 *     tags: [Comments]
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
 *         description: Comment deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 message:
 *                   type: string
 *             examples:
 *               deleted:
 *                 value:
 *                   id: "671f0e2f9a3a123456789101"
 *                   message: "Comment deleted"
 *       403:
 *         description: Not allowed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             examples:
 *               forbidden:
 *                 value:
 *                   message: "Not allowed to delete this comment"
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             examples:
 *               notFound:
 *                 value:
 *                   message: "Comment not found"
 */
router.delete("/:id", verify, deleteComment);

export default router;
