// functions/premiumStore.js
//
// Implements real-money purchases for the premium skins/hats using Stripe
// Checkout, following the standard pattern: client asks for a checkout
// session, player pays on Stripe's hosted page, Stripe's webhook (not the
// client returning to the site) is what actually unlocks the item.
//
// IMPORTANT — before this works you need to:
//   1. npm install stripe   (inside your functions directory)
//   2. Create a Stripe account. Because you're under 18, an adult/guardian
//      needs to be the one who owns the Stripe account and receives payouts —
//      Stripe requires the account holder to be an adult. They don't need to
//      touch this code, just complete the Stripe signup/verification step.
//   3. In the Stripe dashboard, create one Product + Price per item below
//      and paste the real price_... IDs into PRODUCTS.
//   4. Set your Stripe secret key and webhook signing secret as function
//      config/env vars — NEVER hardcode them here or send them to the client.

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const Stripe = require('stripe');

const stripe = Stripe(functions.config().stripe.secret_key);

// Maps cosmetic id -> Stripe Price ID + display name.
// Keep this in sync with premiumSkins/premiumHats in store.js.
const PRODUCTS = {
  p_pirate_skin:    { priceId: 'prod_Uwabp9Oy2WsmiJ', name: 'Buccaneer' },
  p_obsidian:       { priceId: 'prod_UwaeRXCRjVBWq4', name: 'Obsidian King' },
  p_aurora:         { priceId: 'price_REPLACE_ME_3', name: 'Aurora' },
  p_golden_tuatara: { priceId: 'price_REPLACE_ME_4', name: 'Golden Tuatara' },
  p_galaxy:         { priceId: 'price_REPLACE_ME_5', name: 'Galaxy' },
  p_ancient_dragon: { priceId: 'price_REPLACE_ME_6', name: 'Ancient Dragon' },
  p_wizard:         { priceId: 'price_REPLACE_ME_7', name: 'Wizard Hat' },
  p_pirate_hat:     { priceId: 'price_REPLACE_ME_8', name: 'Pirate Hat' },
  p_diamondcrown:   { priceId: 'price_REPLACE_ME_9', name: 'Diamond Crown' },
  p_dragonhelm:     { priceId: 'price_REPLACE_ME_10', name: 'Dragon Helm' },
};

// ── Step 3: start a purchase ────────────────────────────────────────
exports.createCheckoutSession = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to buy premium items.');
  }
  const uid = context.auth.uid;
  const cosmeticId = data.cosmeticId;
  const product = PRODUCTS[cosmeticId];

  if (!product) {
    throw new functions.https.HttpsError('invalid-argument', 'Unknown item.');
  }

  const ownedSnap = await admin.database().ref(`users/${uid}/paidOwned/${cosmeticId}`).once('value');
  if (ownedSnap.val() === true) {
    throw new functions.https.HttpsError('already-exists', 'You already own this item.');
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: product.priceId, quantity: 1 }],
    metadata: { uid, cosmeticId },
    success_url: 'https://yourgame.com/shop?success=true',
    cancel_url: 'https://yourgame.com/shop?cancelled=true',
  });

  return { url: session.url };
});

// ── Step 4: webhook — this is what actually grants the item ─────────
// Register this endpoint's URL in the Stripe dashboard and set the signing
// secret via functions.config().stripe.webhook_secret.
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      functions.config().stripe.webhook_secret
    );
  } catch (err) {
    console.error('[premiumStore] webhook signature check failed', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { uid, cosmeticId } = session.metadata || {};

    if (uid && cosmeticId && PRODUCTS[cosmeticId]) {
      await admin.database().ref(`users/${uid}/paidOwned/${cosmeticId}`).set(true);
      console.log('[premiumStore] granted', { uid, cosmeticId });
    } else {
      console.error('[premiumStore] webhook missing metadata', session.metadata);
    }
  }

  res.json({ received: true });
});
