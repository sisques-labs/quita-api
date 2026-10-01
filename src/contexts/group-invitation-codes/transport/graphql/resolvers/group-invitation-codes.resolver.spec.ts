import { GenerateInvitationCodeCommand } from '@contexts/group-invitation-codes/application/commands/generate-invitation-code/generate-invitation-code.command';
import { RedeemInvitationCodeCommand } from '@contexts/group-invitation-codes/application/commands/redeem-invitation-code/redeem-invitation-code.command';
import { RegenerateInvitationCodeCommand } from '@contexts/group-invitation-codes/application/commands/regenerate-invitation-code/regenerate-invitation-code.command';
import { InvitationCodeInvalidException } from '@contexts/group-invitation-codes/domain/exceptions/invitation-code-invalid.exception';
import { GroupInvitationCodesResolver } from '@contexts/group-invitation-codes/transport/graphql/resolvers/group-invitation-codes.resolver';
import { CommandBus } from '@nestjs/cqrs';
import { MutationResponseGraphQLMapper } from '@sisques-labs/nestjs-kit/graphql';
import { Mocked } from 'vitest';

const GROUP_ID = '5d1c8f0a-3f55-4b6a-8a27-3a8d3b0d7e22';

describe('GroupInvitationCodesResolver', () => {
  let commandBus: Mocked<CommandBus>;
  let resolver: GroupInvitationCodesResolver;

  beforeEach(() => {
    commandBus = { execute: vi.fn() } as unknown as Mocked<CommandBus>;
    resolver = new GroupInvitationCodesResolver(
      commandBus,
      new MutationResponseGraphQLMapper(),
    );
  });

  it('generates a code on behalf of the authenticated user', async () => {
    commandBus.execute.mockResolvedValue('7KQ2M9XZ');

    const result = await resolver.generateInvitationCode(
      { groupId: GROUP_ID },
      { userId: 'user_a' },
    );

    const command = commandBus.execute.mock
      .calls[0][0] as GenerateInvitationCodeCommand;
    expect(command).toBeInstanceOf(GenerateInvitationCodeCommand);
    expect(command.groupId.value).toBe(GROUP_ID);
    expect(command.requesterId.value).toBe('user_a');
    expect(result).toEqual({ groupId: GROUP_ID, code: '7KQ2M9XZ' });
  });

  it('regenerates the code on behalf of the authenticated user', async () => {
    commandBus.execute.mockResolvedValue('ABCD2345');

    const result = await resolver.regenerateInvitationCode(
      { groupId: GROUP_ID },
      { userId: 'user_b' },
    );

    const command = commandBus.execute.mock
      .calls[0][0] as RegenerateInvitationCodeCommand;
    expect(command).toBeInstanceOf(RegenerateInvitationCodeCommand);
    expect(command.requesterId.value).toBe('user_b');
    expect(result).toEqual({ groupId: GROUP_ID, code: 'ABCD2345' });
  });

  it('redeems a code and answers with the joined group id', async () => {
    commandBus.execute.mockResolvedValue(GROUP_ID);

    const response = await resolver.redeemInvitationCode(
      { code: '7kq2m9xz' },
      { userId: 'user_c' },
    );

    const command = commandBus.execute.mock
      .calls[0][0] as RedeemInvitationCodeCommand;
    expect(command).toBeInstanceOf(RedeemInvitationCodeCommand);
    expect(command.code.value).toBe('7KQ2M9XZ');
    expect(command.requesterId.value).toBe('user_c');
    expect(response).toEqual({
      success: true,
      message: 'Joined the group successfully',
      id: GROUP_ID,
    });
  });

  it('propagates an invalid code error', async () => {
    commandBus.execute.mockRejectedValue(new InvitationCodeInvalidException());

    await expect(
      resolver.redeemInvitationCode({ code: '7KQ2M9XZ' }, { userId: 'u' }),
    ).rejects.toThrow(InvitationCodeInvalidException);
  });
});
