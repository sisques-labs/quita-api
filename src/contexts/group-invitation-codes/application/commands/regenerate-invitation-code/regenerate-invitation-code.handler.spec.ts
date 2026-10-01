import { RegenerateInvitationCodeCommand } from '@contexts/group-invitation-codes/application/commands/regenerate-invitation-code/regenerate-invitation-code.command';
import { RegenerateInvitationCodeHandler } from '@contexts/group-invitation-codes/application/commands/regenerate-invitation-code/regenerate-invitation-code.handler';
import { InvitationCodeGeneratorPort } from '@contexts/group-invitation-codes/application/ports/invitation-code-generator.port';
import { AssertRequesterIsGroupMemberService } from '@contexts/group-invitation-codes/application/services/read/assert-requester-is-group-member/assert-requester-is-group-member.service';
import { GroupInvitationCodeAggregate } from '@contexts/group-invitation-codes/domain/aggregates/group-invitation-code.aggregate';
import { GroupInvitationCodeBuilder } from '@contexts/group-invitation-codes/domain/builders/group-invitation-code.builder';
import { ActiveInvitationCodeConflictException } from '@contexts/group-invitation-codes/domain/exceptions/active-invitation-code-conflict.exception';
import { InvitationCodeCollisionException } from '@contexts/group-invitation-codes/domain/exceptions/invitation-code-collision.exception';
import { GroupInvitationAccessDeniedException } from '@contexts/group-invitation-codes/domain/exceptions/group-invitation-access-denied.exception';
import { IGroupInvitationCodeWriteRepository } from '@contexts/group-invitation-codes/domain/repositories/write/group-invitation-code-write.repository';
import { EventBus } from '@nestjs/cqrs';
import { Mocked } from 'vitest';

const GROUP_ID = '5d1c8f0a-3f55-4b6a-8a27-3a8d3b0d7e22';

const activeCode = () =>
  new GroupInvitationCodeBuilder()
    .withId('0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11')
    .withGroupId(GROUP_ID)
    .withCode('ABCD2345')
    .withCreatedBy('user_b')
    .build();

describe('RegenerateInvitationCodeHandler', () => {
  let repository: Mocked<IGroupInvitationCodeWriteRepository>;
  let generator: Mocked<InvitationCodeGeneratorPort>;
  let assertMember: Mocked<AssertRequesterIsGroupMemberService>;
  let eventBus: Mocked<EventBus>;
  let handler: RegenerateInvitationCodeHandler;

  beforeEach(() => {
    repository = {
      findActiveByGroupId: vi.fn().mockResolvedValue(null),
      replaceActive: vi.fn(),
    } as unknown as Mocked<IGroupInvitationCodeWriteRepository>;
    generator = { generate: vi.fn().mockReturnValue('7KQ2M9XZ') };
    assertMember = {
      execute: vi.fn(),
    } as unknown as Mocked<AssertRequesterIsGroupMemberService>;
    eventBus = { publishAll: vi.fn() } as unknown as Mocked<EventBus>;
    handler = new RegenerateInvitationCodeHandler(
      repository,
      generator,
      assertMember,
      eventBus,
    );
  });

  it('revokes the active code and inserts the new one in one replaceActive call', async () => {
    const previous = activeCode();
    repository.findActiveByGroupId.mockResolvedValue(previous);

    const code = await handler.execute(
      new RegenerateInvitationCodeCommand({
        groupId: GROUP_ID,
        requesterId: 'user_a',
      }),
    );

    expect(code).toBe('7KQ2M9XZ');
    expect(repository.replaceActive).toHaveBeenCalledTimes(1);
    const [revoked, created] = repository.replaceActive.mock.calls[0] as [
      GroupInvitationCodeAggregate,
      GroupInvitationCodeAggregate,
    ];
    expect(revoked).toBe(previous);
    expect(revoked.isActive()).toBe(false);
    expect(created.toPrimitives()).toMatchObject({
      groupId: GROUP_ID,
      code: '7KQ2M9XZ',
      createdBy: 'user_a',
      revokedAt: null,
    });
    expect(eventBus.publishAll).toHaveBeenCalledTimes(2);
  });

  it('just creates a code when the group had none', async () => {
    const code = await handler.execute(
      new RegenerateInvitationCodeCommand({
        groupId: GROUP_ID,
        requesterId: 'user_a',
      }),
    );

    expect(code).toBe('7KQ2M9XZ');
    expect(repository.replaceActive).toHaveBeenCalledWith(
      null,
      expect.any(GroupInvitationCodeAggregate),
    );
  });

  it('does not publish events when the persistence fails', async () => {
    repository.findActiveByGroupId.mockResolvedValue(activeCode());
    repository.replaceActive.mockRejectedValue(new Error('db down'));

    await expect(
      handler.execute(
        new RegenerateInvitationCodeCommand({
          groupId: GROUP_ID,
          requesterId: 'user_a',
        }),
      ),
    ).rejects.toThrow('db down');
    expect(eventBus.publishAll).not.toHaveBeenCalled();
  });

  it('retries with a fresh code when the generated one collides', async () => {
    repository.findActiveByGroupId.mockResolvedValue(activeCode());
    generator.generate
      .mockReturnValueOnce('AAAA2222')
      .mockReturnValueOnce('7KQ2M9XZ');
    repository.replaceActive
      .mockRejectedValueOnce(new InvitationCodeCollisionException())
      .mockResolvedValueOnce(undefined);

    const code = await handler.execute(
      new RegenerateInvitationCodeCommand({
        groupId: GROUP_ID,
        requesterId: 'user_a',
      }),
    );

    expect(code).toBe('7KQ2M9XZ');
    expect(repository.replaceActive).toHaveBeenCalledTimes(2);
    expect(eventBus.publishAll).toHaveBeenCalledTimes(2);
  });

  it('propagates a concurrent-regeneration conflict without publishing events', async () => {
    repository.findActiveByGroupId.mockResolvedValue(activeCode());
    repository.replaceActive.mockRejectedValue(
      new ActiveInvitationCodeConflictException(GROUP_ID),
    );

    await expect(
      handler.execute(
        new RegenerateInvitationCodeCommand({
          groupId: GROUP_ID,
          requesterId: 'user_a',
        }),
      ),
    ).rejects.toThrow(ActiveInvitationCodeConflictException);
    expect(repository.replaceActive).toHaveBeenCalledTimes(1);
    expect(eventBus.publishAll).not.toHaveBeenCalled();
  });

  it('denies a non-member without changing anything', async () => {
    assertMember.execute.mockRejectedValue(
      new GroupInvitationAccessDeniedException('stranger', GROUP_ID),
    );

    await expect(
      handler.execute(
        new RegenerateInvitationCodeCommand({
          groupId: GROUP_ID,
          requesterId: 'stranger',
        }),
      ),
    ).rejects.toThrow(GroupInvitationAccessDeniedException);
    expect(repository.replaceActive).not.toHaveBeenCalled();
  });
});
