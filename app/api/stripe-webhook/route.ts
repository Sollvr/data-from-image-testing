import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const headersList = await headers()
  const sig = headersList.get('stripe-signature')
  const body = await req.text()
  
  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: 'Missing stripe signature or webhook secret' },
      { status: 400 }
    )
  }

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const { userId, credits } = session.metadata as { userId: string, credits: string }

      // Update user credits
      const { error: creditError } = await supabase
        .from('users')
        .update({ 
          credits: `credits + ${parseInt(credits)}`
        })
        .eq('id', userId)

      if (creditError) {
        console.error('Error updating credits:', creditError)
        throw new Error('Failed to update user credits')
      }

      // Record transaction
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          amount: session.amount_total,
          credits: parseInt(credits),
          stripe_payment_id: session.payment_intent
        })

      if (transactionError) {
        console.error('Error recording transaction:', transactionError)
        throw new Error('Failed to record transaction')
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Webhook error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 400 }
    )
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
} 