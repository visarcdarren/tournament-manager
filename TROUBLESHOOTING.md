# Tournament Manager - Complete Troubleshooting Guide

## 🚨 Critical Issues - Device Access Problems

### Lost Admin Access After Server Restart

**Symptoms:**
- You created the tournament but can't edit it anymore
- Settings and Teams tabs are disabled
- "ADMIN" role changed to "VIEWER"

**Root Cause:**
Device ID management issues (fixed in v2.1)

**Solutions:**

1. **Use Superuser Login (Primary Solution):**
   ```bash
   # Find your superuser password
   cat server/data/superuser-config.json
   # Or with Docker:
   docker exec -it tournament-manager cat /app/server/data/superuser-config.json
   ```
   - Go to tournament list page
   - Click "Superuser Login" in footer
   - Enter the password
   - Select your tournament or gain global access

2. **Check Device ID Consistency:**
   ```javascript
   // In browser console (F12):
   console.log('Device ID:', localStorage.getItem('tournament-device-id'))
   console.log('Device Name:', localStorage.getItem('tournament-device-name'))
   ```
   
   The device ID should be a permanent UUID that never changes.

3. **Reset Device ID (Last Resort):**
   ```javascript
   // Only if device ID is corrupted/missing
   localStorage.removeItem('tournament-device-id')
   localStorage.removeItem('tournament-device-name')
   // Refresh page - new ID will be created
   // You'll need superuser login to regain admin access
   ```

### Device ID Keeps Changing

**Symptoms:**
- Different device ID each time you visit
- Losing access frequently
- Multiple devices showing in admin panel for same browser

**Solution:**
This should be fixed in v2.1. If still happening:

1. **Clear all browser data and start fresh:**
   ```javascript
   // Clear everything
   localStorage.clear()
   sessionStorage.clear()
   // Refresh page
   ```

2. **Check for browser extensions:**
   - Disable privacy extensions temporarily
   - Try incognito mode to test
   - Some extensions clear localStorage aggressively

3. **Verify localStorage support:**
   ```javascript
   // Test localStorage availability
   try {
     localStorage.setItem('test', 'value')
     localStorage.removeItem('test')
     console.log('localStorage working')
   } catch (e) {
     console.error('localStorage blocked:', e)
   }
   ```

## 🔑 Superuser System Troubleshooting

### Password Not Working

**Check Password Source:**
```bash
# View current config
cat server/data/superuser-config.json

# Look for password field
{
  "enabled": true,
  "password": "actual-password-here",
  "passwordHash": null
}
```

**Common Issues:**
- Extra spaces in password
- Copy/paste issues
- Case sensitivity
- Special characters

**Solutions:**
1. **Copy password exactly** from config file
2. **Type manually** instead of copy/paste
3. **Check for hidden characters**

### Superuser Config Missing

**Symptoms:**
- File `server/data/superuser-config.json` doesn't exist
- Superuser login says "disabled"

**Solution:**
```bash
# Stop server
# Delete config file (if corrupted)
rm server/data/superuser-config.json

# Restart server - it will regenerate config and show password in console
npm start

# Look for output like:
# === SUPERUSER CONFIG CREATED ===
# Password: a1b2c3d4e5f6g7h8
# Config file: /path/to/config.json
# Please change this password!
```

### Can't Find Superuser Login Button

**Location:** Tournament list page (home page), bottom right footer

**If Missing:**
1. Make sure you're on the tournament list page (not inside a tournament)
2. Scroll to the very bottom of the page
3. Look for small "Superuser Login" text in footer
4. Try different screen size - might be hidden on mobile

## 🎮 Tournament Management Issues

### Schedule Generation Fails

**Error Messages & Solutions:**

**"Teams have different numbers of active players"**
- **Fix**: Ensure all teams have exactly the same number of players
- **Check**: Teams tab - each team should show same player count

**"Not enough players for game type"**
- **Fix**: Increase players per team OR reduce players required for game type
- **Example**: 2v2 Pool requires 4+ players per team

**"No stations configured"**
- **Fix**: Add stations to each game type
- **Check**: Setup tab → Game Types → each game needs at least 1 station

**"Invalid game type configuration"**
- **Fix**: Check players per team is reasonable (1-4 typically)
- **Check**: Station names are unique across all game types

### Team Management Problems

**Can't Add Players**
- **Check**: You're in "setup" status (not active tournament)
- **Check**: You have admin access
- **Fix**: Use superuser login if needed

**Player Names Not Saving**
- **Cause**: Network issues or server errors
- **Fix**: Check browser console (F12) for errors
- **Workaround**: Add players one at a time, not batch

### Scoring Problems

**Can't Score Games**
- **Check**: You have SCORER or ADMIN role
- **Check**: Game is in "active" round
- **Fix**: Request scorer access from admin

**Scores Not Updating**
- **Check**: Network connection
- **Check**: SSE connection status (connection indicator)
- **Fix**: Refresh page to reconnect

## 🌐 Network & Connection Issues

### SSE (Real-Time) Connection Problems

**Symptoms:**
- Scores don't update automatically
- Timer not synchronizing
- No live updates

**Debugging:**
```javascript
// Check SSE connection in browser console
// Look for messages like:
"SSE connection opened"
"Connecting to SSE: [url] with device ID: [id]"

// If seeing errors:
"SSE connection error"
"No device ID available for SSE connection"
```

**Solutions:**
1. **Check Device ID:**
   ```javascript
   console.log('Device ID:', localStorage.getItem('tournament-device-id'))
   // Should be a UUID, not null/undefined
   ```

2. **Network Issues:**
   - Refresh page to reconnect
   - Check firewall blocking SSE
   - Try different browser

3. **Server Issues:**
   ```bash
   # Check server logs for SSE errors
   docker-compose logs tournament-manager | grep -i sse
   ```

## 🔧 Advanced Debugging

### Browser Console Debugging

**Device Store Inspection:**
```javascript
// Check device store state
console.log('Device Store:', useDeviceStore.getState())

// Should show:
{
  deviceId: "uuid-string",
  deviceName: "Device-12345678"
}
```

**Local Storage Inspection:**
```javascript
// Check all localStorage
for (let key in localStorage) {
  console.log(key, localStorage.getItem(key))
}

// Should include:
// tournament-device-id: "uuid"
// tournament-device-name: "Device-12345678"
```

### Server-Side Debugging

**Check Tournament Data:**
```bash
# Validate tournament JSON
cd server/data
for file in tournament-*.json; do
  cat "$file" | jq . > /dev/null && echo "$file: OK" || echo "$file: CORRUPTED"
done
```

**Monitor Real-Time Events:**
```bash
# Watch SSE connections
docker-compose logs -f tournament-manager | grep -i "SSE\|event\|device"
```

## 📊 Performance Issues

### Slow Loading

**Solutions:**

1. **Check File System:**
   ```bash
   # Check data directory size
   du -sh server/data/
   
   # Large files can slow things down
   ls -lah server/data/ | sort -k5 -hr
   ```

2. **Clean Up Old Data:**
   ```bash
   # Remove old audit logs (optional)
   find server/data/ -name "*-audit.json" -mtime +30 -delete
   ```

3. **Restart Server:**
   ```bash
   docker-compose restart tournament-manager
   ```

## 🚨 Emergency Procedures

### Mid-Tournament Recovery

**If server crashes during event:**
1. **Don't Panic** - stay calm
2. **Restart Server** - `docker-compose restart tournament-manager`
3. **Use Superuser Access** - login and check tournament state
4. **Continue from Current Round** - system preserves all scored games

### Complete Data Loss

**Recovery Options:**
1. **Restore from Backup:**
   ```bash
   docker-compose down
   tar -xzf backup.tar.gz -C server/data/
   docker-compose up -d
   ```

2. **Import from Export:**
   - Use tournament export files if available
   - Import via tournament list page

3. **Manual Recreation:**
   - Create new tournament
   - Re-enter teams/players
   - Continue from current round

---

For more help, see the [Complete User Guide](USER_GUIDE.md) or [System Overview](SYSTEM_OVERVIEW.md).
