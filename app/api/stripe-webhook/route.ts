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

    const payload = JSON.parse(body)
    console.log('Webhook event type:', event.type)
    console.log('Payment details:', {
      email: payload?.data?.object?.billing_details?.email,
      amount: payload?.data?.object?.amount,
      created: new Date(payload?.created * 1000).toISOString(),
      paymentType: payload?.type,
      receiptEmail: payload?.data?.object?.receipt_email,
      receiptUrl: payload?.data?.object?.receipt_url,
      currency: payload?.data?.object?.currency
    })

    // Handle successful checkout
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const customerEmail = session.customer_details?.email

      if (!customerEmail) {
        throw new Error('No customer email provided')
      }

      // Find user by email
      const { data: user, error: userError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', customerEmail)
        .single()

      if (userError || !user) {
        throw new Error('User not found')
      }

      // Update user credits
      const { error: creditError } = await supabaseAdmin
        .from('profiles')
        .update({ 
          credits: `credits + ${session.metadata?.credits || 0}`
        })
        .eq('id', user.id)

      if (creditError) throw creditError

      // Record transaction
      const { error: transactionError } = await supabaseAdmin
        .from('transactions')
        .insert({
          user_id: user.id,
          amount: session.amount_total,
          credits: parseInt(session.metadata?.credits || '0'),
          stripe_payment_id: session.payment_intent
        })

      if (transactionError) throw transactionError

      console.log('Successfully processed payment for user:', user.id)
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