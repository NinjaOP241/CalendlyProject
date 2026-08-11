export const RedisKeys = {
  googleCalendarRefreshToken: (userId: number) =>
    `google:calendar:refresh_token:${userId}`,
};
