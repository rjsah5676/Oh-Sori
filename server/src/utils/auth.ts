import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export function getUserFromToken(
  req: any
): { email: string; nickname: string } | null {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  const token = cookieHeader
    .split(";")
    .find((c: string) => c.trim().startsWith("accessToken="))
    ?.split("=")[1];

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      email: string;
      nickname: string;
    };
    return decoded;
  } catch {
    return null;
  }
}
