import { CreateGroupHandler } from '@contexts/groups/application/commands/create-group/create-group.handler';
import { DeleteGroupHandler } from '@contexts/groups/application/commands/delete-group/delete-group.handler';
import { GROUP_MEMBERSHIP_PORT } from '@contexts/groups/application/ports/group-membership.port';
import { GroupFindByIdHandler } from '@contexts/groups/application/queries/group-find-by-id/group-find-by-id.handler';
import { GroupsFindOwnHandler } from '@contexts/groups/application/queries/groups-find-own/groups-find-own.handler';
import { AssertGroupViewModelExistsService } from '@contexts/groups/application/services/read/assert-group-view-model-exists.service';
import { AssertRequesterIsGroupMemberService } from '@contexts/groups/application/services/read/assert-requester-is-group-member.service';
import { AssertGroupExistsService } from '@contexts/groups/application/services/write/assert-group-exists.service';
import { GROUP_READ_REPOSITORY } from '@contexts/groups/domain/repositories/read/group-read.repository';
import { GROUP_WRITE_REPOSITORY } from '@contexts/groups/domain/repositories/write/group-write.repository';
import { GroupMembershipBusAdapter } from '@contexts/groups/infrastructure/adapters/group-membership-bus.adapter';
import { GroupEntity } from '@contexts/groups/infrastructure/persistence/typeorm/entities/group.entity';
import { GroupTypeormMapper } from '@contexts/groups/infrastructure/persistence/typeorm/mappers/group-typeorm.mapper';
import { GroupTypeormReadRepository } from '@contexts/groups/infrastructure/persistence/typeorm/repositories/group-typeorm-read.repository';
import { GroupTypeormWriteRepository } from '@contexts/groups/infrastructure/persistence/typeorm/repositories/group-typeorm-write.repository';
import { GroupGraphQLMapper } from '@contexts/groups/transport/graphql/mappers/group-graphql.mapper';
import { GroupsResolver } from '@contexts/groups/transport/graphql/resolvers/groups.resolver';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

const COMMAND_HANDLERS = [CreateGroupHandler, DeleteGroupHandler];

const QUERY_HANDLERS = [GroupFindByIdHandler, GroupsFindOwnHandler];

const APPLICATION_SERVICES = [
  AssertGroupViewModelExistsService,
  AssertRequesterIsGroupMemberService,
  AssertGroupExistsService,
];

const INFRASTRUCTURE_ENTITIES = [GroupEntity];

const INFRASTRUCTURE_MAPPERS = [GroupTypeormMapper];

const INFRASTRUCTURE_REPOSITORIES = [
  {
    provide: GROUP_WRITE_REPOSITORY,
    useClass: GroupTypeormWriteRepository,
  },
  {
    provide: GROUP_READ_REPOSITORY,
    useClass: GroupTypeormReadRepository,
  },
];

const INFRASTRUCTURE_ADAPTERS = [
  { provide: GROUP_MEMBERSHIP_PORT, useClass: GroupMembershipBusAdapter },
];

const TRANSPORT_PROVIDERS = [GroupsResolver, GroupGraphQLMapper];

/**
 * Reaches group-members only through the bus (see `GroupMembershipBusAdapter`),
 * so it does not import that module: both are registered in `ContextsModule`.
 */
@Module({
  imports: [CqrsModule, TypeOrmModule.forFeature(INFRASTRUCTURE_ENTITIES)],
  providers: [
    ...COMMAND_HANDLERS,
    ...QUERY_HANDLERS,
    ...APPLICATION_SERVICES,
    ...INFRASTRUCTURE_MAPPERS,
    ...INFRASTRUCTURE_REPOSITORIES,
    ...INFRASTRUCTURE_ADAPTERS,
    ...TRANSPORT_PROVIDERS,
  ],
})
export class GroupsModule {}
