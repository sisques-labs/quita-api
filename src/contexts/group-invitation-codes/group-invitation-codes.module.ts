import { GenerateInvitationCodeHandler } from '@contexts/group-invitation-codes/application/commands/generate-invitation-code/generate-invitation-code.handler';
import { RedeemInvitationCodeHandler } from '@contexts/group-invitation-codes/application/commands/redeem-invitation-code/redeem-invitation-code.handler';
import { RegenerateInvitationCodeHandler } from '@contexts/group-invitation-codes/application/commands/regenerate-invitation-code/regenerate-invitation-code.handler';
import { GROUP_MEMBERS_PORT } from '@contexts/group-invitation-codes/application/ports/group-members.port';
import { INVITATION_CODE_GENERATOR } from '@contexts/group-invitation-codes/application/ports/invitation-code-generator.port';
import { InvitationCodeValidateHandler } from '@contexts/group-invitation-codes/application/queries/invitation-code-validate/invitation-code-validate.handler';
import { AssertActiveInvitationCodeExistsService } from '@contexts/group-invitation-codes/application/services/read/assert-active-invitation-code-exists.service';
import { AssertRequesterIsGroupMemberService } from '@contexts/group-invitation-codes/application/services/read/assert-requester-is-group-member.service';
import { GroupInvitationCodeBuilder } from '@contexts/group-invitation-codes/domain/builders/group-invitation-code.builder';
import { GROUP_INVITATION_CODE_READ_REPOSITORY } from '@contexts/group-invitation-codes/domain/repositories/read/group-invitation-code-read.repository';
import { GROUP_INVITATION_CODE_WRITE_REPOSITORY } from '@contexts/group-invitation-codes/domain/repositories/write/group-invitation-code-write.repository';
import { GroupMembersBusAdapter } from '@contexts/group-invitation-codes/infrastructure/adapters/group-members-bus.adapter';
import { CryptoInvitationCodeGenerator } from '@contexts/group-invitation-codes/infrastructure/generators/crypto-invitation-code.generator';
import { GroupInvitationCodeEntity } from '@contexts/group-invitation-codes/infrastructure/persistence/typeorm/entities/group-invitation-code.entity';
import { GroupInvitationCodeTypeormMapper } from '@contexts/group-invitation-codes/infrastructure/persistence/typeorm/mappers/group-invitation-code-typeorm.mapper';
import { GroupInvitationCodeTypeormReadRepository } from '@contexts/group-invitation-codes/infrastructure/persistence/typeorm/repositories/group-invitation-code-typeorm-read.repository';
import { GroupInvitationCodeTypeormWriteRepository } from '@contexts/group-invitation-codes/infrastructure/persistence/typeorm/repositories/group-invitation-code-typeorm-write.repository';
import { GroupInvitationCodesResolver } from '@contexts/group-invitation-codes/transport/graphql/resolvers/group-invitation-codes.resolver';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

const COMMAND_HANDLERS = [
  GenerateInvitationCodeHandler,
  RegenerateInvitationCodeHandler,
  RedeemInvitationCodeHandler,
];

const QUERY_HANDLERS = [InvitationCodeValidateHandler];

const APPLICATION_SERVICES = [
  AssertActiveInvitationCodeExistsService,
  AssertRequesterIsGroupMemberService,
];

const DOMAIN_BUILDERS = [GroupInvitationCodeBuilder];

const INFRASTRUCTURE_ENTITIES = [GroupInvitationCodeEntity];

const INFRASTRUCTURE_MAPPERS = [GroupInvitationCodeTypeormMapper];

const INFRASTRUCTURE_REPOSITORIES = [
  {
    provide: GROUP_INVITATION_CODE_WRITE_REPOSITORY,
    useClass: GroupInvitationCodeTypeormWriteRepository,
  },
  {
    provide: GROUP_INVITATION_CODE_READ_REPOSITORY,
    useClass: GroupInvitationCodeTypeormReadRepository,
  },
];

const INFRASTRUCTURE_ADAPTERS = [
  { provide: GROUP_MEMBERS_PORT, useClass: GroupMembersBusAdapter },
  {
    provide: INVITATION_CODE_GENERATOR,
    useClass: CryptoInvitationCodeGenerator,
  },
];

const TRANSPORT_PROVIDERS = [GroupInvitationCodesResolver];

/**
 * Reaches group-members only through the bus (see `GroupMembersBusAdapter`),
 * so it does not import that module: both are registered in `ContextsModule`.
 */
@Module({
  imports: [CqrsModule, TypeOrmModule.forFeature(INFRASTRUCTURE_ENTITIES)],
  providers: [
    ...COMMAND_HANDLERS,
    ...QUERY_HANDLERS,
    ...APPLICATION_SERVICES,
    ...DOMAIN_BUILDERS,
    ...INFRASTRUCTURE_MAPPERS,
    ...INFRASTRUCTURE_REPOSITORIES,
    ...INFRASTRUCTURE_ADAPTERS,
    ...TRANSPORT_PROVIDERS,
  ],
})
export class GroupInvitationCodesModule {}
