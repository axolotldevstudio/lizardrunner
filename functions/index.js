/**
 * Secure score submission Cloud Function.
 * This verifies user auth server-side before awarding scales or updating leaderboard.
 */

const { setGlobalOptions } = require("firebase-functions");
const { onRequest } = require("firebase-functions/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

admin.initializeApp({
  databaseURL: "https://tuatara-5767d-default-rtdb.firebaseio.com",
});
const db = admin.database();

setGlobalOptions({ maxInstances: 10 });

function sendJson(res, status, payload) {
  res.status(status).set({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
  res.json(payload);
}

exports.submitScore = onRequest(async (req, res) => {
  if (req.method === "OPTIONS") {
    return sendJson(res, 204, {});
  }

  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "POST only" });
  }

  const { score, idToken, uid, username } = req.body || {};
  logger.info("submitScore request", { score, uid, username });

  if (!idToken || !uid || !username) {
    logger.warn("submitScore missing required fields", { score, uid, username });
    return sendJson(res, 400, { error: "Missing required fields" });
  }

  if (typeof score !== "number" || !Number.isFinite(score)) {
    logger.warn("submitScore invalid score type", { score });
    return sendJson(res, 400, { error: "Invalid score" });
  }

  const scoreValue = Math.floor(score);
  if (scoreValue < 1 || scoreValue > 99999) {
    logger.warn("submitScore score out of bounds", { scoreValue });
    return sendJson(res, 400, { error: "Score must be between 1 and 99999" });
  }

  let authData;
  try {
    authData = await admin.auth().verifyIdToken(idToken);
  } catch (err) {
    logger.warn("submitScore invalid auth token", { error: err.message });
    return sendJson(res, 401, { error: "Invalid auth token" });
  }

  if (authData.uid !== uid) {
    logger.warn("submitScore token UID mismatch", { tokenUid: authData.uid, uid });
    return sendJson(res, 401, { error: "Token UID mismatch" });
  }

  const userRef = db.ref(`users/${uid}`);
  const snapshot = await userRef.once("value");
  const userData = snapshot.val();
  if (!userData) {
    logger.warn("submitScore user not found", { uid });
    return sendJson(res, 404, { error: "User not found" });
  }

  const now = Date.now();
  const lastSubmit = userData.lastScoreSubmit || 0;
  const minIntervalMs = 10 * 1000;
  if (now - lastSubmit < minIntervalMs) {
    logger.warn("submitScore rate limited", { uid, interval: now - lastSubmit });
    return sendJson(res, 429, { error: "Submitting too fast" });
  }

  const prevBest = Number(userData.bestScore || 0);
  const isNewBest = scoreValue > prevBest;
  const hoarder = userData.equipped?.powerup === "hoarder";
  const earned = Math.floor(scoreValue / 10) * (hoarder ? 2 : 1);
  const newScales = Number(userData.scales || 0) + earned;
  const newBest = isNewBest ? scoreValue : prevBest;

  const updates = {
    scales: newScales,
    lastScoreSubmit: now,
  };
  if (isNewBest) {
    updates.bestScore = newBest;
  }

  await userRef.update(updates);
  logger.info("submitScore updated user record", { uid, updates });

  const leaderboardRef = db.ref(`leaderboard/${uid}`);
  const leaderboardSnap = await leaderboardRef.once("value");
  const shouldUpdateLeaderboard = isNewBest || !leaderboardSnap.exists();

  if (shouldUpdateLeaderboard) {
    await leaderboardRef.set({
      username: userData.username || username,
      score: newBest,
      ts: now,
    });
    logger.info("submitScore updated leaderboard", {
      uid,
      path: `leaderboard/${uid}`,
      score: newBest,
      isNewBest,
      missingEntry: !leaderboardSnap.exists(),
    });
  } else {
    logger.info("submitScore skipped leaderboard write", {
      uid,
      path: `leaderboard/${uid}`,
      score: newBest,
      isNewBest,
      hadEntry: leaderboardSnap.exists(),
    });
  }

  return sendJson(res, 200, {
    success: true,
    isNewBest,
    earnedScales: earned,
    newScales,
    newBest,
    leaderboardUpdated: shouldUpdateLeaderboard,
  });
});
