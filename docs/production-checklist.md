# Production launch checklist

## Infrastructure
- [ ] HTTPS everywhere
- [ ] WSS for Socket.IO
- [ ] TURN with short-lived credentials
- [ ] PostgreSQL backups
- [ ] Redis with authentication/TLS
- [ ] Load balancer
- [ ] Health checks
- [ ] Centralized logs
- [ ] Error tracking
- [ ] Metrics and alerting

## Security
- [ ] Strict CORS
- [ ] CSP
- [ ] Rate limiting per IP/session/account
- [ ] Bot protection
- [ ] Payload size limits
- [ ] Abuse throttling
- [ ] Dependency scanning
- [ ] Secrets manager
- [ ] Database least-privilege credentials

## Trust & Safety
- [ ] Clear community rules
- [ ] Age-safety/access policy
- [ ] Report queue
- [ ] Moderator dashboard
- [ ] Ban/suspension system
- [ ] Repeat-offender detection
- [ ] Automated text moderation
- [ ] Appropriate handling of sexual/abusive content
- [ ] Legal/privacy review for target countries

## Product
- [ ] Terms
- [ ] Privacy policy
- [ ] Cookie policy if applicable
- [ ] Contact/support
- [ ] Block
- [ ] Report
- [ ] Disconnect/Next
- [ ] Mobile testing
- [ ] Accessibility testing

## Scaling
The included Matchmaker is process-local. Before running multiple server instances, replace it with a distributed matchmaking design backed by Redis or another dedicated matchmaking service. Socket.IO's Redis adapter can synchronize socket events, but it does not by itself solve all matchmaking consistency problems.
