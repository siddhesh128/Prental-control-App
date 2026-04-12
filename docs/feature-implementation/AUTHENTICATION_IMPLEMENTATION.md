# Authentication Implementation

## Purpose

Explains how sign-in, sign-up, guest mode, and role mode switching are implemented.

## Primary source files

- `app/(auth)/login.tsx`
- `app/(auth)/register.tsx`
- `app/services/auth.service.ts`
- `app/services/google-auth.service.ts`
- `app/(parent)/_layout.tsx`
- `app/(child)/_layout.tsx`
- `app/store/slices/authSlice.ts`
- `app/store/slices/deviceSlice.ts`

## Authentication paths

### Email/password

- Login: `AuthService.signIn(email, password)` -> Firebase Auth `signInWithEmailAndPassword`.
- Register: `AuthService.signUp(email, password)` -> Firebase Auth `createUserWithEmailAndPassword`.

### Guest mode

- `AuthService.signInAsGuest()` returns local in-memory guest object.
- Guest mode is only exposed for parent flow in current UI.

### Google sign-in

- `GoogleAuthService` is scaffolded but currently disabled.
- Calls return `null` and log status; no active OAuth token flow.

## Role selection and routing

- Login/Register screens toggle between Parent and Child mode.
- Selected mode updates Redux via `setIsChild(...)`.
- Routing:
  - Parent mode -> `/(parent)`
  - Child mode -> `/(child)/dashboard`
- Route protection:
  - Parent layout blocks when `isChild === true`
  - Child layout blocks when `isChild === false`

## Persistence model

- Firebase Auth state persists through React Native auth persistence.
- Role mode is Redux state, not auth claim.
- On cold start, role state initialization depends on app state flow, not backend role resolution.

## Current state

- Email/password auth works.
- Guest parent mode works (local user object).
- Google sign-in is intentionally not wired yet.
- Role enforcement is client-state based; backend claims/roles are not enforced in this layer.
