import type { Express } from "express";
import Stripe from "stripe";
import { storage } from "../storage";
import { requireAuth } from "../middleware/requireAuth";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-09-30.clover",
});

const PLAN_PRICES = {
  basic: 'price_basic_monthly', // Replace with actual Stripe Price IDs
  premium: 'price_premium_monthly',
  enterprise: 'price_enterprise_monthly',
};

export function registerStripeRoutes(app: Express) {
  // Create checkout session for subscription
  app.post("/api/stripe/create-checkout-session", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { planId } = req.body;

      if (!planId || !['basic', 'premium', 'enterprise'].includes(planId)) {
        return res.status(400).json({ error: 'Invalid plan selected' });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get or create Stripe customer
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: `${user.username}@driverlift.app`, // Using username as email for demo
          metadata: {
            userId: user.id,
            username: user.username,
          },
        });
        customerId = customer.id;
        await storage.updateUserSubscription(userId, {
          stripeCustomerId: customerId,
        });
      }

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: PLAN_PRICES[planId as keyof typeof PLAN_PRICES],
            quantity: 1,
          },
        ],
        success_url: `${req.headers.origin || 'http://localhost:5000'}/profile?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin || 'http://localhost:5000'}/profile?canceled=true`,
        metadata: {
          userId,
          planId,
        },
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error('Create checkout session error:', error);
      res.status(500).json({ error: 'Failed to create checkout session' });
    }
  });

  // Create customer portal session
  app.post("/api/stripe/create-portal-session", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);

      if (!user?.stripeCustomerId) {
        return res.status(400).json({ error: 'No subscription found' });
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${req.headers.origin || 'http://localhost:5000'}/profile`,
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error('Create portal session error:', error);
      res.status(500).json({ error: 'Failed to create portal session' });
    }
  });

  // Stripe webhooks
  app.post("/api/stripe/webhook", async (req, res) => {
    const sig = req.headers['stripe-signature'];

    if (!sig) {
      return res.status(400).send('Missing stripe-signature header');
    }

    let event: Stripe.Event;

    try {
      // In production, use webhook signing secret
      // For now, we'll use constructed events (testing mode)
      event = req.body;
      
      // Uncomment when you have webhook signing secret:
      // const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
      // event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return res.status(400).send(`Webhook Error: ${err}`);
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = session.metadata?.userId;
          const planId = session.metadata?.planId;

          if (userId && session.subscription) {
            const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
            const periodEnd = (subscription as any).current_period_end;
            
            await storage.updateUserSubscription(userId, {
              subscriptionStatus: 'active',
              currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
              planId: planId || null,
            });
          }
          break;
        }

        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = subscription.customer as string;

          // Find user by Stripe customer ID
          const users = await storage.getAllUsers();
          const user = users.find(u => u.stripeCustomerId === customerId);

          if (user) {
            const periodEnd = (subscription as any).current_period_end;
            await storage.updateUserSubscription(user.id, {
              subscriptionStatus: subscription.status,
              currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
            });
          }
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = subscription.customer as string;

          const users = await storage.getAllUsers();
          const user = users.find(u => u.stripeCustomerId === customerId);

          if (user) {
            await storage.updateUserSubscription(user.id, {
              subscriptionStatus: 'canceled',
              currentPeriodEnd: null,
              planId: null,
            });
          }
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          const customerId = invoice.customer as string;

          const users = await storage.getAllUsers();
          const user = users.find(u => u.stripeCustomerId === customerId);

          if (user) {
            await storage.updateUserSubscription(user.id, {
              subscriptionStatus: 'past_due',
            });
          }
          break;
        }
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Webhook handler error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });
}
