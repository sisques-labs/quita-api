import { GenerateInvitationCodeCommand } from '@contexts/group-invitation-codes/application/commands/generate-invitation-code/generate-invitation-code.command';
import { GenerateInvitationCodeHandler } from '@contexts/group-invitation-codes/application/commands/generate-invitation-code/generate-invitation-code.handler';
import { InvitationCodeGeneratorPort } from '@contexts/group-invitation-codes/application/ports/invitation-code-generator.port';
import { AssertRequesterIsGroupMemberService } from '@contexts/group-invitation-codes/application/services/read/assert-requester-is-group-member.service';
import { GroupInvitationCodeAggregate } from '@contexts/group-invitation-codes/domain/aggregates/group-invitation-code.aggregate';
import { GroupInvitationCodeBuilder } from '@contexts/group-invitation-codes/domain/builders/group-invitation-code.builder';
import { GroupInvitationAccessDeniedException } from '@contexts/group-invitation-codes/domain/exceptions/group-invitation-access-denied.exception';
import { GroupInvitationCodeWriteRepository } from '@contexts/group-invitation-codes/domain/repositories/write/group-invitation-code-write.repository';
import { EventBus } from '@nestjs/cqrs';
import { Mocked } from 'vitest';

const GROUP_ID = '5d1c8f0a-3f55-4b6a-8a27-3a8d3b0d7e22';

describe('GenerateInvitationCodeHandler', () => {
  let repository: Mocked<GroupInvitationCodeWriteRepository>;
  let generator: Mocked<InvitationCodeGeneratorPort>;
  let assertMember: Mocked<AssertRequesterIsGroupMemberService>;
  let eventBus: Mocked<EventBus>;
  let handler: GenerateInvitationCodeHandler;

  beforeEach(() => {
    repository = {
      findActiveByGroupId: vi.fn().mockResolvedValue(null),
      save: vi.fn(),
    } as unknown as Mocked<GroupInvitationCodeWriteRepository>;
    generator = { generate: vi.fn().mockReturnValue('7KQ2M9XZ') };
    assertMember = {
      execute: vi.fn(),
    } as unknown as Mocked<AssertRequesterIsGroupMemberService>;
    eventBus = { publishAll: vi.fn() } as unknown as Mocked<EventBus>;
    handler = new GenerateInvitationCodeHandler(
      repository,
      generator,
      assertMember,
      eventBus,
    );
  });

  it('creates and saves a code for a member when the group has none', async () => {
    const code = await handler.execute(
      new GenerateInvitationCodeCommand({
        groupId: GROUP_ID,
        requesterId: 'user_a',
      }),
    );

    expect(code).toBe('7KQ2M9XZ');
    expect(assertMember.execute).toHaveBeenCalledWith(GROUP_ID, 'user_a');
    const saved = repository.save.mock
      .calls[0][0] as GroupInvitationCodeAggregate;
    expect(saved.toPrimitives()).toMatchObject({
      groupId: GROUP_ID,
      code: '7KQ2M9XZ',
      createdBy: 'user_a',
      revokedAt: null,
    });
    expect(eventBus.publishAll).toHaveBeenCalledTimes(1);
  });

  it('reuses the active code instead of creating another', async () => {
    repository.findActiveByGroupId.mockResolvedValue(
      new GroupInvitationCodeBuilder()
        .withId('0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11')
        .withGroupId(GROUP_ID)
        .withCode('ABCD2345')
        .withCreatedBy('user_b')
        .build(),
    );

    const code = await handler.execute(
      new GenerateInvitationCodeCommand({
        groupId: GROUP_ID,
        requesterId: 'user_a',
      }),
    );

    expect(code).toBe('ABCD2345');
    expect(repository.save).not.toHaveBeenCalled();
    expect(generator.generate).not.toHaveBeenCalled();
    expect(eventBus.publishAll).not.toHaveBeenCalled();
  });

  it('denies a non-member before touching the repository', async () => {
    assertMember.execute.mockRejectedValue(
      new GroupInvitationAccessDeniedException('stranger', GROUP_ID),
    );

    await expect(
      handler.execute(
        new GenerateInvitationCodeCommand({
          groupId: GROUP_ID,
          requesterId: 'stranger',
        }),
      ),
    ).rejects.toThrow(GroupInvitationAccessDeniedException);
    expect(repository.findActiveByGroupId).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });
});
