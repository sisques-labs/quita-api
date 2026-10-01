import { CreatePaymentHandler } from '@contexts/payments/application/commands/create-payment/create-payment.handler';
import { DeletePaymentHandler } from '@contexts/payments/application/commands/delete-payment/delete-payment.handler';
import { EditPaymentHandler } from '@contexts/payments/application/commands/edit-payment/edit-payment.handler';
import { GROUP_MEMBERS_PORT } from '@contexts/payments/application/ports/group-members.port';
import { PaymentsFindActiveByGroupHandler } from '@contexts/payments/application/queries/payments-find-active-by-group/payments-find-active-by-group.handler';
import { PaymentsFindByCriteriaHandler } from '@contexts/payments/application/queries/payments-find-by-criteria/payments-find-by-criteria.handler';
import { AssertRequesterIsGroupMemberService } from '@contexts/payments/application/services/read/assert-requester-is-group-member/assert-requester-is-group-member.service';
import { AssertPaymentExistsService } from '@contexts/payments/application/services/write/assert-payment-exists/assert-payment-exists.service';
import { PaymentBuilder } from '@contexts/payments/domain/builders/payment.builder';
import { PAYMENT_READ_REPOSITORY } from '@contexts/payments/domain/repositories/read/payment-read.repository';
import { PAYMENT_WRITE_REPOSITORY } from '@contexts/payments/domain/repositories/write/payment-write.repository';
import { GroupMembersBusAdapter } from '@contexts/payments/infrastructure/adapters/group-members-bus.adapter';
import { PaymentEntity } from '@contexts/payments/infrastructure/persistence/typeorm/entities/payment.entity';
import { PaymentTypeormMapper } from '@contexts/payments/infrastructure/persistence/typeorm/mappers/payment-typeorm.mapper';
import { PaymentTypeormReadRepository } from '@contexts/payments/infrastructure/persistence/typeorm/repositories/payment-typeorm-read.repository';
import { PaymentTypeormWriteRepository } from '@contexts/payments/infrastructure/persistence/typeorm/repositories/payment-typeorm-write.repository';
import '@contexts/payments/transport/graphql/enums/payments-registered-enums.graphql';
import { PaymentGraphQLMapper } from '@contexts/payments/transport/graphql/mappers/payment-graphql.mapper';
import { PaymentMutationsResolver } from '@contexts/payments/transport/graphql/resolvers/payment-mutations.resolver';
import { PaymentQueriesResolver } from '@contexts/payments/transport/graphql/resolvers/payment-queries.resolver';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

const COMMAND_HANDLERS = [
  CreatePaymentHandler,
  EditPaymentHandler,
  DeletePaymentHandler,
];

const QUERY_HANDLERS = [
  PaymentsFindByCriteriaHandler,
  PaymentsFindActiveByGroupHandler,
];

const APPLICATION_SERVICES = [
  AssertRequesterIsGroupMemberService,
  AssertPaymentExistsService,
];

const DOMAIN_BUILDERS = [PaymentBuilder];

const INFRASTRUCTURE_ENTITIES = [PaymentEntity];

const INFRASTRUCTURE_MAPPERS = [PaymentTypeormMapper];

const INFRASTRUCTURE_REPOSITORIES = [
  {
    provide: PAYMENT_WRITE_REPOSITORY,
    useClass: PaymentTypeormWriteRepository,
  },
  {
    provide: PAYMENT_READ_REPOSITORY,
    useClass: PaymentTypeormReadRepository,
  },
];

const INFRASTRUCTURE_ADAPTERS = [
  { provide: GROUP_MEMBERS_PORT, useClass: GroupMembersBusAdapter },
];

const TRANSPORT_PROVIDERS = [
  PaymentQueriesResolver,
  PaymentMutationsResolver,
  PaymentGraphQLMapper,
];

/**
 * Reaches group-members only through the bus (see `GroupMembersBusAdapter`),
 * so it does not import that module: both are registered in `ContextsModule`.
 * The `CLOCK` token comes from the global core `ClockModule`.
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
export class PaymentsModule {}
