# Balances Specification

## Purpose

Net balance (who owes whom) computed on read from active expenses and payments.

## Requirements

### Requirement: Compute balance

The system MUST compute the balance on read, persisting nothing, from active (non-deleted) expenses and payments only; soft-deleted records MUST be excluded. `EQUAL` splits the amount so the non-payer owes floor(amount/2) and the payer absorbs any odd cent; `OTHER_OWES_ALL` credits the full amount to the payer. A payment reduces the payer-side debt by its amount. Balance over time is out of scope.

#### Scenario: Equal split
- GIVEN A paid a 1000-cent `EQUAL` expense
- WHEN the balance is read
- THEN B owes A 500 cents

#### Scenario: Equal split odd cent
- GIVEN A paid a 10.01 EUR (1001-cent) `EQUAL` expense
- WHEN the balance is read
- THEN B owes A 5.00 EUR (500 cents) and A absorbs the extra cent

#### Scenario: Other owes all
- GIVEN A paid a 1000-cent `OTHER_OWES_ALL` expense
- WHEN the balance is read
- THEN B owes A 1000 cents

#### Scenario: Payment
- GIVEN B owes A 500 cents and B pays A 500
- WHEN the balance is read
- THEN nobody owes anything

#### Scenario: Deleted ignored
- GIVEN a deleted expense and a deleted payment
- WHEN the balance is read
- THEN neither contributes

### Requirement: Access control

Only members MUST read a group's balance.

#### Scenario: Non-member
- GIVEN N is not in G
- WHEN N reads G's balance
- THEN access is denied
