import { PaymentAggregate } from '@contexts/payments/domain/aggregates/payment.aggregate';
import { IBaseWriteRepository } from '@sisques-labs/nestjs-kit';

export const PAYMENT_WRITE_REPOSITORY = Symbol('PAYMENT_WRITE_REPOSITORY');

export type PaymentWriteRepository = IBaseWriteRepository<PaymentAggregate>;
