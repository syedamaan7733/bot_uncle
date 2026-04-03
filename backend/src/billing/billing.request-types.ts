import type { Request } from 'express';

/** JWT payload shape attached by `JwtStrategy`. */
export type JwtPayloadUser = {
  userId: string;
  businessId?: string;
  email?: string;
  business?: unknown;
};

export type AuthorizedRequest = Request & {
  user: JwtPayloadUser;
};

export type BillableRequest = Request & {
  user?: JwtPayloadUser;
};
