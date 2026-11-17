import { Request } from "express";
import { Role } from "@prisma/client";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  canteenId?: string | null;
  hostel?: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export interface SocketUser {
  userId: string;
  role: Role;
  canteenId?: string | null;
}
