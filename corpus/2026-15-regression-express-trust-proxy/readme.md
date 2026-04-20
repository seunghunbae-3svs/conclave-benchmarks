# 2026-15-regression-express-trust-proxy

The `trust proxy` setting is environment-specific load-bearing config. Removing it in a "cleanup" commit breaks:
- `req.ip` returning the real client (now returns the LB's internal IP)
- Rate limiters keyed on `req.ip` (every request appears to come from one IP)
- Access logs with useful source information
- Cookie `Secure` flag detection behind SSL-terminating proxies

Real-world repros exist in express, Koa, and Fastify projects. The comment line was the only guard.

**Expected:** rework.
