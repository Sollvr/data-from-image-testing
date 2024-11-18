import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const { priceId, userId } = await req.json();
  
  const prices = {
    'price_100': { amount: 10, credits: 100 },
    'price_40': { amount: 5, credits: 40 },
    'price_15': { amount: 3, credits: 15 }
  } as const;
  
  type PriceId = keyof typeof prices;
  const typedPriceId = priceId as PriceId;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${prices[typedPriceId].credits} Credits`,
          },
          unit_amount: prices[typedPriceId].amount * 100,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/`,
      metadata: {
        userId,
        credits: prices[typedPriceId].credits
      }
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error('Stripe error:', error);
    return NextResponse.json({ error: 'Error creating checkout session' }, { status: 500 });
  }
}