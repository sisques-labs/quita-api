import { GroupMembersModule } from '@contexts/group-members/group-members.module';
import { DynamicModule, Module, Type } from '@nestjs/common';

// Register every bounded context module here as it's added.
const CONTEXT_MODULES: (DynamicModule | Type<unknown>)[] = [GroupMembersModule];

@Module({
  imports: [...CONTEXT_MODULES],
})
export class ContextsModule {}
