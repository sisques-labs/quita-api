import { withCodeCollisionRetry } from '@contexts/group-invitation-codes/application/helpers/with-code-collision-retry';
import { InvitationCodeCollisionException } from '@contexts/group-invitation-codes/domain/exceptions/invitation-code-collision.exception';

describe('withCodeCollisionRetry', () => {
  it('returns the result of the first attempt without retrying', async () => {
    const operation = vi.fn().mockResolvedValue('ok');

    await expect(withCodeCollisionRetry(operation)).resolves.toBe('ok');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('retries after a code collision and returns the later success', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new InvitationCodeCollisionException())
      .mockRejectedValueOnce(new InvitationCodeCollisionException())
      .mockResolvedValue('ok');

    await expect(withCodeCollisionRetry(operation, 3)).resolves.toBe('ok');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('gives up with the collision error once the attempts are exhausted', async () => {
    const operation = vi
      .fn()
      .mockRejectedValue(new InvitationCodeCollisionException());

    await expect(withCodeCollisionRetry(operation, 3)).rejects.toThrow(
      InvitationCodeCollisionException,
    );
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('does not retry unrelated errors', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('db down'));

    await expect(withCodeCollisionRetry(operation)).rejects.toThrow('db down');
    expect(operation).toHaveBeenCalledTimes(1);
  });
});
