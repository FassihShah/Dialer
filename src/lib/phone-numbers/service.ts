import { prisma } from "@/lib/db";
import { normalizePhone } from "@/lib/normalize";
import { phoneNumberSchema } from "@/lib/validation";

export async function upsertPhoneNumber(input: unknown) {
  const parsed = phoneNumberSchema.parse(input);
  const normalizedPhone = normalizePhone(parsed.phoneNumber, parsed.country);
  if (!normalizedPhone) throw new Error("Invalid phone number");
  return prisma.phoneNumber.upsert({
    where: { normalizedPhone },
    update: { ...parsed, normalizedPhone },
    create: { ...parsed, normalizedPhone },
  });
}

export async function assignNumber(phoneNumberId: string, userId: string, assignedById: string) {
  return prisma.$transaction(async (tx) => {
    const number = await tx.phoneNumber.findUnique({ where: { id: phoneNumberId } });
    if (!number || number.status !== "active") throw new Error("Active phone number not found");

    const activeForNumber = await tx.phoneNumberAssignment.findFirst({ where: { phoneNumberId, active: true } });
    if (activeForNumber && activeForNumber.userId !== userId) {
      throw new Error("This number is already assigned to another active user");
    }

    const activeForUser = await tx.phoneNumberAssignment.findFirst({ where: { userId, active: true } });
    if (activeForUser && activeForUser.phoneNumberId !== phoneNumberId) {
      throw new Error("This user already has an assigned number");
    }

    if (activeForNumber) return activeForNumber;
    return tx.phoneNumberAssignment.create({ data: { phoneNumberId, userId, assignedById } });
  });
}

export async function unassignNumber(assignmentId: string) {
  return prisma.phoneNumberAssignment.update({
    where: { id: assignmentId },
    data: { active: false },
  });
}
