import { Router } from "express";
import {
  createBooking,
  listHostBookings,
} from "../controllers/booking.controller.js";
import { requireUserId } from "../middlewares/require-user-id.js";
import { validate, validateQuery } from "../middlewares/validate.js";
import {
  createBookingSchema,
  listHostBookingQuerySchema,
} from "../dtos/booking.dto.js";

export const bookingRouter: Router = Router();

bookingRouter.use(requireUserId);

bookingRouter.get(
  "/",
  validateQuery(listHostBookingQuerySchema),
  listHostBookings,
);
bookingRouter.post("/", validate(createBookingSchema), createBooking);
