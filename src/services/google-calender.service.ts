import { google } from "googleapis";
import {
  GOOGLE_CALENDAR_ID,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  GOOGLE_SENDER_EMAIL,
} from "../config/env.js";
import {
  badRequest,
  internalServerError,
  notFound,
} from "../utils/api-error.js";
import { redis } from "../config/redis.js";
import { RedisKeys } from "../utils/redis-keys.js";
import { findBookingById } from "../repositories/booking.repository.js";
import { BookingStatus } from "../../generated/prisma/enums.js";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
];

/**
 * Checks if the Google Calendar API is configured with the necessary credentials.
 * If not configured, then there's no point of unecessarily hitting the google calendar SDK.
 */
export function isProjectCalendarConfigured(): Boolean {
  return Boolean(
    GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_REDIRECT_URI,
  );
}

/**
 * Retrieves the Google OAuth2 client configured with the necessary credentials.
 * This google auth client is used to make requests to the Google Calendar API.
 */
export function getGoogleOAuth2Client(): InstanceType<
  typeof google.auth.OAuth2
> {
  if (!isProjectCalendarConfigured()) {
    throw internalServerError("Google Project Calendar is not configured");
  }

  const googleAuthClient = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI,
  );
  return googleAuthClient;
}

/**
 * Retrieves the authentication URL for setting up Google Calendar access.
 *
 * This URL will be used to redirect users to Google's OAuth2 consent screen for
 * granting access to their calendar and once the user grants access,
 * Google will redirect the user back to the application with an authorization code (short lived).
 * Using that authorization code, the application server can request for access and refresh tokens
 * from Google, which can be used to make requests to the Google Calendar API on behalf of the user.
 */
export function getSetupAuthUrl() {
  const client = getGoogleOAuth2Client();
  const authUrl = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state: "setup",
  });
  return authUrl;
}

/**
 * Once the user grants access to their Google Calendar, Google will redirect the user (browser)
 * back to the application server with an authorization code (short lived).
 * We need to exchange that authorization code for access and refresh tokens,
 * which can be used to make requests to the Google Calendar API on behalf of the user.
 */
export async function exchangeSetupCode(code: string) {
  const client = getGoogleOAuth2Client();

  // This will provide an object with the access_token and refresh_token.
  const { tokens } = await client.getToken(code);

  if (!tokens.refresh_token) {
    throw new Error("No refresh token found");
  }

  client.setCredentials(tokens);

  // Using this oauth2 object we can get the user's information
  const oauth2 = google.oauth2({
    version: "v2",
    auth: client,
  });

  // Get the user's information using the oauth2 object
  const { data } = await oauth2.userinfo.get();

  // TODO: Store the refresh token in redis and DB

  return {
    refreshToken: tokens.refresh_token,
    email: data.email ?? GOOGLE_SENDER_EMAIL,
  };
}

export function getGoogleCalendarClient(): InstanceType<
  typeof google.auth.OAuth2
> {
  if (!isProjectCalendarConfigured()) {
    throw internalServerError("Google Project Calendar is not configured");
  }

  const client = getGoogleOAuth2Client();

  /**
   * TODO:
   * 1. Get the refresh token from the redis, if failed then get it from the DB
   * 2. set credentials with the refresh token to the client object
   */

  // Hard coding the GOOGLE_REFRESH_TOKEN for testing
  client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });
  return client;
}

export async function createGoogleCalendarEvent(bookingId: number) {
  const booking = await findBookingById(bookingId);

  if (!booking) {
    throw notFound(`Booking not found`);
  }

  if (booking.status !== BookingStatus.CONFIRMED) {
    throw badRequest(`Booking is not confirmed`);
  }

  const client = getGoogleCalendarClient();

  const calendar = google.calendar({ version: "v3", auth: client });

  // Build the event object
  const event = {
    summary: `${booking.eventType.title} with ${booking.host.name} is confirmed`,
    description: [
      booking.eventType.description,
      booking.inviteeNotes ? `Invitee note: ${booking.inviteeNotes}` : "",
    ].join("\n\n"),
    start: {
      dateTime: booking.slot.startAt.toISOString(),
      timeZone: booking.host.timezone,
    },
    end: {
      dateTime: booking.slot.endAt.toISOString(),
      timeZone: booking.host.timezone,
    },
    attendees: [
      { email: booking.host.email, displayName: booking.host.name },
      { email: booking.inviteeEmail, displayName: booking.inviteeName },
    ],

    conferenceData: {
      createRequest: {
        requestId: booking.id.toString(),
        conferenceSolutionKey: {
          type: "hangoutsMeet",
        },
      },
    },
  };

  const response = await calendar.events.insert({
    calendarId: GOOGLE_CALENDAR_ID,
    conferenceDataVersion: 1,
    sendUpdates: "all",
    requestBody: event,
  });

  // Extract the generated Google Meet link
  const meetLink = response.data.hangoutLink;
  const calendarEventId = response.data.id;

  if (!calendarEventId || !meetLink) {
    throw new Error("Failed to create Google Calendar event");
  }

  return {
    meetLink,
    calendarEventId,
  };
}
