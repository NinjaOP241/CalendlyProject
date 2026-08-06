declare global {
  namespace Express {
    interface Request {
      userId: number;
      validatedQuery?: unknown;
    }
  }
}

export {};
