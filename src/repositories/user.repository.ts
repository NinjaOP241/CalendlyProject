import { prisma } from "../config/database.js";
import { CreateUserDTO, UpdateUserDTO } from "../dtos/user.dto.js";

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

export async function create(data: CreateUserDTO & { handle: string }) {
  const user = await prisma.user.create({ data });
  return user;
}

export async function update(id: number, data: UpdateUserDTO) {
  const user = await prisma.user.update({
    where: { id },
    data,
  });
  return user;
}

export async function remove(id: number) {
  const user = await prisma.user.delete({
    where: {
      id,
    },
  });
  return user;
}

export async function updateGoogleRefreshToken(
  userId: number,
  refreshToken: string,
) {
  return await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      googleRefreshToken: refreshToken,
    },
  });
}

export async function findByHandle(handle: string) {
  return await prisma.user.findUnique({
    where: {
      handle,
    },
  });
}

export async function getUserWithHighestId() {
  return await prisma.user.findFirst({
    orderBy: {
      id: "desc",
    },
    select: {
      id: true,
    },
  });
}
