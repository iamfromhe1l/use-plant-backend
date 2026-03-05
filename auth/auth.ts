import { api, Header } from "encore.dev/api";
import { connectToDatabase } from "../db/mongodb";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { IApiResponse } from "../types/error";
import { successResponse, errorResponse } from "../helpers/response";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name?: string;
  };
}

interface ValidateTokenRequest {
  authorization: Header<"Authorization">;
}

interface ValidateTokenResponse {
  valid: boolean;
}

export const register = api(
  { method: "POST", path: "/auth/register", expose: true },
  async (req: RegisterRequest): Promise<IApiResponse<AuthResponse>> => {
    try {
      const { db } = await connectToDatabase();

      const existingUser = await db
        .collection("users")
        .findOne({ email: req.email });

      if (existingUser) {
        return errorResponse("Пользователь уже существует", "USER_EXISTS");
      }

      const hashedPassword = await bcrypt.hash(req.password, 10);

      const result = await db.collection("users").insertOne({
        email: req.email,
        password: hashedPassword,
        name: req.name || "",
        createdAt: new Date(),
      });

      const token = jwt.sign(
        { userId: result.insertedId.toString(), email: req.email },
        JWT_SECRET,
        { expiresIn: "30d" },
      );

      return successResponse({
        token,
        user: {
          id: result.insertedId.toString(),
          email: req.email,
          name: req.name,
        },
      });
    } catch (error) {
      console.error("Registration error:", error);
      return errorResponse("Внутренняя ошибка сервера", "INTERNAL_ERROR");
    }
  },
);

export const login = api(
  { method: "POST", path: "/auth/login", expose: true },
  async (req: LoginRequest): Promise<IApiResponse<AuthResponse>> => {
    try {
      const { db } = await connectToDatabase();

      const user = await db.collection("users").findOne({ email: req.email });

      if (!user) {
        return errorResponse(
          "Неверный email или пароль",
          "INVALID_CREDENTIALS",
        );
      }

      const isValid = await bcrypt.compare(req.password, user.password);

      if (!isValid) {
        return errorResponse(
          "Неверный email или пароль",
          "INVALID_CREDENTIALS",
        );
      }

      const token = jwt.sign(
        { userId: user._id.toString(), email: user.email },
        JWT_SECRET,
        { expiresIn: "30d" },
      );

      return successResponse({
        token,
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      return errorResponse("Внутренняя ошибка сервера", "INTERNAL_ERROR");
    }
  },
);

export const changePassword = api(
  { method: "POST", path: "/auth/password", expose: true, auth: true },
  async (req: ChangePasswordRequest): Promise<IApiResponse<null>> => {
    try {
      const { db } = await connectToDatabase();
      const userId = (req as any).auth.userId;
      const { currentPassword, newPassword } = req;

      const user = await db.collection("users").findOne({
        _id: new ObjectId(userId),
      });

      if (!user) {
        return errorResponse("Пользователь не найден", "USER_NOT_FOUND");
      }

      const isValid = await bcrypt.compare(currentPassword, user.password);

      if (!isValid) {
        return errorResponse("Неверный текущий пароль", "INVALID_PASSWORD");
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await db
        .collection("users")
        .updateOne(
          { _id: new ObjectId(userId) },
          { $set: { password: hashedPassword } },
        );

      return successResponse(null);
    } catch (error) {
      console.error("Change password error:", error);
      return errorResponse("Внутренняя ошибка сервера", "INTERNAL_ERROR");
    }
  },
);

export const logout = api(
  { method: "POST", path: "/auth/logout", expose: true, auth: true },
  async (): Promise<IApiResponse<null>> => {
    try {
      return successResponse(null);
    } catch (error) {
      console.error("Logout error:", error);
      return errorResponse("Внутренняя ошибка сервера", "INTERNAL_ERROR");
    }
  },
);

export const validateToken = api(
  { method: "GET", path: "/auth/validate", expose: true },
  async (
    req: ValidateTokenRequest,
  ): Promise<IApiResponse<ValidateTokenResponse>> => {
    try {
      const authHeader = (req as any).headers.authorization;

      if (!authHeader) {
        return successResponse({ valid: false });
      }

      const token = authHeader.replace("Bearer ", "");

      try {
        jwt.verify(token, JWT_SECRET);
        return successResponse({ valid: true });
      } catch {
        return successResponse({ valid: false });
      }
    } catch (error) {
      console.error("Validate token error:", error);
      return errorResponse("Внутренняя ошибка сервера", "INTERNAL_ERROR");
    }
  },
);
