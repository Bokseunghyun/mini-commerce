import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "demo-secret-key";

export default function verifyToken(req, res, next) {
  const publicPaths = [
    "/api/login",
    "/api/products",
    /^\/api\/products\/\d+$/, // 상세 public (단, 3/4는 productDetail에서 status로 막음)
  ];

  const isPublic = publicPaths.some((p) =>
    p instanceof RegExp ? p.test(req.path) : p === req.path
  );
  if (isPublic) return next();

  const authHeader = req.headers.authorization || "";
  if (!authHeader) return res.status(401).json({ message: "토큰 없음" });

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";

  if (!token || token === "null" || token === "undefined") {
    return res.status(401).json({ message: "토큰 없음" });
  }

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    return next();
  } catch (e) {
    return res.status(401).json({ message: "토큰 유효하지 않음" });
  }
}
