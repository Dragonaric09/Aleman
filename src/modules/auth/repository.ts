import { prisma, type Tx } from "@/server/db";

export function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export function findUserById(userId: string) {
  return prisma.user.findUnique({ where: { id: userId } });
}

export function insertUser(tx: Tx, data: { email: string; passwordHash: string; displayName: string }) {
  return tx.user.create({ data });
}

export function updatePasswordHash(userId: string, passwordHash: string) {
  return prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}
