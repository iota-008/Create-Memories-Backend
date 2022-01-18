import postRoutes from "./routes/posts.js";
import userRoutes from "./routes/users.js";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
const app = express();
dotenv.config();
app.use(express.json());
app.use(cookieParser());
app.use(
	bodyParser.json({
		limit: "30mb",
		extended: true,
	})
);
app.use(
	bodyParser.urlencoded({
		limit: "30mb",
		extended: true,
	})
);
app.use(
	cors({
		origin: [
			"http://localhost:3000/",
			"https://create-your-memory.netlify.app/",
		],
	})
);
app.use("/user", userRoutes);
app.use("/posts", postRoutes);

app.get("/", (req, res) => {
	res.send("Welcome to memories API");
});

const PORT = process.env.PORT || 5000;
mongoose
	.connect(process.env.CONNECTION_URL, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
		useFindAndModify: false,
	})
	.then(() =>
		app.listen(PORT, () => console.log(`server is runing on port ${PORT}`))
	)
	.catch((error) => console.log("error : ", error.message));
