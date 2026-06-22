import { Router } from "express";
import {
  createUser,
  deleteUser,
  findAllUsers,
  findById,
  updateUser,
} from "../controllers/user.controller.js";
import { validate } from "../middlewares/validate.js";
import { createUserSchema, updateUserSchema } from "../dtos/user.dto.js";

// We will see the routes after /users
export const userRouter: Router = Router();

userRouter.get("/", findAllUsers);
userRouter.get("/:id", findById);
userRouter.post("/", validate(createUserSchema), createUser);
userRouter.patch("/:id", validate(updateUserSchema), updateUser);
userRouter.delete("/:id", deleteUser);
