import { Router } from "express";
import {
  createBooking,
  listHostBookings,
} from "../controllers/booking.controller.js";
import { requireUserId } from "../middlewares/require-user-id.js";
import { validate, validateQuery } from "../middlewares/validate.js";
import {
  createBookingSchema,
  listHostBookingsQuerySchema,
} from "../dtos/booking.dto.js";
import { cancelBooking } from "../controllers/booking.controller.js";

export const bookingRouter: Router = Router();

bookingRouter.use(requireUserId);

bookingRouter.get(
  "/",
  validateQuery(listHostBookingsQuerySchema),
  listHostBookings,
);
bookingRouter.post("/", validate(createBookingSchema), createBooking);
bookingRouter.post("/:bookingId/cancel", cancelBooking);
