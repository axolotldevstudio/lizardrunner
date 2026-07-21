# Lizard Runner - Final Deployment Checklist

## Pre-Deployment (Week Before Launch)

### Code Quality
- [ ] All multiplayer integration tests passing (`npm test`)
- [ ] No console errors in development build
- [ ] No `console.log` statements left in production code
- [ ] All TODOs/FIXMEs addressed or documented
- [ ] Code reviewed for security vulnerabilities
- [ ] Linting passes (if eslint configured)

### Database & Data
- [ ] Firebase Realtime Database structure tested
- [ ] Single-player leaderboard schema verified
- [ ] Multiplayer leaderboard schema verified
- [ ] Stats calculation logic verified
- [ ] Match results persist correctly
- [ ] Cleanup logic removes old/stale data

### Backend
- [ ] Server authoritative checks in place
- [ ] Input validation rejects invalid moves
- [ ] Attack logic server-verified
- [ ] Health endpoint working: `GET /health`
- [ ] All Socket.IO events handled
- [ ] Error handling doesn't crash server
- [ ] Memory leaks checked (profile with `--inspect`)
- [ ] Database connection pooling configured
- [ ] Rate limiting on match creation
- [ ] CORS correctly configured for frontend domain

### Frontend
- [ ] config.js has correct backend URL
- [ ] Firebase config loaded
- [ ] No hardcoded localhost URLs
- [ ] Socket.IO reconnection working
- [ ] Multiplayer results screen functional
- [ ] Single-player death screen functional
- [ ] Leaderboard displays both modes (single/multi)
- [ ] Tab switching works
- [ ] Loading states show correctly
- [ ] Error messages user-friendly

### Authentication
- [ ] Firebase Email/Password working
- [ ] Token validation server-side
- [ ] Session persistence working
- [ ] Logout clears state
- [ ] Reconnect with same token works
- [ ] Invalid tokens rejected

### Testing
- [ ] Tested on Chrome, Firefox, Safari (if possible)
- [ ] Tested on mobile (responsive)
- [ ] Tested with slow network (throttle in DevTools)
- [ ] Tested with offline → online transitions
- [ ] Tested with multiple tabs open
- [ ] Tested concurrent multiplayer matches (10+ players)
- [ ] Tested stress (rapid reconnects, spam inputs)

### Documentation
- [ ] DEPLOYMENT.md written and tested
- [ ] Environment variables documented (.env.example)
- [ ] Firebase rules documented
- [ ] Backend endpoints documented
- [ ] Frontend API (window.fb*) documented
- [ ] Socket.IO events documented
- [ ] Troubleshooting guide written

---

## Deployment Week

### 48 Hours Before Launch

#### Repository
- [ ] Final commit pushed to main
- [ ] GitHub branch protection enabled (require reviews/pass tests)
- [ ] No secrets in git history
- [ ] .gitignore verified

#### Firebase Setup
- [ ] Firebase project created
- [ ] Authentication enabled (Email/Password)
- [ ] Realtime Database created
- [ ] Security rules written (NOT test mode)
- [ ] Authorized domains includes production and localhost
- [ ] Service account created
- [ ] Private key downloaded and tested

#### Northflank Setup
- [ ] Northflank project created
- [ ] GitHub integration connected
- [ ] Node.js service configured
- [ ] Environment variables set (PORT, ALLOWED_ORIGINS, etc)
- [ ] Secrets set (Firebase credentials)
- [ ] Health check endpoint verified
- [ ] Auto-deployment on push enabled

#### Cloudflare Pages Setup
- [ ] Pages project connected to GitHub
- [ ] Build settings verified (no build command needed)
- [ ] Environment variables set (if needed)
- [ ] Domain configured
- [ ] SSL enabled
- [ ] Caching rules optimized (static files: 1 year, HTML: 5 min)

---

### 24 Hours Before Launch

#### Final Testing
- [ ] Staging deployment tested (if available)
- [ ] Login flow works
- [ ] Single-player works
- [ ] Multiplayer works (2-4 players)
- [ ] Leaderboards load
- [ ] Results persist
- [ ] No CORS errors
- [ ] No Firebase errors
- [ ] Performance acceptable (<2s load time)
- [ ] Mobile tested

#### Configuration Double-Check
- [ ] Backend URL correct in config.js
- [ ] Firebase config correct in firebase.js
- [ ] ALLOWED_ORIGINS includes frontend domain
- [ ] Firebase Authorized Domains includes frontend domain
- [ ] Database rules allow necessary operations
- [ ] Service account permissions correct

#### Monitoring Setup
- [ ] Northflank alerts configured (CPU, memory, errors)
- [ ] Cloudflare alerts configured (errors, high traffic)
- [ ] Firebase monitoring enabled
- [ ] Log aggregation set up (if available)
- [ ] Error tracking configured (Sentry or similar)

---

### Launch Day

#### 1 Hour Before
- [ ] All team members notified and ready
- [ ] Communication channels open (Slack, Discord)
- [ ] Rollback plan documented
- [ ] On-call engineer identified
- [ ] Customer support briefed

#### Go Live
- [ ] Announce deployment
- [ ] Monitor error logs (F5 Northflank/Firebase dashboards)
- [ ] Test login from real device/network
- [ ] Spot-check multiplayer sessions
- [ ] Monitor for unusual activity
- [ ] Check Cloudflare analytics

#### First Hour Post-Launch
- [ ] Monitor error rates
- [ ] Verify leaderboards updating
- [ ] Check for WebSocket connection issues
- [ ] Monitor database writes
- [ ] Check Northflank resource usage
- [ ] Respond to user reports

#### First Day Post-Launch
- [ ] Daily standup on deployment status
- [ ] User feedback collected
- [ ] Performance metrics reviewed
- [ ] Bug reports triaged
- [ ] Security monitoring active

---

## Post-Deployment (First Week)

### Daily Monitoring
- [ ] Error rate normal (<0.1%)
- [ ] Response times acceptable
- [ ] Database size growing normally
- [ ] No runaway processes
- [ ] Authentication working
- [ ] Multiplayer matches completing

### Weekly Review
- [ ] Leaderboard rankings accurate
- [ ] Stats calculations correct
- [ ] No data corruption
- [ ] User engagement metrics
- [ ] Performance metrics
- [ ] Security logs reviewed

### Issues Found & Fixed
- [ ] Critical bugs hot-fixed
- [ ] Minor bugs tracked for next release
- [ ] Lessons learned documented
- [ ] Post-mortem if major issues

---

## Ongoing Maintenance (Monthly)

### Security
- [ ] Firebase rules audit
- [ ] CORS settings audit
- [ ] Dependency updates checked
- [ ] Secret rotation considered
- [ ] Access logs reviewed

### Performance
- [ ] Database performance query slow logs
- [ ] Northflank resource trending
- [ ] Cloudflare cache hit rates
- [ ] Response time percentiles

### Data Quality
- [ ] Leaderboard accuracy spot-checked
- [ ] Stats calculation audit
- [ ] Data integrity checks
- [ ] Backup verification

### User Experience
- [ ] User feedback review
- [ ] Error rate trends
- [ ] Crash report analysis
- [ ] Feature usage metrics

---

## Rollback Plan

If critical issues found:

```bash
# Option 1: Revert code and redeploy
git revert <commit-hash>
git push  # Auto-deploys on both platforms

# Option 2: Disable feature via config.js (feature flag)
// In config.js:
MULTIPLAYER_ENABLED: false,
```

**Expected rollback time:** 5-15 minutes for code changes

---

## Post-Launch Success Criteria

- [ ] 0 unhandled errors in first hour
- [ ] All multiplayer matches complete successfully
- [ ] Leaderboards load in <1s
- [ ] Players can authenticate in <2s
- [ ] Average session duration >5 minutes
- [ ] No user reports of data loss
- [ ] No security incidents

---

## Escalation Contacts

- **Backend Issues:** Northflank support / on-call engineer
- **Frontend Issues:** Cloudflare Pages support / GitHub Actions
- **Database Issues:** Firebase support / DBA
- **Security Issues:** Security team / relevant vendor

---

## Notes

- Keep this checklist updated after each deployment
- Create a blameless post-mortem for any issues
- Share learnings with team
- Update procedures based on lessons learned
