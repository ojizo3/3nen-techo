const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, plan } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const isMonthly = plan === 'monthly';
    const priceId = isMonthly
      ? process.env.STRIPE_PRICE_MONTHLY
      : process.env.STRIPE_PRICE_LIFETIME;
    const mode = isMonthly ? 'subscription' : 'payment';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: mode,
      success_url: `${req.headers.origin || 'https://www.3nen-techo.com'}/?pro=success`,
      cancel_url: `${req.headers.origin || 'https://www.3nen-techo.com'}/?pro=cancel`,
      metadata: {
        app: '3nen-techo-pro',
        email: email,
        plan: plan || 'lifetime',
      },
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
};
