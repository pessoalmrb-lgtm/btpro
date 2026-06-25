# Firebase Security Specification

## Data Invariants
1. A user can only create and modify their own profile.
2. A ranking can only be created by a signed-in user, and they become the owner.
3. Only the owner or an admin of a ranking can modify its details or its sub-collections.
4. A tournament can only be created and managed by its creator (uid).
5. Immutable fields like `createdAt` and `uid`/`ownerId` must not change after creation.
6. A tournament linked to a ranking inherits read permissions for athletes of that ranking.

## The Dirty Dozen Payloads (Expect PERMISSION_DENIED)

1. **Identity Spoofing (User)**: Create a user profile with a different UID.
   ```json
   { "uid": "attacker_id", "email": "victim@example.com", "isPremium": true }
   ```
2. **Privilege Escalation (User)**: Update `isPremium` field by a non-admin user.
   ```json
   { "isPremium": true }
   ```
3. **Ghost Field Injection (Ranking)**: Update ranking with a field not in schema.
   ```json
   { "hacked": true }
   ```
4. **Ownership Takeover (Ranking)**: Update `ownerId` of a ranking to oneself.
   ```json
   { "ownerId": "attacker_uid" }
   ```
5. **Unauthorized Listing (Ranking)**: Attempting to list all rankings without filters if we had sensitive data (though rankings are mostly public, we'll restrict list queries).
6. **Orphaned Tournament**: Create tournament with a non-existent `rankingId`.
7. **Round Skip (Tournament)**: Update `currentRound` skipping values (integrity).
8. **Shadow Field (Tournament)**: Update `isHidden` on someone else's tournament.
9. **Creation Timestamp Spoof**: Providing a future `createdAt` date.
10. **ID Poisoning**: Using a 2KB string as a `tournamentId`.
11. **Admin Claim Spoof**: Attempting to set `admin` role in user document.
12. **Public PII Leak**: Reading `users` collection without `where` clause.

## Test Runner Logic

A testing suite would verify that all the above attempts fail for unauthorized users.
