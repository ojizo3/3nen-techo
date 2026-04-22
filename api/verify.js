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
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const customers = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    if (customers.data.length === 0) {
      return res.status(200).json({ pro: false });
    }

    const customer = customers.data[0];

    const sessions = await stripe.checkout.sessions.list({
      customer: customer.id,
      status: 'complete',
      limit: 20,
    });

    const hasLifetime = sessions.data.some(
      (s) => s.metadata && s.metadata.app === '3nen-techo-pro' && s.mode === 'payment'
    );

    if (hasLifetime) {
      return res.status(200).json({ pro: true, plan: 'lifetime' });
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 10,
    });

    const hasSubscription = subscriptions.data.some(
      (sub) => sub.metadata && sub.metadata.app === '3nen-techo-pro'
    );

    if (hasSubscription) {
      return res.status(200).json({ pro: true, plan: 'monthly' });
    }

    return res.status(200).json({ pro: false });
  } catch (error) {
    console.error('Verify error:', error);
    return res.status(500).json({ error: 'Failed to verify payment' });
  }
};
