# Tournament Manager - Simplification Changelog

## Overview
Simplified the complex multi-device role system to a much cleaner creator-only model with optional public viewing.

## Changes Made

### 🗑️ **Removed Complex Features:**

1. **Multi-device role system**
   - Admin/Scorer/Viewer roles
   - Role request/approval workflow
   - Device permission management
   - Station-specific scorer access

2. **Superuser system**
   - Emergency password access
   - Global admin override
   - Superuser configuration files

3. **Removed Files:**
   - `DevicePermissions.jsx`
   - `RoleRequestDialog.jsx` 
   - `SuperuserLoginDialog.jsx`

4. **Removed API endpoints:**
   - `/request-role`
   - `/grant-role`
   - `/revoke-role`
   - `/superuser-login`
   - `/device-status`
   - `/pending-requests`

### ✅ **New Simplified System:**

1. **Creator-only control**
   - Tournament creator has full control
   - Only creator can score games, manage settings
   - Only creator can delete tournament

2. **Public/Private tournaments**
   - Tournaments start as private (creator-only)
   - Creator can toggle to public
   - Public tournaments are view-only for others

3. **Updated home screen**
   - "My Tournaments" section (owned tournaments)
   - "Public Tournaments" section (others' public tournaments)
   - Shows 5 of each with "Show More" option
   - Newest first in each section

4. **Visual indicators**
   - Globe icon for public tournaments
   - Lock icon for private tournaments
   - "Owner" badge on owned tournaments

## Technical Changes

### Backend (server.js):
- `adminDeviceId` → `creatorDeviceId`
- `ADMIN` role → `CREATOR` role
- Added `isPublic` field to tournaments
- Simplified authentication middleware
- New `/toggle-public` endpoint

### Frontend:
- Removed Devices tab (5 tabs instead of 6)
- Simplified tournament header with public/private toggle
- Updated tournament list with sections
- Removed complex permission dialogs

### Data Structure:
```json
{
  "creatorDeviceId": "uuid",
  "creatorName": "Tournament Creator", 
  "isPublic": false,
  // Removed: devices, pendingRequests, adminDeviceId
}
```

## Benefits of Simplification

1. **Much easier to understand** - creator controls their tournament
2. **No complex permission management** - no more role requests
3. **Better for parties** - host controls everything from one device
4. **Still allows sharing** - public tournaments for viewing progress
5. **Cleaner UI** - removed confusing device management tab
6. **Less error-prone** - no more permission sync issues

## Migration Notes

Existing tournaments will still work but:
- Old `adminDeviceId` fields will need migration
- Old role data will be ignored
- Superuser access is no longer available

The core tournament functionality (setup, scheduling, scoring, leaderboards) remains exactly the same.
