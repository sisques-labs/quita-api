import { CreateExpenseCommand } from '@contexts/expenses/application/commands/create-expense/create-expense.command';
import { DeleteExpenseCommand } from '@contexts/expenses/application/commands/delete-expense/delete-expense.command';
import { EditExpenseCommand } from '@contexts/expenses/application/commands/edit-expense/edit-expense.command';
import { ExpenseCreateRequestDto } from '@contexts/expenses/transport/graphql/dtos/requests/expense-create.request.dto';
import { ExpenseDeleteRequestDto } from '@contexts/expenses/transport/graphql/dtos/requests/expense-delete.request.dto';
import { ExpenseEditRequestDto } from '@contexts/expenses/transport/graphql/dtos/requests/expense-edit.request.dto';
import { AuthUser } from '@core/auth/infrastructure/clerk/auth-user.decorator';
import { ClerkAuthGuard } from '@core/auth/infrastructure/clerk/clerk-auth.guard';
import { Logger, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import {
  MutationResponseDto,
  MutationResponseGraphQLMapper,
} from '@sisques-labs/nestjs-kit/graphql';

@Resolver()
@UseGuards(ClerkAuthGuard)
export class ExpenseMutationsResolver {
  private readonly logger = new Logger(ExpenseMutationsResolver.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly mutationResponseMapper: MutationResponseGraphQLMapper,
  ) {}

  @Mutation(() => MutationResponseDto, {
    name: 'createExpense',
    description: 'Records an expense in a group the caller belongs to.',
  })
  async createExpense(
    @Args('input') input: ExpenseCreateRequestDto,
    @AuthUser() user: AuthUser,
  ): Promise<MutationResponseDto> {
    this.logger.log(
      `createExpense group=${input.groupId} requester=${user.userId}`,
    );

    const id = await this.commandBus.execute<CreateExpenseCommand, string>(
      new CreateExpenseCommand({
        groupId: input.groupId,
        requesterId: user.userId,
        amountCents: input.amountCents,
        paidBy: input.paidBy,
        spentOn: input.spentOn,
        description: input.description,
        category: input.category,
        splitType: input.splitType,
      }),
    );

    return this.mutationResponseMapper.toResponseDto({
      success: true,
      message: 'Expense created successfully',
      id,
    });
  }

  @Mutation(() => MutationResponseDto, {
    name: 'editExpense',
    description: 'Edits an active expense; any member of the group may do so.',
  })
  async editExpense(
    @Args('input') input: ExpenseEditRequestDto,
    @AuthUser() user: AuthUser,
  ): Promise<MutationResponseDto> {
    this.logger.log(
      `editExpense expense=${input.expenseId} requester=${user.userId}`,
    );

    const id = await this.commandBus.execute<EditExpenseCommand, string>(
      new EditExpenseCommand({
        expenseId: input.expenseId,
        groupId: input.groupId,
        requesterId: user.userId,
        amountCents: input.amountCents,
        paidBy: input.paidBy,
        spentOn: input.spentOn,
        description: input.description,
        category: input.category,
        splitType: input.splitType,
      }),
    );

    return this.mutationResponseMapper.toResponseDto({
      success: true,
      message: 'Expense edited successfully',
      id,
    });
  }

  @Mutation(() => MutationResponseDto, {
    name: 'deleteExpense',
    description:
      'Soft-deletes an active expense; any member of the group may do so.',
  })
  async deleteExpense(
    @Args('input') input: ExpenseDeleteRequestDto,
    @AuthUser() user: AuthUser,
  ): Promise<MutationResponseDto> {
    this.logger.log(
      `deleteExpense expense=${input.expenseId} requester=${user.userId}`,
    );

    const id = await this.commandBus.execute<DeleteExpenseCommand, string>(
      new DeleteExpenseCommand({
        expenseId: input.expenseId,
        groupId: input.groupId,
        requesterId: user.userId,
      }),
    );

    return this.mutationResponseMapper.toResponseDto({
      success: true,
      message: 'Expense deleted successfully',
      id,
    });
  }
}
