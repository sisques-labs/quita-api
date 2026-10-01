import { AddGroupMemberHandler } from '@contexts/group-members/application/commands/add-group-member/add-group-member.handler';
import { CreateGroupMembershipHandler } from '@contexts/group-members/application/commands/create-group-membership/create-group-membership.handler';
import { DeleteGroupMembershipHandler } from '@contexts/group-members/application/commands/delete-group-membership/delete-group-membership.handler';
import { GroupMemberIsMemberHandler } from '@contexts/group-members/application/queries/group-member-is-member/group-member-is-member.handler';
import { GroupMembersFindByGroupIdHandler } from '@contexts/group-members/application/queries/group-members-find-by-group-id/group-members-find-by-group-id.handler';
import { GroupMembersListHandler } from '@contexts/group-members/application/queries/group-members-list/group-members-list.handler';
import { GroupMembershipFindGroupIdsByUserHandler } from '@contexts/group-members/application/queries/group-membership-find-group-ids-by-user/group-membership-find-group-ids-by-user.handler';
import { AssertGroupMembershipViewModelExistsService } from '@contexts/group-members/application/services/read/assert-group-membership-view-model-exists/assert-group-membership-view-model-exists.service';
import { AssertGroupMembershipExistsService } from '@contexts/group-members/application/services/write/assert-group-membership-exists/assert-group-membership-exists.service';
import { AssertGroupMembershipNotExistsService } from '@contexts/group-members/application/services/write/assert-group-membership-not-exists/assert-group-membership-not-exists.service';
import { GROUP_MEMBERSHIP_READ_REPOSITORY } from '@contexts/group-members/domain/repositories/read/group-membership-read.repository';
import { GROUP_MEMBERSHIP_WRITE_REPOSITORY } from '@contexts/group-members/domain/repositories/write/group-membership-write.repository';
import { GroupMemberEntity } from '@contexts/group-members/infrastructure/persistence/typeorm/entities/group-member.entity';
import { GroupMembershipEntity } from '@contexts/group-members/infrastructure/persistence/typeorm/entities/group-membership.entity';
import { GroupMembershipTypeormMapper } from '@contexts/group-members/infrastructure/persistence/typeorm/mappers/group-membership-typeorm.mapper';
import { GroupMembershipTypeormReadRepository } from '@contexts/group-members/infrastructure/persistence/typeorm/repositories/group-membership-typeorm-read.repository';
import { GroupMembershipTypeormWriteRepository } from '@contexts/group-members/infrastructure/persistence/typeorm/repositories/group-membership-typeorm-write.repository';
import '@contexts/group-members/transport/graphql/enums/group-member-registered-enums.graphql';
import { GroupMemberGraphQLMapper } from '@contexts/group-members/transport/graphql/mappers/group-member-graphql.mapper';
import { GroupMemberQueriesResolver } from '@contexts/group-members/transport/graphql/resolvers/group-member-queries.resolver';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

const COMMAND_HANDLERS = [
  CreateGroupMembershipHandler,
  AddGroupMemberHandler,
  DeleteGroupMembershipHandler,
];

const QUERY_HANDLERS = [
  GroupMemberIsMemberHandler,
  GroupMembersFindByGroupIdHandler,
  GroupMembersListHandler,
  GroupMembershipFindGroupIdsByUserHandler,
];

const APPLICATION_SERVICES = [
  AssertGroupMembershipExistsService,
  AssertGroupMembershipNotExistsService,
  AssertGroupMembershipViewModelExistsService,
];

const INFRASTRUCTURE_ENTITIES = [GroupMembershipEntity, GroupMemberEntity];

const INFRASTRUCTURE_MAPPERS = [GroupMembershipTypeormMapper];

const INFRASTRUCTURE_REPOSITORIES = [
  {
    provide: GROUP_MEMBERSHIP_WRITE_REPOSITORY,
    useClass: GroupMembershipTypeormWriteRepository,
  },
  {
    provide: GROUP_MEMBERSHIP_READ_REPOSITORY,
    useClass: GroupMembershipTypeormReadRepository,
  },
];

const TRANSPORT_PROVIDERS = [
  GroupMemberQueriesResolver,
  GroupMemberGraphQLMapper,
];

/** Leaf context: owns rosters and answers membership checks; no outgoing ports. */
@Module({
  imports: [CqrsModule, TypeOrmModule.forFeature(INFRASTRUCTURE_ENTITIES)],
  providers: [
    ...COMMAND_HANDLERS,
    ...QUERY_HANDLERS,
    ...APPLICATION_SERVICES,
    ...INFRASTRUCTURE_MAPPERS,
    ...INFRASTRUCTURE_REPOSITORIES,
    ...TRANSPORT_PROVIDERS,
  ],
})
export class GroupMembersModule {}
