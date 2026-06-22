import { prisma } from "../config/database.js";
import { CreateUserDTO } from "../dtos/user.dto.js";

export async function getAll() {
  const users = await prisma.user.findMany();
  return users;
}

export async function getById(id: number) {
  const user = await prisma.user.findUnique({
    where: { id },
  });
  return user;
}

export async function findByEmail(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
  });
  return user;
}

export async function create(data: CreateUserDTO) {
  const user = await prisma.user.create({ data });
  return user;
}
