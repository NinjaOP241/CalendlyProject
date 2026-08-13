import { CreateUserDTO, UpdateUserDTO } from "../dtos/user.dto.js";
import {
  create,
  findByEmail,
  findByHandle,
  getAll,
  getById,
  getUserWithHighestId,
  remove,
  update,
} from "../repositories/user.repository.js";
import { conflict, notFound } from "../utils/api-error.js";
import { encodeBase62 } from "../utils/base62.js";
import { normalizeToHandle } from "../utils/normalize.utils.js";

export async function findAllUsers() {
  const users = await getAll();
  return users;
}

export async function findById(id: number) {
  const user = await getById(id);
  if (!user) {
    throw notFound("User not found");
  }

  return user;
}

async function createUniqueUserHandle(name: string) {
  const cleanHandle = normalizeToHandle(name);

  // Get last row ID to construct fallback suffix
  const lastUser = await getUserWithHighestId();

  const nextId = (lastUser?.id ?? 0) + 1;
  const hash = encodeBase62(nextId);

  return `${cleanHandle}-${hash}`;
}

export async function createUser(data: CreateUserDTO) {
  // Check if the user already exists or not
  const existingUser = await findByEmail(data.email);

  if (existingUser) {
    throw conflict("User already exists");
  }

  let userHandle = "";
  if (data.handle) {
    const existingUserHandle = await findByHandle(data.handle);
    if (existingUserHandle) throw conflict("User handle already taken");

    userHandle = data.handle;
  }

  if (!userHandle) {
    userHandle = await createUniqueUserHandle(data.name);
  }

  const user = await create({ ...data, handle: userHandle });
  return user;
}

export async function updateUser(id: number, data: UpdateUserDTO) {
  const user = await getById(id);
  if (!user) {
    throw notFound("User not found");
  }

  if (data.email && data.email !== user.email) {
    const existingUser = await findByEmail(data.email);
    if (existingUser) {
      throw conflict("User already exists");
    }
  }

  const exisitingHandle = data.handle ? findByHandle(data.handle) : null;
  if (exisitingHandle) {
    throw conflict("User handle already exists");
  }

  const updatedUser = await update(id, data);
  return updatedUser;
}

export async function deleteUser(id: number) {
  const user = await getById(id);
  if (!user) {
    throw notFound("User not found");
  }

  const deletedUser = await remove(id);
  return deletedUser;
}
