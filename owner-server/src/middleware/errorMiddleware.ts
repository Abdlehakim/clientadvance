import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { env } from "../config/env.js";
import { HttpError } from "../utils/httpError.js";

export function errorMiddleware(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      message: "Validation error",
      errors: error.flatten(),
    });
  }

  if (error instanceof HttpError) {
    return res.status(error.statusCode).json({
      message: error.message,
      details: error.details,
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return res.status(400).json({
      message: "Database error",
      code: error.code,
      meta: error.meta,
    });
  }

  if (env.NODE_ENV !== "production") {
    console.error(
      `[owner-server] ${req.method} ${req.originalUrl} failed with an unhandled error:`,
      error,
    );
  }

  return res.status(500).json({
    message: "Internal server error",
  });
}
