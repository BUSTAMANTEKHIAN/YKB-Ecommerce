// Small per-process limiter for credential endpoints. Keep windows modest so
// normal checkout and portfolio testing are not affected.
const buckets = new Map();

function rateLimit({ windowMs = 15 * 60 * 1000, max = 8 } = {}) {
    return (req, res, next) => {
        const now = Date.now();
        const key = `${req.baseUrl}${req.path}:${req.ip}`;
        let entry = buckets.get(key);
        if (!entry || entry.expiresAt <= now) {
            entry = { count: 0, expiresAt: now + windowMs };
            buckets.set(key, entry);
        }
        entry.count += 1;
        res.set("RateLimit-Limit", String(max));
        res.set("RateLimit-Remaining", String(Math.max(0, max - entry.count)));
        if (entry.count > max) {
            res.set("Retry-After", String(Math.ceil((entry.expiresAt - now) / 1000)));
            return res.status(429).json({ success: false, message: "Too many attempts. Please wait a few minutes and try again." });
        }
        if (buckets.size > 5000) {
            for (const [bucketKey, bucket] of buckets) if (bucket.expiresAt <= now) buckets.delete(bucketKey);
        }
        return next();
    };
}

module.exports = rateLimit;
