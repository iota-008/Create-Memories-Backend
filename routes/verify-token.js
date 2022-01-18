import jsonwebtoken from "jsonwebtoken";
export const verify = (req, res, next) => {
	const authHeader = req.headers["auth-token"];
	const token = authHeader && authHeader.split(" ")[1];
	if (!token) return res.status(401).json({ message: "Access Denied" });
	try {
		jsonwebtoken.verify(token, process.env.SECRET_KEY, (err, user) => {
			req.user = user;
			next();
		});
	} catch (error) {
		return res.status(403).json({ message: "invalid token" });
	}
};
