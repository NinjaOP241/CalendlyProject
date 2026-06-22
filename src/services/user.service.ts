import { CreateUserDTO, UpdateUserDTO } from "../dtos/user.dto.js";
import {
  create,
  findByEmail,
  getAll,
  getById,
  remove,
  update,
} from "../repositories/user.repository.js";
import { conflict, notFound } from "../utils/api-error.js";

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

export async function createUser(data: CreateUserDTO) {
  // Check if the user already exists or not
  const existingUser = await findByEmail(data.email);

  if (existingUser) {
    throw conflict("User already exists");
  }

  const user = await create(data);
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
