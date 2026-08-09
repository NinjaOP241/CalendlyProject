import { Request, Response } from "express";
import { createBookingOptimistically } from "../services/booking.service.js";
import {
  listHostBookings as listHostBookingsServices,
  cancelBooking as cancelBookingService,
} from "../services/booking.service.js";
import { ListHostBookingsQueryDTO } from "../dtos/booking.dto.js";
import { sendSuccess } from "../utils/api-response.js";

export async function listHostBookings(req: Request, res: Response) {
  const result = await listHostBookingsServices(
    req.userId,
    req.validatedQuery as ListHostBookingsQueryDTO,
  );
  sendSuccess(res, result);
}

export async function createBooking(req: Request, res: Response) {
  const booking = await createBookingOptimistically(req.userId, req.body);
  sendSuccess(res, booking, 201, "Booking created successfully");
}

export async function cancelBooking(req: Request, res: Response) {
  const { bookingId } = req.params;
  const cancelledBooking = await cancelBookingService(
    req.userId,
    Number(bookingId),
  );
  sendSuccess(res, cancelledBooking, 200, "Booking cancelled successfully");
}
