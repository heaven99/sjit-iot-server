"use strict";

const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { makeResData } = require("./error-code");

class JwtService {
  constructor({
    accessTokenSecret,
    refreshTokenSecret,
    accessTokenExpirySec,
    refreshTokenExpiry,
  }) {
    this.accessTokenSecret = accessTokenSecret;
    this.refreshTokenSecret = refreshTokenSecret;
    this.accessTokenExpirySec = accessTokenExpirySec;
    this.refreshTokenExpiry = refreshTokenExpiry;
    this.activeRefreshTokens = new Set();
  }

  buildAccessToken(user, sessionHmacKey) {
    return jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        hk: sessionHmacKey, // HMAC key embedded in signed payload — tamper-proof
      },
      this.accessTokenSecret,
      { expiresIn: this.accessTokenExpirySec },
    );
  }

  buildRefreshToken(user) {
    const token = jwt.sign({ id: user.id }, this.refreshTokenSecret, {
      expiresIn: this.refreshTokenExpiry,
    });
    this.activeRefreshTokens.add(token);
    return token;
  }

  issueTokenPair(user) {
    // hmacKey : 16-byte base64url → ~22 chars (128-bit entropy)
    // Stored inside the signed JWT (hk claim), so no server-side state needed.
    const sessionHmacKey = crypto.randomBytes(16).toString("base64url");

    return {
      accessToken: this.buildAccessToken(user, sessionHmacKey),
      refreshToken: this.buildRefreshToken(user),
      expiresIn: this.accessTokenExpirySec,
      sessionHmacKey, // returned to client; used to sign request payloads
    };
  }

  verifyAccessToken(token) {
    return jwt.verify(token, this.accessTokenSecret);
  }

  verifyRefreshToken(token) {
    return jwt.verify(token, this.refreshTokenSecret);
  }

  hasRefreshToken(token) {
    return this.activeRefreshTokens.has(token);
  }

  revokeRefreshToken(token) {
    this.activeRefreshTokens.delete(token);
  }

  /**
   * Compute HMAC-SHA256 of data using a base64url-encoded key.
   * timestamp (Unix seconds, integer) is appended to the message so the
   * signature is time-bound and cannot be replayed on a different day.
   *
   * message = JSON.stringify(body) + "." + timestamp
   */
  signPayload(data, timestamp, hmacKey) {
    const body = typeof data === "string" ? data : JSON.stringify(data);
    const message = `${body}.${timestamp}`;
    return crypto
      .createHmac("sha256", Buffer.from(hmacKey, "base64url"))
      .update(message)
      .digest("hex");
  }

  /**
   * Timing-safe comparison of the expected HMAC against the provided signature.
   * Returns true when they match.
   */
  verifyPayloadSignature(data, signature, timestamp, hmacKey) {
    const expected = this.signPayload(data, timestamp, hmacKey);
    try {
      return crypto.timingSafeEqual(
        Buffer.from(expected, "hex"),
        Buffer.from(signature, "hex"),
      );
    } catch {
      return false; // length mismatch → definitely invalid
    }
  }

  /**
   * Express middleware that combines JWT verification with per-request
   * payload HMAC verification.
   *
   * Client responsibility:
   *   const sig = hmac_sha256(JSON.stringify(requestBody), sessionHmacKey);
   *   headers["X-Payload-Signature"] = sig;
   *
   * Only requests that carry a JSON body are subject to HMAC checking;
   * GET / HEAD / requests with empty bodies pass through after JWT check.
   */
  authenticateWithPayload(lhd, ctx, req, res) {
    // ── 1. JWT verification ─────────────────────────────────────────────
    const authResult = this.authenticate(lhd, ctx, req);
    if (!authResult.succ) {
      return authResult;
    }

    // ── 2. Payload HMAC verification ────────────────────────────────────
    // Only applies when the request carries a JSON body
    const hasBody =
      req.headers["content-type"]?.includes("application/json") &&
      req.body !== undefined &&
      req.body !== null &&
      Object.keys(req.body).length > 0;

    if (!hasBody) {
      return authResult; // skip HMAC check if no JSON body
    }

    const decoded = authResult.data.user;
    const signature = req.headers["x-payload-signature"];
    if (!signature) {
      log.error(
        `${lhd} << missing x-payload-signature header for request with body`,
      );
      return {
        succ: false,
        data: makeResData(utils, "E0004"),
      };
    }

    // ── 3. Timestamp check (replay-attack prevention) ───────────────────
    const tsRaw = req.headers["x-request-timestamp"];
    const timestamp = parseInt(tsRaw, 10);
    const nowSec = Math.floor(Date.now() / 1000);
    const CLOCK_TOLERANCE_SEC = 300; // ±5 minutes
    if (
      !tsRaw ||
      isNaN(timestamp) ||
      Math.abs(nowSec - timestamp) > CLOCK_TOLERANCE_SEC
    ) {
      log.error(
        `${lhd} << invalid or missing x-request-timestamp header. value [${tsRaw}]`,
      );
      return {
        succ: false,
        data: makeResData(utils, "E0005"),
      };
    }

    const { hk: hmacKey } = decoded;
    if (!hmacKey) {
      log.error(
        `${lhd} << access token has no HMAC key (hk claim) — cannot verify payload signature`,
      );
      return {
        succ: false,
        data: makeResData(utils, "E1003"),
      };
    }

    if (
      !this.verifyPayloadSignature(
        JSON.stringify(req.body),
        signature,
        timestamp,
        hmacKey,
      )
    ) {
      log.error(`${lhd} << payload signature mismatch — tampering detected`);
      return {
        succ: false,
        data: makeResData(utils, "E1004"),
      };
    }
    return authResult; // all checks passed
  }
  // authenticateWithPayload() {
  //   return (req, res, next) => {
  //     // ── 1. JWT verification ─────────────────────────────────────────────
  //     const authHeader = req.headers["authorization"];
  //     const token =
  //       authHeader && authHeader.startsWith("Bearer ")
  //         ? authHeader.slice(7)
  //         : null;

  //     if (!token) {
  //       return res.status(401).json({ error: "Access token required" });
  //     }

  //     let decoded;
  //     try {
  //       decoded = this.verifyAccessToken(token);
  //     } catch {
  //       return res
  //         .status(401)
  //         .json({ error: "Invalid or expired access token" });
  //     }

  //     req.user = decoded;

  //     // ── 2. Payload HMAC verification ────────────────────────────────────
  //     // Only applies when the request carries a JSON body
  //     const hasBody =
  //       req.headers["content-type"]?.includes("application/json") &&
  //       req.body !== undefined &&
  //       req.body !== null &&
  //       Object.keys(req.body).length > 0;

  //     if (!hasBody) return next();

  //     const signature = req.headers["x-payload-signature"];
  //     if (!signature) {
  //       return res
  //         .status(400)
  //         .json({ error: "x-payload-signature header is required" });
  //     }

  //     // ── 3. Timestamp check (replay-attack prevention) ───────────────────
  //     const tsRaw = req.headers["x-request-timestamp"];
  //     const timestamp = parseInt(tsRaw, 10);
  //     const nowSec = Math.floor(Date.now() / 1000);
  //     const CLOCK_TOLERANCE_SEC = 300; // ±5 minutes
  //     if (
  //       !tsRaw ||
  //       isNaN(timestamp) ||
  //       Math.abs(nowSec - timestamp) > CLOCK_TOLERANCE_SEC
  //     ) {
  //       return res.status(400).json({
  //         error: "x-request-timestamp is missing or out of the ±5 min window",
  //       });
  //     }

  //     const { hk: hmacKey } = decoded;
  //     if (!hmacKey) {
  //       return res
  //         .status(401)
  //         .json({ error: "Token has no HMAC key — re-login required" });
  //     }

  //     if (
  //       !this.verifyPayloadSignature(
  //         JSON.stringify(req.body),
  //         signature,
  //         timestamp,
  //         hmacKey,
  //       )
  //     ) {
  //       return res
  //         .status(403)
  //         .json({ error: "Payload signature mismatch — tampering detected" });
  //     }

  //     next();
  //   };
  // }

  /**
   * Express middleware — attaches decoded payload to req.user.
   * Returns a bound function so it can be passed directly to app.use().
   */
  authenticate(lhd, ctx, req) {
    const { log, utils } = ctx;
    const authHeader = req.headers["authorization"];
    const token =
      authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : null;

    if (!token) {
      return {
        succ: false,
        data: makeResData(utils, "E1002"),
      };
    }

    try {
      const user = this.verifyAccessToken(token);
      return { succ: true, data: { user } };
    } catch (err) {
      log.error(`${lhd} << failed to verify access token. err [${err}]`);
      return {
        succ: false,
        data: makeResData(utils, "E1001"),
      };
    }
  }
  // authenticate() {
  //   return (req, res, next) => {
  //     const authHeader = req.headers["authorization"];
  //     const token =
  //       authHeader && authHeader.startsWith("Bearer ")
  //         ? authHeader.slice(7)
  //         : null;

  //     if (!token) {
  //       return res.status(401).json({ error: "Access token required" });
  //     }

  //     try {
  //       req.user = this.verifyAccessToken(token);
  //       next();
  //     } catch {
  //       return res
  //         .status(401)
  //         .json({ error: "Invalid or expired access token" });
  //     }
  //   };
  // }
}

module.exports = JwtService;
