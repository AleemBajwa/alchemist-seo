import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/db";

function getStripe() {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return null;
  return new Stripe(secret, { apiVersion: "2026-01-28.clover" });
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const signature = (await headers()).get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !signature || !webhookSecret) {
    return NextResponse.json(
      { error: "Missing Stripe signature/webhook secret" },
      { status: 400 }
    );
  }

  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${(error as Error).message}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const clerkId = session.metadata?.clerkId;
        if (!clerkId) break;

        if (session.customer) {
          await prisma.user.updateMany({
            where: { clerkId },
            data: { stripeCustomerId: String(session.customer) },
          });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const clerkId = sub.metadata?.clerkId;
        if (!clerkId) break;

        const user = await prisma.user.findUnique({ where: { clerkId } });
        if (!user) break;

        const periodEndSeconds = (sub as unknown as { current_period_end?: number }).current_period_end;
        await prisma.subscription.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            stripePriceId: sub.items.data[0]?.price?.id ?? null,
            stripeSubscriptionId: sub.id,
            status: sub.status,
            currentPeriodEnd: periodEndSeconds ? new Date(periodEndSeconds * 1000) : null,
          },
          update: {
            stripePriceId: sub.items.data[0]?.price?.id ?? null,
            stripeSubscriptionId: sub.id,
            status: sub.status,
            currentPeriodEnd: periodEndSeconds ? new Date(periodEndSeconds * 1000) : null,
          },
        });
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook processing failed" },
      { status: 500 }
    );
  }
}
