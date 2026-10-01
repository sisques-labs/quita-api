# Group Invitation Codes Specification

## Purpose

Generation and validation of shareable codes that grant group access.

## Requirements

### Requirement: Generate code

A member MUST be able to generate a shareable code for their group. Codes MUST be unique and unguessable. Non-members MUST NOT generate codes. A code is reusable (not single-use) and never expires; it stays valid until regenerated. Regenerating MUST invalidate the previous code.

#### Scenario: Generate
- GIVEN member A of G
- WHEN A requests a code
- THEN a unique code bound to G is returned

#### Scenario: Reuse
- GIVEN a valid code for G
- WHEN two different users validate and use it
- THEN both resolve to G

#### Scenario: Regenerate
- GIVEN G has code C1
- WHEN member A regenerates the code
- THEN a new code C2 is returned and C1 is invalidated

#### Scenario: Old code after regeneration
- GIVEN C1 was replaced by C2
- WHEN C1 is validated or used
- THEN it is reported invalid

#### Scenario: Non-member
- GIVEN N is not a member of G
- WHEN N requests a code for G
- THEN access is denied

### Requirement: Validate code

The system MUST resolve a code to its group and reject unknown or invalidated codes.

#### Scenario: Unknown code
- GIVEN a code that does not exist
- WHEN it is validated
- THEN it is reported invalid
