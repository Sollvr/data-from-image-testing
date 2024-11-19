import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY')
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(req: Request) {
  const body = await req.text()
  const signature = (await headers()).get('stripe-signature') ?? ''
  
  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )

    console.log('Webhook event received:', event.type)

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const customerEmail = session.customer_details?.email

      if (!customerEmail) {
        throw new Error('No customer email provided')
      }

      console.log('Processing payment for email:', customerEmail)

      // Find user by email
      const { data: user, error: userError } = await supabaseAdmin
        .from('profiles')
        .select('id, credits')
        .eq('email', customerEmail)
        .single()

      if (userError || !user) {
        console.error('User not found:', userError)
        throw new Error('User not found')
      }

      // Determine credits amount from payment
      let creditsToAdd = 0
      if (session.amount_total === 1000) creditsToAdd = 100
      else if (session.amount_total === 500) creditsToAdd = 40
      else if (session.amount_total === 300) creditsToAdd = 15

      console.log('Adding credits:', creditsToAdd, 'for user:', user.id)

      // Update user credits
      const newCredits = (user.credits || 0) + creditsToAdd
      const { error: creditError } = await supabaseAdmin
        .from('profiles')
        .update({ credits: newCredits })
        .eq('id', user.id)

      if (creditError) {
        console.error('Error updating credits:', creditError)
        throw creditError
      }

      // Record transaction
      const { error: transactionError } = await supabaseAdmin
        .from('transactions')
        .insert({
          user_id: user.id,
          amount: session.amount_total,
          credits: creditsToAdd,
          stripe_payment_id: session.payment_intent
        })

      if (transactionError) {
        console.error('Error recording transaction:', transactionError)
        throw transactionError
      }

      console.log('Successfully processed payment and updated credits')
    }

    return NextResponse.json({ 
      status: 'success', 
      event: event.type,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { 
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, 
      { status: 400 }
    )
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
} 