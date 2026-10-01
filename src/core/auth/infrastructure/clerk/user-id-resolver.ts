export const USER_ID_RESOLVER = Symbol('USER_ID_RESOLVER');

/** Maps the Clerk token subject to the internal user id. */
export interface UserIdResolver {
  resolve(subject: string): Promise<string>;
}

/**
 * v1: the internal id is the opaque Clerk `sub`. A later Sisques Account
 * switch replaces this resolver (plus a data remap).
 */
export class IdentityUserIdResolver implements UserIdResolver {
  async resolve(subject: string): Promise<string> {
    return subject;
  }
}
