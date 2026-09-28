import type { User } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      auth: {
        sessionId: string;
        user: Pick<User, "id"> & Partial<User>;
      };
    }
  }
}

export {};
