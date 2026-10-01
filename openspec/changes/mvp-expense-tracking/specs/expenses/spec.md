# Expenses Specification

## Purpose

Shared expense lifecycle with split rules, soft delete and history.

## Requirements

### Requirement: Create expense

A member MUST create an expense with amount (positive integer EUR cents), payer (a group member) and date. Description, category and split are optional. Split is `EQUAL` (default, 50/50) or `OTHER_OWES_ALL` (non-payer owes 100%). Category, when given, MUST be one of: food, home, transport, leisure, health, travel, shopping, bills, other.

#### Scenario: Defaults
- GIVEN member A of G
- WHEN A creates an expense with amount, payer and date only
- THEN the split is `EQUAL` and no category is set

#### Scenario: Valid category
- GIVEN member A of G
- WHEN A creates an expense with category `food`
- THEN the expense is stored with category `food`

#### Scenario: Invalid category
- GIVEN member A of G
- WHEN A creates an expense with category `pets`
- THEN the request is rejected

#### Scenario: Invalid input
- GIVEN member A
- WHEN amount is missing, zero, negative or non-integer, or payer is not a member
- THEN the request is rejected

### Requirement: Edit expense

Any member of the group MUST be able to edit any active expense of that group, regardless of who created it. A category change MUST satisfy the category list.

#### Scenario: Edit by another member
- GIVEN an active expense created by A in G, and member B of G
- WHEN B changes its amount
- THEN the new amount is persisted

#### Scenario: Non-member edit
- GIVEN N is not in G
- WHEN N edits an expense of G
- THEN access is denied

### Requirement: Soft delete

Any member of the group MUST be able to soft-delete any active expense. Deleting MUST mark the expense deleted, not remove it. Deleted expenses MUST NOT be editable.

#### Scenario: Delete by another member
- GIVEN an active expense created by A in G, and member B of G
- WHEN B deletes it
- THEN it remains in history flagged deleted

#### Scenario: Edit deleted
- GIVEN a deleted expense
- WHEN a member edits it
- THEN the request is rejected

### Requirement: Date not in the future

An expense date MUST be today or in the past, on create and on edit. Future dates MUST be rejected.

#### Scenario: Past date accepted
- GIVEN member A of G
- WHEN A creates an expense dated yesterday
- THEN the expense is stored

#### Scenario: Today accepted
- GIVEN member A of G
- WHEN A creates an expense dated today
- THEN the expense is stored

#### Scenario: Future date rejected
- GIVEN member A of G
- WHEN A creates an expense dated tomorrow
- THEN the request is rejected

#### Scenario: Future date rejected on edit
- GIVEN an active expense
- WHEN a member changes its date to a future date
- THEN the request is rejected and the date is unchanged

### Requirement: History and isolation

Members MUST list a group's expenses, including soft-deleted ones flagged as deleted, ordered by date. Non-members MUST be denied; expenses MUST NOT leak across groups.

#### Scenario: List with deleted
- GIVEN G has an active expense dated D2 and a deleted expense dated D1 (D1 before D2)
- WHEN a member lists G's expenses
- THEN both are returned ordered by date, the deleted one flagged deleted

#### Scenario: Non-member
- GIVEN N is not in G
- WHEN N lists or creates expenses in G
- THEN access is denied
