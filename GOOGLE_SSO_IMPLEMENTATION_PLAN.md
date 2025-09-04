# Google SSO Implementation Plan
## Tournament Manager Authentication Enhancement

### Overview

This document outlines the plan to add Google Single Sign-On (SSO) authentication to the Tournament Manager application while maintaining the existing anonymous access functionality. The goal is to create a hybrid system that provides secure, cross-device access for users who want it, while preserving the current low-friction anonymous experience.

### Current State Analysis

**Existing Architecture:**
- **Authentication**: Device-based IDs stored in localStorage
- **Tournament Access**: Anyone with tournament ID can join as viewer
- **Admin Rights**: Tied to specific devices via `adminDeviceId`
- **Data Storage**: JSON files with device-based permissions
- **User Experience**: Zero-friction, no accounts required

**Current User Flow:**
1. User visits app → Auto-generates device ID
2. Creates tournament → Becomes admin on that device
3. Other users join via tournament ID → Get viewer role
4. Admin can promote viewers to scorers

**Limitations Being Addressed:**
- ❌ Lost access if device is lost/cleared
- ❌ No cross-device tournament access
- ❌ Potential tournament hijacking
- ❌ No persistent user identity

### Proposed Solution: Hybrid Anonymous + Google SSO

**Key Principle**: Additive enhancement, not replacement

#### Authentication Options
```
┌─────────────────────────────────────────────────────────┐
│  🎯 Tournament Manager                                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Choose how you want to use the app:                    │
│                                                         │
│  🔐 [Sign in with Google]                              │
│      ✅ Access tournaments from any device              │
│      ✅ Never lose tournament access                    │
│      ✅ Sync across phones/tablets/computers            │
│                                                         │
│  👤 [Continue Anonymously]                             │
│      ✅ No account required                            │
│      ✅ Start tournament immediately                    │
│      ⚠️ Only accessible on this device                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Technical Implementation Strategy

#### 1. User Identity System

**New User Identity Structure:**
```javascript
// Google-authenticated user
const userIdentity = {
  type: 'google',
  googleId: 'google-sub-123456',
  email: 'user@gmail.com', 
  name: 'John Smith',
  picture: 'https://lh3.googleusercontent.com/...',
  deviceIds: ['device-abc', 'device-def'], // Track user's devices
  createdAt: '2025-01-15T10:30:00Z',
  lastSeen: '2025-01-15T15:45:00Z'
}

// Anonymous user (current system)
const userIdentity = {
  type: 'anonymous',
  deviceId: 'device-xyz-789',
  createdAt: '2025-01-15T10:30:00Z'
}
```

#### 2. Tournament Ownership Model

**Enhanced Tournament Structure:**
```json
{
  "id": "tournament-uuid",
  "name": "Summer Tournament 2024",
  "owner": {
    "type": "google",
    "id": "google-sub-123456",
    "email": "admin@example.com",
    "name": "Tournament Admin"
  },
  "participants": [
    {
      "type": "google",
      "id": "google-sub-789012", 
      "role": "SCORER",
      "joinedAt": "2025-01-15T11:00:00Z"
    },
    {
      "type": "anonymous",
      "deviceId": "device-abc-123",
      "role": "VIEWER", 
      "joinedAt": "2025-01-15T11:30:00Z"
    }
  ],
  "settings": { /* existing structure */ },
  "teams": [ /* existing structure */ ],
  "schedule": [ /* existing structure */ ],
  // Backward compatibility
  "adminDeviceId": "device-legacy-admin", // Keep for migration
  "devices": [ /* existing structure */ ] // Keep for migration
}
```

#### 3. Data Storage Strategy

**New File Structure:**
```
server/data/
├── users/
│   ├── google-sub-123456.json          # Google user profile
│   ├── google-sub-789012.json          # Google user profile
│   └── anonymous-device-abc123.json    # Anonymous user (optional)
├── tournaments/
│   ├── tournament-uuid-1.json          # Tournament data (enhanced)
│   ├── tournament-uuid-2.json          # Tournament data (enhanced)
│   └── tournament-uuid-1-audit.json    # Audit logs (existing)
├── superuser-config.json               # Superuser access (existing)
└── google-oauth-config.json            # OAuth credentials (new)
```

#### 4. API Endpoints to Add

**Authentication Endpoints:**
```javascript
// OAuth flow
GET  /api/auth/google              // Initiate OAuth
GET  /api/auth/google/callback     // Handle OAuth callback  
POST /api/auth/google/verify       // Verify JWT token
POST /api/auth/logout              // Clear session

// User management
GET  /api/user/profile             // Get current user info
GET  /api/user/tournaments         // Get user's tournaments
POST /api/user/link-device         // Link new device to account

// Enhanced tournament endpoints
GET  /api/tournaments/my           // User's owned tournaments
GET  /api/tournaments/joined       // Tournaments user participates in
POST /api/tournament/:id/claim     // Claim anonymous tournament (maybe)
```

**Enhanced Existing Endpoints:**
```javascript
// Update these to handle both auth types
GET  /api/tournament/:id           // Check user's access level
POST /api/tournament/:id/join      // Join with Google or anonymous
POST /api/tournament/:id/role-request // Request role (enhanced)
```

### Frontend Implementation Plan

#### 1. Authentication Components

**New Components to Create:**
```
src/components/auth/
├── GoogleSignIn.jsx           # Google OAuth button
├── AuthProvider.jsx           # Authentication context
├── UserProfile.jsx            # User profile display
└── AuthGuard.jsx              # Protected route wrapper
```

**Enhanced Existing Components:**
```
src/components/
├── Home.jsx                   # Add auth options
├── TournamentList.jsx         # Filter by user's tournaments
├── tournament/
│   ├── TournamentView.jsx     # Show ownership info
│   └── DevicePermissions.jsx  # Handle mixed auth types
```

#### 2. State Management Changes

**Enhanced Zustand Stores:**
```javascript
// New auth store
const useAuthStore = create((set, get) => ({
  user: null,              // Current user (Google or anonymous)  
  isAuthenticated: false,  // Google authentication status
  loading: false,         
  
  signInWithGoogle: async () => { /* OAuth flow */ },
  signOut: async () => { /* Clear session */ },
  checkAuthStatus: async () => { /* Verify token */ }
}))

// Enhanced tournament store  
const useTournamentStore = create((set, get) => ({
  // Existing properties...
  userTournaments: [],     // Tournaments owned by current user
  joinedTournaments: [],   // Tournaments user participates in
  
  loadUserTournaments: async () => { /* Load user's tournaments */ },
  // Existing methods...
}))
```

#### 3. User Experience Flow

**Homepage Experience:**
```
Anonymous User:
┌─────────────────────────────┐
│ Recent Tournaments (Device) │
├─────────────────────────────┤
│ • Summer Party 2024         │
│ • Game Night Jan 15         │  
└─────────────────────────────┘

Google User:
┌─────────────────────────────┐
│ Welcome back, John! 👋      │
├─────────────────────────────┤
│ My Tournaments              │
│ • Summer Party 2024         │
│ • Company Tournament        │
│                             │
│ Recently Joined             │ 
│ • Friend's Game Night       │
└─────────────────────────────┘
```

**Tournament Creation:**
```
Google User:
"✅ This tournament will be saved to your Google account and accessible from any device"

Anonymous User: 
"⚠️ This tournament will only be accessible on this device. Sign in with Google to access from anywhere."
```

### Security Considerations

#### 1. Google OAuth Configuration

**OAuth 2.0 Setup:**
- **Scopes**: `openid`, `email`, `profile`
- **Redirect URI**: `https://yourdomain.com/api/auth/google/callback`
- **Client Type**: Web application
- **Token Storage**: HTTP-only cookies for security

**Environment Variables:**
```bash
# .env file
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret  
JWT_SECRET=your_jwt_signing_secret
SESSION_SECRET=your_session_secret
```

#### 2. Token Management

**JWT Token Strategy:**
```javascript
// JWT payload
{
  sub: 'google-sub-123456',     // Google user ID
  email: 'user@gmail.com',
  name: 'John Smith', 
  picture: 'https://...',
  iat: 1642248000,              // Issued at
  exp: 1642334400               // Expires (24 hours)
}
```

**Session Management:**
- **Access Token**: Short-lived JWT (1 hour)
- **Refresh Token**: Long-lived, HTTP-only cookie (30 days)
- **Device Tracking**: Link Google account to device IDs

#### 3. Authorization Logic

**Tournament Access Rules:**
```javascript
function canAccessTournament(user, tournament, requestedRole) {
  // Owner always has admin access
  if (tournament.owner?.id === user.id) return 'ADMIN'
  
  // Check if user is in participants list
  const participant = tournament.participants?.find(p => 
    (p.type === 'google' && p.id === user.id) ||
    (p.type === 'anonymous' && p.deviceId === user.deviceId)
  )
  
  if (participant) return participant.role
  
  // Default viewer access for public tournaments
  return 'VIEWER'
}
```

### Migration Strategy

#### 1. Backward Compatibility

**Existing Anonymous Tournaments:**
- ✅ Continue working exactly as before
- ✅ No data migration required
- ✅ Legacy `adminDeviceId` and `devices` arrays remain functional
- 🔄 Gradually enhance with new participant structure

#### 2. Feature Rollout Phases

**Phase 1: Core Authentication (Week 1)**
- [ ] Google OAuth integration
- [ ] User profile storage
- [ ] Basic sign-in/sign-out flow
- [ ] JWT token management

**Phase 2: Tournament Integration (Week 2)** 
- [ ] Tournament ownership by Google users
- [ ] Mixed participant lists (Google + anonymous)
- [ ] Enhanced tournament listing
- [ ] Cross-device access

**Phase 3: Enhanced UX (Week 3)**
- [ ] User dashboard
- [ ] Tournament history
- [ ] Profile management
- [ ] Optional anonymous upgrade path

#### 3. No Breaking Changes

**Guaranteed Compatibility:**
- ✅ All existing anonymous functionality preserved
- ✅ Current device-based access continues working
- ✅ Existing tournament data remains valid
- ✅ Anonymous users can still join Google user tournaments
- ✅ No forced account creation

### Development Setup

#### 1. Google Cloud Configuration

**Required Setup:**
1. Create Google Cloud Project
2. Enable Google+ API / Identity Platform
3. Configure OAuth consent screen
4. Create OAuth 2.0 client credentials
5. Add authorized domains

**Local Development:**
```bash
# Add to .env
GOOGLE_CLIENT_ID=your_dev_client_id
GOOGLE_CLIENT_SECRET=your_dev_client_secret
REDIRECT_URI=http://localhost:3001/api/auth/google/callback
```

#### 2. Dependencies to Add

**Backend Dependencies:**
```json
{
  "passport": "^0.7.0",
  "passport-google-oauth20": "^2.0.0", 
  "jsonwebtoken": "^9.0.0",
  "cookie-parser": "^1.4.6",
  "express-session": "^1.17.3"
}
```

**Frontend Dependencies:**
```json
{
  "react-google-login": "^5.2.2",
  "js-cookie": "^3.0.5"
}
```

#### 3. Testing Strategy

**Test Scenarios:**
- [ ] Google OAuth flow (success/failure)
- [ ] Anonymous user experience unchanged
- [ ] Mixed tournament participation  
- [ ] Cross-device access for Google users
- [ ] Token refresh and expiration
- [ ] Tournament ownership transfer (if needed)
- [ ] Superuser access still works

### Risk Assessment

**Low Risk Factors:**
- ✅ No public users to break
- ✅ Additive changes only
- ✅ Well-documented OAuth patterns
- ✅ Existing anonymous system preserved

**Medium Risk Factors:**
- 🟡 OAuth complexity (token refresh, error handling)
- 🟡 Mixed authentication states in UI
- 🟡 Google API dependency

**Mitigation Strategies:**
- 🛡️ Comprehensive testing before rollout
- 🛡️ Feature flags for gradual enablement
- 🛡️ Anonymous fallback if Google services down
- 🛡️ Clear user communication about auth choice

### Future Enhancements

**Post-Launch Possibilities:**
- **Anonymous → Google Upgrade**: Allow users to claim their anonymous tournaments
- **Social Features**: Share tournaments, public tournament discovery
- **Multi-Provider Auth**: Facebook, Microsoft, etc.
- **API Access**: OAuth for third-party integrations
- **Advanced Permissions**: Fine-grained role management

### Success Metrics

**Technical Metrics:**
- [ ] Google OAuth success rate > 95%
- [ ] Anonymous user experience unchanged (0% regression)
- [ ] Cross-device access working for Google users
- [ ] Token refresh success rate > 99%

**User Experience Metrics:**
- [ ] Tournament creation time unchanged for anonymous users
- [ ] Google users successfully access tournaments from multiple devices
- [ ] Zero anonymous-to-Google user conflicts in tournaments
- [ ] Superuser access remains functional

### Implementation Checklist

**Pre-Development:**
- [ ] Google Cloud project setup
- [ ] OAuth credentials configured
- [ ] Local development environment ready
- [ ] Security review of token strategy

**Backend Development:**
- [ ] OAuth endpoints (`/api/auth/*`)
- [ ] User profile storage
- [ ] JWT token management
- [ ] Enhanced tournament access control
- [ ] Mixed participant handling

**Frontend Development:**
- [ ] Google Sign-In component
- [ ] Authentication context/store
- [ ] Enhanced tournament listing
- [ ] User profile display
- [ ] Mixed auth state handling

**Testing & Deployment:**
- [ ] Unit tests for auth flows
- [ ] Integration tests for mixed tournaments
- [ ] Manual testing across devices
- [ ] Security testing (token handling)
- [ ] Production deployment with environment variables

---

## Summary

This implementation will transform the Tournament Manager from a device-based system to a flexible hybrid that serves both anonymous users (current experience) and authenticated users (enhanced cross-device experience). The key insight is that this is an **additive enhancement** that preserves all existing functionality while unlocking powerful new capabilities for users who choose to authenticate.

The implementation is relatively low-risk due to the additive nature and the fact that there are no existing public users to impact. The OAuth integration is well-documented, and the hybrid approach provides a smooth upgrade path for users who want enhanced functionality.

**Expected Timeline:** 2-3 weeks for complete implementation
**Risk Level:** Low-Medium  
**User Impact:** Positive (enhanced functionality, zero breaking changes)
