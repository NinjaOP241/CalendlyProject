import { Router } from "express";
import {
  createUser,
  findAllUsers,
  findById,
} from "../controllers/user.controller.js";
import { validate } from "../middlewares/validate.js";
import { createUserSchema } from "../dtos/user.dto.js";

// We will see the routes after /users
export const userRouter: Router = Router();

userRouter.get("/", findAllUsers);
userRouter.get("/:id", findById);
userRouter.post("/", validate(createUserSchema), createUser);
