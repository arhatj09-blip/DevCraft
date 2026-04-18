import { Router } from "express";
import { z } from "zod";

type UserRecord = {
  email: string;
  password: string;
  name?: string;
  createdAt: number;
};

const users = new Map<string, UserRecord>();

const emailSchema = z.string().trim().email().max(254);
const passwordSchema = z.string().min(6).max(128);

const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().trim().min(2).max(80).optional(),
});

const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

function authToken(email: string): string {
  return Buffer.from(`${email}:${Date.now()}`).toString("base64url");
}

export const authRouter = Router();

authRouter.post("/signup", (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: {
        code: "BAD_REQUEST",
        message: "Invalid signup payload",
        details: parsed.error.flatten(),
      },
    });
  }

  const email = parsed.data.email.toLowerCase();
  if (users.has(email)) {
    return res.status(409).json({
      error: {
        code: "USER_EXISTS",
        message: "Account already exists for this email",
      },
    });
  }

  users.set(email, {
    email,
    password: parsed.data.password,
    name: parsed.data.name,
    createdAt: Date.now(),
  });

  return res.status(201).json({
    user: { email, name: parsed.data.name ?? null },
    token: authToken(email),
  });
});

authRouter.post("/login", (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: {
        code: "BAD_REQUEST",
        message: "Invalid login payload",
        details: parsed.error.flatten(),
      },
    });
  }

  const email = parsed.data.email.toLowerCase();
  const user = users.get(email);

  if (!user || user.password !== parsed.data.password) {
    return res.status(401).json({
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      },
    });
  }

  return res.json({
    user: { email: user.email, name: user.name ?? null },
    token: authToken(email),
  });
});
