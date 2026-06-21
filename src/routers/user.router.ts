import { Router } from "express";
import { findAllUsers, findById } from "../controllers/user.controller.js";

// We will see the routes after /users
export const userRouter: Router = Router();

userRouter.get("/", findAllUsers);
userRouter.get("/:id", findById);
