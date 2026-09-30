import { GroupInvitationCodesModule } from '@contexts/group-invitation-codes/group-invitation-codes.module';
import { GroupMembersModule } from '@contexts/group-members/group-members.module';
import { GroupsModule } from '@contexts/groups/groups.module';
import { DynamicModule, Module, Type } from '@nestjs/common';

// Register every bounded context module here as it's added.
const CONTEXT_MODULES: (DynamicModule | Type<unknown>)[] = [
  GroupMembersModule,
  GroupsModule,
  GroupInvitationCodesModule,
];

@Module({
  imports: [...CONTEXT_MODULES],
})
export class ContextsModule {}
