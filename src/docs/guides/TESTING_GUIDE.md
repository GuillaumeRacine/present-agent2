# Quick Testing Guide - Magic Link Authentication

## Quick Start

1. **Start Servers**
   ```bash
   # Terminal 1 - Backend
   cd /Volumes/Crucial\ X8/Code/Present-Agent2
   npm run server:dev
   
   # Terminal 2 - Frontend
   cd /Volumes/Crucial\ X8/Code/Present-Agent2/frontend
   npm run dev
   ```

2. **Open Browser**
   ```
   http://localhost:3001
   ```

3. **Test Login**
   - Enter any email (e.g., test@example.com)
   - Click "Send magic link"
   - Check backend terminal for magic link URL
   - Click the preview link shown on the page
   - You're logged in!

## Expected Flow

```
Visit http://localhost:3001
    ↓
Redirect to /auth (if not logged in)
    ↓
Enter email → Click "Send magic link"
    ↓
Backend generates token and logs: 
"Magic link: http://localhost:3001/auth/verify?token=..."
    ↓
Click preview link or copy from backend logs
    ↓
Auto-verify token → Store session → Redirect to /
    ↓
Chat interface with email shown in header
```

## What to Check

### Browser DevTools (Console)
```javascript
// Check authentication state
localStorage.getItem('present_agent_session_token')
localStorage.getItem('present_agent_user_email')
localStorage.getItem('present_agent_user_id')
```

### Browser DevTools (Network Tab)
- Watch `/api/auth/send-magic-link` call
- Watch `/api/auth/verify` call
- Watch `/api/auth/verify-session` call on page load
- Verify userId is sent with chat API calls

### Backend Logs
Look for:
```
Magic link email (development mode - logging only): {
  to: 'test@example.com',
  magicLink: 'http://localhost:3001/auth/verify?token=...'
}

User authenticated: {
  email: 'test@example.com',
  userId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
}
```

## Test Scenarios

### 1. First Time Login
- [ ] Visit http://localhost:3001
- [ ] Redirected to /auth
- [ ] Enter email
- [ ] Receive magic link
- [ ] Click link
- [ ] Logged in and see chat

### 2. Session Persistence
- [ ] Close browser tab
- [ ] Open new tab to http://localhost:3001
- [ ] Should NOT redirect to /auth
- [ ] Should see chat immediately

### 3. Logout
- [ ] Click "Logout" button
- [ ] Redirected to /auth
- [ ] localStorage cleared
- [ ] Must login again to access chat

### 4. Multiple Users
- [ ] Login with user1@test.com
- [ ] Note the userId
- [ ] Logout
- [ ] Login with user2@test.com
- [ ] Different userId
- [ ] Each user gets unique UUID

### 5. Token Expiration
- [ ] Login normally
- [ ] In DevTools console: modify token to be invalid
- [ ] Refresh page
- [ ] Should redirect to /auth

## Troubleshooting

### "Failed to send magic link"
- Check backend is running on port 3000
- Check frontend .env.local has BACKEND_URL=http://localhost:3000

### "Verification failed"
- Token might be expired (15 min limit)
- Request a new magic link

### "Redirected to /auth immediately"
- Session token might be invalid
- Check browser console for errors
- Clear localStorage and try again

### Port conflicts
```bash
# Kill process on port 3000 (backend)
lsof -ti:3000 | xargs kill -9

# Kill process on port 3001 (frontend)
lsof -ti:3001 | xargs kill -9
```

## API Testing (curl)

```bash
# 1. Send magic link
curl -X POST http://localhost:3001/api/auth/send-magic-link \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# 2. Verify token (use token from step 1)
curl -X POST http://localhost:3001/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"token":"YOUR_TOKEN_HERE"}'

# 3. Verify session (use sessionToken from step 2)
curl -X POST http://localhost:3001/api/auth/verify-session \
  -H "Content-Type: application/json" \
  -d '{"sessionToken":"YOUR_SESSION_TOKEN_HERE"}'
```

## Success Indicators

✅ Backend logs show "User authenticated"
✅ Frontend shows email in header
✅ localStorage has session_token
✅ Can make chat requests
✅ Session persists across page refreshes
✅ Logout clears session properly

## Common Issues

1. **Port 3001 already in use**
   - Another Next.js process is running
   - Solution: Kill it or use different port

2. **Backend not responding**
   - Check if running on port 3000
   - Check .env.local has correct Neo4j credentials

3. **Magic link doesn't work**
   - Check token hasn't expired (15 min)
   - Check URL is complete (including token parameter)

4. **Session not persisting**
   - Check localStorage is enabled in browser
   - Check for browser console errors
   - Verify session token is being stored

## Next Steps After Testing

Once authentication is working:
1. Test making recommendations with authenticated userId
2. Verify conversations are stored under correct userId
3. Test user history retrieval
4. Check Neo4j has User nodes created
5. Verify personalization works across sessions

## Need Help?

Check these files for implementation details:
- `/Volumes/Crucial X8/Code/Present-Agent2/AUTHENTICATION_IMPLEMENTATION.md` - Full implementation details
- `/Volumes/Crucial X8/Code/Present-Agent2/frontend/lib/auth.ts` - Auth utilities
- `/Volumes/Crucial X8/Code/Present-Agent2/src/server.ts` - Backend endpoints
