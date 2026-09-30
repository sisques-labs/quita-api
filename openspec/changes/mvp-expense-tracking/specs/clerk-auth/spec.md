# Clerk Auth Specification

## Purpose

Authenticate API callers via Clerk tokens and expose the current user.

## Requirements

### Requirement: Token verification

The system MUST verify the bearer token signature (RS256, Clerk JWKS), issuer and expiry on every protected request. Invalid, expired or missing tokens MUST be rejected as unauthenticated.

#### Scenario: Valid token
- GIVEN a valid Clerk token
- WHEN a protected endpoint is called
- THEN the request proceeds

#### Scenario: Invalid token
- GIVEN a missing, expired, or wrongly signed token
- WHEN a protected endpoint is called
- THEN the request is rejected as unauthenticated

### Requirement: Current user resolution

The system MUST expose the Clerk user id (token subject) as the current user to handlers.

#### Scenario: Current user available
- GIVEN a valid token for user U
- WHEN a handler asks for the current user
- THEN it receives U's id
