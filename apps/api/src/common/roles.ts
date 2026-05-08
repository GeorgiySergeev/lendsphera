import { SetMetadata } from "@nestjs/common";
import { Role } from "@prisma/client";

export const ROLES_KEY = "roles";
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export const READ_ROLES = [Role.VIEWER, Role.EDITOR, Role.ADMIN, Role.OWNER];
export const WRITE_ROLES = [Role.EDITOR, Role.ADMIN, Role.OWNER];
export const ADMIN_ROLES = [Role.ADMIN, Role.OWNER];
