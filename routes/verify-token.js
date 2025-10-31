import jsonwebtoken from "jsonwebtoken";

export const verify = (req, res, next) => {
    const header = req.headers["authorization"] || req.headers["auth-token"];
    let token = null;
    if (header) {
        if (typeof header === "string" && header.toLowerCase().startsWith("bearer ")) {
            token = header.slice(7).trim();
        } else if (typeof header === "string") {
            const parts = header.split(" ");
            token = parts.length === 2 ? parts[1] : header;
        }
    }

    if (!token) return res.status(401).json({ message: "Access Denied" });

    try {
        const user = jsonwebtoken.verify(token, process.env.SECRET_KEY);
        req.user = user;
        return next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};
