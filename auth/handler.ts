import { Gateway } from "encore.dev/api";
import { authHandler } from "encore.dev/auth";
import { APIError, Header } from "encore.dev/api";
import jwt from "jsonwebtoken";
import * as dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

interface AuthParams {
  authorization?: Header<"Authorization">;
}

export interface AuthData {
  userID: string;
  email: string;
}

const auth = authHandler<AuthParams, AuthData>(
  async (params: AuthParams): Promise<AuthData> => {
    if (!params.authorization) {
      throw APIError.unauthenticated("No authorization header provided");
    }

    const token = params.authorization.replace("Bearer ", "");

    if (!token) {
      throw APIError.unauthenticated("Empty token");
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        userId: string;
        email: string;
      };
      return { userID: decoded.userId, email: decoded.email };
    } catch {
      throw APIError.unauthenticated("Invalid or expired token");
    }
  },
);

export const gateway = new Gateway({
  authHandler: auth,
});
