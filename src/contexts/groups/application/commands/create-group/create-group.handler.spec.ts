import { CreateGroupCommand } from '@contexts/groups/application/commands/create-group/create-group.command';
import { CreateGroupHandler } from '@contexts/groups/application/commands/create-group/create-group.handler';
import { DeleteGroupCommand } from '@contexts/groups/application/commands/delete-group/delete-group.command';
import { GroupMembershipPort } from '@contexts/groups/application/ports/group-membership.port';
import { GroupAggregate } from '@contexts/groups/domain/aggregates/group.aggregate';
import { IGroupWriteRepository } from '@contexts/groups/domain/repositories/write/group-write.repository';
import { CommandBus, EventBus } from '@nestjs/cqrs';
import { Mocked } from 'vitest';

describe('CreateGroupHandler', () => {
  let repository: Mocked<IGroupWriteRepository>;
  let membershipPort: Mocked<GroupMembershipPort>;
  let commandBus: Mocked<CommandBus>;
  let eventBus: Mocked<EventBus>;
  let handler: CreateGroupHandler;

  beforeEach(() => {
    repository = {
      save: vi.fn(),
    } as unknown as Mocked<IGroupWriteRepository>;
    membershipPort = {
      createMembership: vi.fn(),
    } as unknown as Mocked<GroupMembershipPort>;
    commandBus = {
      execute: vi.fn(),
    } as unknown as Mocked<CommandBus>;
    eventBus = { publishAll: vi.fn() } as unknown as Mocked<EventBus>;
    handler = new CreateGroupHandler(
      repository,
      membershipPort,
      commandBus,
      eventBus,
    );
  });

  it('saves the group, makes the creator a member and publishes the event', async () => {
    const groupId = await handler.execute(
      new CreateGroupCommand({ name: 'Home', ownerId: 'user_owner' }),
    );

    const saved = repository.save.mock.calls[0][0] as GroupAggregate;
    expect(saved.toPrimitives()).toMatchObject({
      id: groupId,
      name: 'Home',
      createdBy: 'user_owner',
    });
    expect(membershipPort.createMembership).toHaveBeenCalledWith(
      groupId,
      'user_owner',
    );
    expect(eventBus.publishAll).toHaveBeenCalledTimes(1);
    expect(commandBus.execute).not.toHaveBeenCalled();
  });

  it('generates a different group id on every call', async () => {
    const first = await handler.execute(
      new CreateGroupCommand({ name: 'Home', ownerId: 'user_owner' }),
    );
    const second = await handler.execute(
      new CreateGroupCommand({ name: 'Home', ownerId: 'user_owner' }),
    );

    expect(first).not.toBe(second);
  });

  it('deletes the group and rethrows when the membership cannot be created', async () => {
    const failure = new Error('membership unavailable');
    membershipPort.createMembership.mockRejectedValue(failure);

    await expect(
      handler.execute(
        new CreateGroupCommand({ name: 'Home', ownerId: 'user_owner' }),
      ),
    ).rejects.toBe(failure);

    const saved = repository.save.mock.calls[0][0] as GroupAggregate;
    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.any(DeleteGroupCommand),
    );
    expect(
      (commandBus.execute.mock.calls[0][0] as DeleteGroupCommand).groupId.value,
    ).toBe(saved.id.value);
    expect(eventBus.publishAll).not.toHaveBeenCalled();
  });

  it('still rethrows the original failure when the compensation fails', async () => {
    const failure = new Error('membership unavailable');
    membershipPort.createMembership.mockRejectedValue(failure);
    commandBus.execute.mockRejectedValue(new Error('delete failed'));

    await expect(
      handler.execute(
        new CreateGroupCommand({ name: 'Home', ownerId: 'user_owner' }),
      ),
    ).rejects.toBe(failure);
    expect(commandBus.execute).toHaveBeenCalledTimes(1);
  });

  it('rejects a missing name at command construction, before any write', () => {
    expect(
      () => new CreateGroupCommand({ name: '', ownerId: 'user_owner' }),
    ).toThrow();
    expect(
      () => new CreateGroupCommand({ name: '   ', ownerId: 'user_owner' }),
    ).toThrow();
    expect(repository.save).not.toHaveBeenCalled();
  });
});
