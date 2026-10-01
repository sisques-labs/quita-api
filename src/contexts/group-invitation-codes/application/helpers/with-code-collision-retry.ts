import { MAX_CODE_ATTEMPTS } from '@contexts/group-invitation-codes/application/constants/max-code-attempts.constant';
import { InvitationCodeCollisionException } from '@contexts/group-invitation-codes/domain/exceptions/invitation-code-collision.exception';

/**
 * Runs `operation` again (it must draw a fresh code each time) when the code
 * it persisted collided with an existing one. Other errors, and the collision
 * error once the attempts are exhausted, propagate.
 */
export async function withCodeCollisionRetry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = MAX_CODE_ATTEMPTS,
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (
        !(error instanceof InvitationCodeCollisionException) ||
        attempt >= maxAttempts
      ) {
        throw error;
      }
    }
  }
}
