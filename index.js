import postRoutes from "./routes/posts.js";
import userRoutes from "./routes/users.js";
import commentRoutes from "./routes/comments.js";
import mongoose from "mongoose";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import xss from "xss-clean";
import morgan from "morgan";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
const app = express();
dotenv.config();
app.use( cookieParser() );
app.use(
    express.json({
        limit: "50mb",
    })
);
app.use(
    express.urlencoded({
        limit: "50mb",
        extended: true,
    })
);
const corsOrigins = (process.env.CORS_ORIGINS || "http://127.0.0.1:3000,https://create-your-memory.netlify.app")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
app.use(
    cors( {
        origin: corsOrigins,
        credentials: true,
    } )
);
// logging
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
// security headers
app.use(helmet());
// sanitize MongoDB operators like $ and . from inputs
app.use(mongoSanitize());
// basic XSS protection for user input
app.use(xss());
// rate limiting (global)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(apiLimiter);
// stricter limiter for login route
const loginLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { message: "Too many login attempts, please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use("/user/login", loginLimiter);
app.use( "/user", userRoutes );
app.use( "/posts", postRoutes );
app.use( "/comments", commentRoutes );

app.get( "/", ( req, res ) =>
{
    res.send( "Welcome to memories API" );
} );

// Swagger/OpenAPI setup
const swaggerDefinition = {
    openapi: "3.0.0",
    info: {
        title: "Memories API",
        version: "1.0.0",
    },
    servers: [
        { url: `http://localhost:${ process.env.PORT || 5000 }` },
    ],
    components: {
        securitySchemes: {
            bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
            cookieAuth: { type: "apiKey", in: "cookie", name: "accessToken" },
        },
        schemas: {
            Comment: {
                type: "object",
                properties: {
                    _id: { type: "string" },
                    postId: { type: "string" },
                    author: { type: "string" },
                    userName: { type: "string" },
                    content: { type: "string" },
                    createdAt: { type: "string", format: "date-time" },
                    updatedAt: { type: "string", format: "date-time" },
                },
            },
        },
    },
};
const swaggerOptions = {
    swaggerDefinition,
    apis: [
        "./routes/*.js",
        "./controllers/*.js",
        "./models/*.js",
    ],
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 404 handler
app.use((req, res, next) => {
    return res.status(404).json({ message: "Not Found" });
});

// Centralized error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    const status = err.status || 500;
    const message = err.message || "Internal Server Error";
    // You can log full error here (stack) with morgan/pino if needed
    return res.status(status).json({ message });
});

const PORT = process.env.PORT || 5000;
let server;
mongoose
    .connect( process.env.CONNECTION_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    } )
    .then( () => {
        server = app.listen( PORT, () => console.log( `server is runing on port ${ PORT }` ) );
    } )
    .catch( ( error ) => console.log( "error : ", error.message ) );

const shutdown = (signal) => {
    console.log(`\n${ signal } received, shutting down...`);
    if (server) {
        server.close(() => {
            mongoose.connection.close(false).then(() => {
                process.exit(0);
            });
        });
    } else {
        mongoose.connection.close(false).then(() => process.exit(0));
    }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
