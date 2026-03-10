import { authHandler } from "encore.dev/auth";
import { APIError, Header } from "encore.dev/api";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

interface AuthParams {
  authorization: Header<"Authorization">;
}

export interface AuthData {
  userID: string;
  email: string;
}

export const auth = authHandler<AuthParams, AuthData>(
  async (params: AuthParams): Promise<AuthData> => {
    const token = params.authorization.replace("Bearer ", "");
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
      return { userID: decoded.userId, email: decoded.email };
    } catch {
      throw APIError.unauthenticated("Invalid or expired token");
    }
  },
);
