import { api } from "encore.dev/api";
import { connectToDatabase } from "../db/mongodb";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";

const JWT_SECRET = process.env.JWT_SECRET || "";

interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name?: string;
  };
}

interface User {
  _id: ObjectId;
  email: string;
  password: string;
  name?: string;
  createdAt: Date;
}

export const register = api(
  { method: "POST", path: "/auth/register", expose: true },
  async (req: RegisterRequest): Promise<AuthResponse> => {
    const { db } = await connectToDatabase();

    const existingUser = await db
      .collection("users")
      .findOne({ email: req.email });
    if (existingUser) {
      throw new Error("Пользователь с таким email уже существует");
    }

    const hashedPassword = await bcrypt.hash(req.password, 10);

    const result = await db.collection("users").insertOne({
      email: req.email,
      password: hashedPassword,
      name: req.name || "",
      createdAt: new Date(),
    });

    const token = jwt.sign(
      {
        userId: result.insertedId.toString(),
        email: req.email,
      },
      JWT_SECRET,
      { expiresIn: "30d" },
    );

    return {
      token,
      user: {
        id: result.insertedId.toString(),
        email: req.email,
        name: req.name,
      },
    };
  },
);

export const login = api(
  { method: "POST", path: "/auth/login", expose: true },
  async (req: LoginRequest): Promise<AuthResponse> => {
    const { db } = await connectToDatabase();

    const user = (await db
      .collection("users")
      .findOne({ email: req.email })) as User | null;
    if (!user) {
      throw new Error("Неверный email или пароль");
    }

    const isValidPassword = await bcrypt.compare(req.password, user.password);
    if (!isValidPassword) {
      throw new Error("Неверный email или пароль");
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: "30d" },
    );

    return {
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
      },
    };
  },
);
