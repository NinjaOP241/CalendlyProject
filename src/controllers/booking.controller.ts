import { Request, Response } from "express";
import { createBookingPessimistically } from "../services/booking.service.js";
import { listHostBookings as listHostBookingsServices } from "../services/booking.service.js";
import { ListHostBookingsQueryDTO } from "../dtos/booking.dto.js";
import { sendSuccess } from "../utils/api-response.js";

export async function createBooking(req: Request, res: Response) {
  const booking = await createBookingPessimistically(req.userId, req.body);
  sendSuccess(res, booking, 201, "Booking created successfully");
}

export async function listHostBookings(req: Request, res: Response) {
  const result = await listHostBookingsServices(
    req.userId,
    req.validatedQuery as ListHostBookingsQueryDTO,
  );
  sendSuccess(res, result);
}
