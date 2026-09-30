import { GroupInvitationCodeBuilder } from '@contexts/group-invitation-codes/domain/builders/group-invitation-code.builder';
import { GroupInvitationCodeCreatedEvent } from '@contexts/group-invitation-codes/domain/events/group-invitation-code-created/group-invitation-code-created.event';
import { GroupInvitationCodeRevokedEvent } from '@contexts/group-invitation-codes/domain/events/group-invitation-code-revoked/group-invitation-code-revoked.event';

const ID = '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11';
const GROUP_ID = '5d1c8f0a-3f55-4b6a-8a27-3a8d3b0d7e22';

const newCode = () =>
  new GroupInvitationCodeBuilder()
    .withId(ID)
    .withGroupId(GROUP_ID)
    .withCode('7kq2m9xz')
    .withCreatedBy('user_a')
    .withCreatedAt(new Date('2026-01-01T10:00:00Z'));

describe('GroupInvitationCodeAggregate', () => {
  it('exposes its state as primitives, active by default', () => {
    const aggregate = newCode().build();

    expect(aggregate.toPrimitives()).toEqual({
      id: ID,
      groupId: GROUP_ID,
      code: '7KQ2M9XZ',
      createdBy: 'user_a',
      revokedAt: null,
      createdAt: new Date('2026-01-01T10:00:00Z'),
      updatedAt: new Date('2026-01-01T10:00:00Z'),
    });
    expect(aggregate.isActive()).toBe(true);
  });

  it('emits GroupInvitationCodeCreatedEvent on create()', () => {
    const aggregate = newCode().build();
    expect(aggregate.getUncommittedEvents()).toHaveLength(0);

    aggregate.create();

    const events = aggregate.getUncommittedEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(GroupInvitationCodeCreatedEvent);
  });

  it('revokes the code and emits GroupInvitationCodeRevokedEvent', () => {
    const aggregate = newCode().build();
    const revokedAt = new Date('2026-02-01T09:00:00Z');

    aggregate.revoke(revokedAt);

    expect(aggregate.isActive()).toBe(false);
    expect(aggregate.toPrimitives().revokedAt).toEqual(revokedAt);
    const events = aggregate.getUncommittedEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(GroupInvitationCodeRevokedEvent);
  });

  it('keeps the first revocation when revoked again', () => {
    const aggregate = newCode().build();
    aggregate.revoke(new Date('2026-02-01T09:00:00Z'));
    aggregate.revoke(new Date('2026-03-01T09:00:00Z'));

    expect(aggregate.toPrimitives().revokedAt).toEqual(
      new Date('2026-02-01T09:00:00Z'),
    );
    expect(aggregate.getUncommittedEvents()).toHaveLength(1);
  });

  it('hydrates a revoked code as inactive', () => {
    const aggregate = newCode()
      .withRevokedAt(new Date('2026-02-01T09:00:00Z'))
      .build();

    expect(aggregate.isActive()).toBe(false);
  });

  it('rejects a code without group, code or creator', () => {
    expect(() =>
      new GroupInvitationCodeBuilder()
        .withId(ID)
        .withCode('7KQ2M9XZ')
        .withCreatedBy('user_a')
        .build(),
    ).toThrow();
    expect(() =>
      new GroupInvitationCodeBuilder()
        .withId(ID)
        .withGroupId(GROUP_ID)
        .withCreatedBy('user_a')
        .build(),
    ).toThrow();
    expect(() =>
      new GroupInvitationCodeBuilder()
        .withId(ID)
        .withGroupId(GROUP_ID)
        .withCode('7KQ2M9XZ')
        .build(),
    ).toThrow();
  });
});
