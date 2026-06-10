import type { Role } from "@prisma/client";

export function isAdmin(role: Role) {
  return role === "ADMIN";
}

export function assertOwnsResource(currentUserId: string, resourceUserId: string) {
  if (currentUserId !== resourceUserId) {
    throw new Error("Forbidden");
  }
}
