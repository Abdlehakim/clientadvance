import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { HttpError } from "../utils/httpError.js";

function isJsonParseError(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const candidate = error as {
    body?: unknown;
    type?: unknown;
  };

  return (
    candidate.type === "entity.parse.failed" ||
    (error instanceof SyntaxError && "body" in candidate)
  );
}

export function errorMiddleware(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (isJsonParseError(error)) {
    return res.status(400).json({
      message: "JSON invalide dans la requête.",
    });
  }

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

  console.error(error);

  return res.status(500).json({
    message: "Internal server error",
  });
}
