# Payments Specification

## Purpose

Settlement payments between group members.

## Requirements

### Requirement: Create payment

A member MUST record a payment with amount (positive integer EUR cents), from-member, to-member (distinct group members) and date.

#### Scenario: Create
- GIVEN members A and B of G
- WHEN A records a payment to B of 1000 cents
- THEN the payment is stored

#### Scenario: Invalid
- GIVEN member A
- WHEN from equals to, amount is not positive, or a party is not a member
- THEN the request is rejected

### Requirement: Edit and soft delete

Any member of the group MUST be able to edit or soft-delete any active payment of that group, regardless of who recorded it. Deleted payments MUST remain in history and MUST NOT be editable.

#### Scenario: Edit by another member
- GIVEN an active payment recorded by A in G, and member B of G
- WHEN B changes its amount
- THEN the new amount is persisted

#### Scenario: Delete by another member
- GIVEN an active payment recorded by A in G, and member B of G
- WHEN B deletes it
- THEN it stays in history flagged deleted

#### Scenario: Non-member
- GIVEN N is not in G
- WHEN N edits or deletes a payment of G
- THEN access is denied

### Requirement: Date not in the future

A payment date MUST be today or in the past, on create and on edit. Future dates MUST be rejected.

#### Scenario: Past date accepted
- GIVEN members A and B of G
- WHEN A records a payment to B dated yesterday
- THEN the payment is stored

#### Scenario: Today accepted
- GIVEN members A and B of G
- WHEN A records a payment to B dated today
- THEN the payment is stored

#### Scenario: Future date rejected
- GIVEN members A and B of G
- WHEN A records a payment to B dated tomorrow
- THEN the request is rejected

#### Scenario: Future date rejected on edit
- GIVEN an active payment
- WHEN a member changes its date to a future date
- THEN the request is rejected and the date is unchanged

### Requirement: History and isolation

Members MUST list a group's payments, including soft-deleted ones flagged as deleted, ordered by date. Non-members MUST be denied; payments MUST NOT leak across groups.

#### Scenario: List with deleted
- GIVEN G has an active payment dated D2 and a deleted payment dated D1 (D1 before D2)
- WHEN a member lists G's payments
- THEN both are returned ordered by date, the deleted one flagged deleted

#### Scenario: Non-member
- GIVEN N is not in G
- WHEN N lists payments of G
- THEN access is denied
