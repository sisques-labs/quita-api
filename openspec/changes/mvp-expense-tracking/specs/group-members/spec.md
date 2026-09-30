# Group Members Specification

## Purpose

Membership, member limit and membership checks.

## Requirements

### Requirement: Member limit

A group MUST NOT exceed its member limit (2 in the MVP). The limit SHOULD be changeable without altering the behavior of other capabilities.

#### Scenario: Third member rejected
- GIVEN a group with 2 members
- WHEN a third user tries to join
- THEN the join is rejected and membership is unchanged

### Requirement: Join by code

An authenticated user MUST be able to join a group by presenting a valid invitation code.

#### Scenario: Join
- GIVEN a group with 1 member and a valid code
- WHEN user B joins with the code
- THEN B becomes a member

#### Scenario: Invalid code
- GIVEN an unknown or invalid code
- WHEN a user joins with it
- THEN the join is rejected

#### Scenario: Already a member
- GIVEN B is already a member
- WHEN B joins again with a valid code
- THEN no duplicate membership is created

### Requirement: Membership check

The system MUST be able to answer whether a user is a member of a group; every group-scoped operation MUST require membership.

#### Scenario: Non-member
- GIVEN N is not a member of G
- WHEN N performs any group-scoped operation on G
- THEN access is denied

### Requirement: List members

Members MUST be able to list the members of their group.

#### Scenario: List
- GIVEN G has members A and B
- WHEN A lists members
- THEN A and B are returned
