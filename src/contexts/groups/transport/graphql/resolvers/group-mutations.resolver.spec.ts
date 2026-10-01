import { CreateGroupCommand } from '@contexts/groups/application/commands/create-group/create-group.command';
import { GroupMutationsResolver } from '@contexts/groups/transport/graphql/resolvers/group-mutations.resolver';
import { CommandBus } from '@nestjs/cqrs';
import { MutationResponseGraphQLMapper } from '@sisques-labs/nestjs-kit/graphql';
import { Mocked } from 'vitest';

const GROUP_ID = '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11';

describe('GroupMutationsResolver', () => {
  let commandBus: Mocked<CommandBus>;
  let resolver: GroupMutationsResolver;

  beforeEach(() => {
    commandBus = { execute: vi.fn() } as unknown as Mocked<CommandBus>;
    resolver = new GroupMutationsResolver(
      commandBus,
      new MutationResponseGraphQLMapper(),
    );
  });

  it('creates a group owned by the authenticated user, never by input', async () => {
    commandBus.execute.mockResolvedValue(GROUP_ID);

    const response = await resolver.createGroup(
      { name: 'Home' },
      { userId: 'A' },
    );

    const command = commandBus.execute.mock.calls[0][0] as CreateGroupCommand;
    expect(command).toBeInstanceOf(CreateGroupCommand);
    expect(command.name.value).toBe('Home');
    expect(command.ownerId.value).toBe('A');
    expect(response).toEqual({
      success: true,
      message: 'Group created successfully',
      id: GROUP_ID,
    });
  });
});
