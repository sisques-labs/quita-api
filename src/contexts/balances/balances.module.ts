import { EXPENSES_PORT } from '@contexts/balances/application/ports/expenses.port';
import { GROUP_MEMBERS_PORT } from '@contexts/balances/application/ports/group-members.port';
import { PAYMENTS_PORT } from '@contexts/balances/application/ports/payments.port';
import { GroupBalanceHandler } from '@contexts/balances/application/queries/group-balance/group-balance.handler';
import { AssertRequesterIsGroupMemberService } from '@contexts/balances/application/services/read/assert-requester-is-group-member/assert-requester-is-group-member.service';
import { GroupBalanceCalculator } from '@contexts/balances/domain/services/group-balance/group-balance.service';
import { ExpensesBusAdapter } from '@contexts/balances/infrastructure/adapters/expenses-bus.adapter';
import { GroupMembersBusAdapter } from '@contexts/balances/infrastructure/adapters/group-members-bus.adapter';
import { PaymentsBusAdapter } from '@contexts/balances/infrastructure/adapters/payments-bus.adapter';
import { GroupBalanceGraphQLMapper } from '@contexts/balances/transport/graphql/mappers/group-balance-graphql.mapper';
import { BalanceQueriesResolver } from '@contexts/balances/transport/graphql/resolvers/balance-queries.resolver';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

const QUERY_HANDLERS = [GroupBalanceHandler];

const APPLICATION_SERVICES = [AssertRequesterIsGroupMemberService];

const DOMAIN_SERVICES = [GroupBalanceCalculator];

const INFRASTRUCTURE_ADAPTERS = [
  { provide: GROUP_MEMBERS_PORT, useClass: GroupMembersBusAdapter },
  { provide: EXPENSES_PORT, useClass: ExpensesBusAdapter },
  { provide: PAYMENTS_PORT, useClass: PaymentsBusAdapter },
];

const TRANSPORT_PROVIDERS = [BalanceQueriesResolver, GroupBalanceGraphQLMapper];

/**
 * Owns no tables. It reaches group-members, expenses and payments only through
 * the bus (see the adapters), so it does not import their modules: all of them
 * are registered in `ContextsModule` and share the CQRS buses.
 */
@Module({
  imports: [CqrsModule],
  providers: [
    ...QUERY_HANDLERS,
    ...APPLICATION_SERVICES,
    ...DOMAIN_SERVICES,
    ...INFRASTRUCTURE_ADAPTERS,
    ...TRANSPORT_PROVIDERS,
  ],
})
export class BalancesModule {}
