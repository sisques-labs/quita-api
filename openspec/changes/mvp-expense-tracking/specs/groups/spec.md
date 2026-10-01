# Groups Specification

## Purpose

Group lifecycle: a shared space that isolates expenses and payments.

## Requirements

### Requirement: Create group

An authenticated user MUST be able to create a group with a name. The creator MUST become a member of the group.

#### Scenario: Create
- GIVEN an authenticated user U
- WHEN U creates group "Home"
- THEN the group exists and U is a member

#### Scenario: Missing name
- GIVEN an authenticated user
- WHEN a group is created without a name
- THEN the request is rejected as invalid

### Requirement: Read group

Only members MUST be able to read a group; non-members MUST be denied.

#### Scenario: Non-member read
- GIVEN group G and a non-member N
- WHEN N reads G
- THEN access is denied

### Requirement: List own groups

A user MUST only see groups they belong to.

#### Scenario: List
- GIVEN U belongs to G1 but not G2
- WHEN U lists groups
- THEN only G1 is returned

### Requirement: Group creation compensation

When creating a group fails to establish the creator's membership, the group MUST NOT remain available, and the original failure MUST be reported to the client. Cleaning up the membership roster is best-effort: a failure of that cleanup MUST NOT change the outcome the client sees.

#### Scenario: Membership failure rolls the group back
- GIVEN an authenticated user U
- WHEN U creates group "Home" and establishing U's membership fails
- THEN the group does not remain available
- AND the request fails with the original membership failure

#### Scenario: Cleanup failure does not change the outcome
- GIVEN a group creation whose membership step failed
- WHEN the best-effort cleanup of the group's roster also fails after its bounded retries
- THEN the client still receives the original membership failure
- AND the group does not remain available
