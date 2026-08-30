# Firestore Security Specification

## 1. Data Invariants
- Each user profile `/users/{userId}` is owned exclusively by `request.auth.uid == userId`.
- Users cannot elevate their own role (`role` field immutable by standard users).
- Playlists `/users/{userId}/playlists/{playlistId}` belong strictly to `{userId}`.
- Favorites `/users/{userId}/favorites/{trackId}` belong strictly to `{userId}`.
- Timestamps must use valid server timestamps or strict format.
- Unauthenticated access and cross-user snooping are completely blocked.

## 2. The Dirty Dozen Payloads (Negative Tests)
1. **Unauthenticated Read User Profile**: Read `/users/user123` with `auth == null` -> DENIED
2. **Cross-User Profile Write**: Authenticated user A trying to write `/users/userB` -> DENIED
3. **Role Escalation Attack**: Authenticated user trying to set `role: "admin"` on profile create -> DENIED
4. **Oversized String Injection in Playlist Name**: Playlist name > 150 chars -> DENIED
5. **ID Poisoning Attack**: Path with special characters or > 128 chars -> DENIED
6. **Cross-User Playlist Modification**: User A updating User B's playlist -> DENIED
7. **Ghost Field Injection in Favorites**: Injecting unrecognized field in Favorite track -> DENIED
8. **Negative / NaN Duration in Favorite**: Sending `duration: -50` -> DENIED
9. **Unauthenticated Favorite Track Addition**: Non-authenticated write -> DENIED
10. **Cross-User Playlist Deletion**: User A deleting User B's playlist -> DENIED
11. **Blanket Query Scraping**: Attempting to query all playlists without `userId` scoping -> DENIED
12. **Missing Required Fields**: Attempting to create playlist without `name` or `userId` -> DENIED
