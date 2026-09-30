import { ExpenseSplitType } from '@contexts/expenses/domain/enums/expense-split-type.enum';
import { EnumValueObject } from '@sisques-labs/nestjs-kit';

export class ExpenseSplitTypeValueObject extends EnumValueObject<
  typeof ExpenseSplitType
> {
  protected get enumObject(): typeof ExpenseSplitType {
    return ExpenseSplitType;
  }
}
