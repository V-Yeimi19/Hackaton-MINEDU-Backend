export const EVENTS = {
  USER_CREATED: 'user.created',
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
