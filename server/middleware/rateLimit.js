// In-memory bucket limiter for credential and sensitive endpoints.
// Supports compound rate-limiting by both IP and normalized email to prevent
// distributed email flooding and credential brute-forcing.

const buckets = new Map();

function checkBucket(key, max, windowMs, now) {
    let entry = buckets.get(key);
    if (!entry || entry.expiresAt <= now) {
        entry = { count: 0, expiresAt: now + windowMs };
        buckets.set(key, entry);
    }
    entry.count += 1;
    return entry;
}

function rateLimit({ windowMs = 15 * 60 * 1000, max = 8, keyGenerator = null } = {}) {
    return (req, res, next) => {
        const now = Date.now();
        const basePath = `${req.baseUrl || ""}${req.path || ""}`;

        // Primary key (IP)
        const ipKey = keyGenerator ? keyGenerator(req) : `${basePath}:ip:${req.ip}`;
        const ipEntry = checkBucket(ipKey, max, windowMs, now);

        res.set("RateLimit-Limit", String(max));
        res.set("RateLimit-Remaining", String(Math.max(0, max - ipEntry.count)));

        if (ipEntry.count > max) {
            res.set("Retry-After", String(Math.ceil((ipEntry.expiresAt - now) / 1000)));
            return res.status(429).json({
                success: false,
                message: "Too many attempts. Please wait a few minutes and try again."
            });
        }

        // Secondary key: Normalized email, if present in body
        const rawEmail = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : null;
        if (rawEmail) {
            const emailKey = `${basePath}:email:${rawEmail}`;
            const emailEntry = checkBucket(emailKey, max, windowMs, now);
            if (emailEntry.count > max) {
                res.set("Retry-After", String(Math.ceil((emailEntry.expiresAt - now) / 1000)));
                return res.status(429).json({
                    success: false,
                    message: "Too many attempts for this account. Please wait a few minutes and try again."
                });
            }
        }

        // Periodically purge expired buckets
        if (buckets.size > 5000) {
            for (const [bucketKey, bucket] of buckets) {
                if (bucket.expiresAt <= now) buckets.delete(bucketKey);
            }
        }

        return next();
    };
}

module.exports = rateLimit;
