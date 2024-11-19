import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(req: Request) {
  const body = await req.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature') ?? ''
  
  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )

    console.log('Webhook event received:', event.type)
    console.log('Event data:', JSON.stringify(event.data.object, null, 2))

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const customerEmail = session.customer_details?.email

      console.log('Processing payment for:', customerEmail)
      console.log('Amount:', session.amount_total)

      // Determine credits based on amount
      let creditsToAdd = 0
      if (session.amount_total === 1000) creditsToAdd = 100
      else if (session.amount_total === 500) creditsToAdd = 40
      else if (session.amount_total === 300) creditsToAdd = 15

      console.log('Credits to add:', creditsToAdd)

      if (!customerEmail || !creditsToAdd) {
        console.error('Missing required data:', { customerEmail, creditsToAdd })
        throw new Error('Missing required payment data')
      }

      // Find user by email
      const { data: user, error: userError } = await supabaseAdmin
        .from('profiles')
        .select('id, credits')
        .eq('email', customerEmail)
        .single()

      if (userError || !user) {
        console.error('User lookup error:', userError)
        throw new Error('User not found')
      }

      console.log('Found user:', user.id, 'Current credits:', user.credits)

      // Update user credits
      const newCredits = (user.credits || 0) + creditsToAdd
      const { error: creditError } = await supabaseAdmin
        .from('profiles')
        .update({ credits: newCredits })
        .eq('id', user.id)

      if (creditError) {
        console.error('Credit update error:', creditError)
        throw creditError
      }

      console.log('Updated credits to:', newCredits)

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
        console.error('Transaction record error:', transactionError)
        throw transactionError
      }

      console.log('Transaction recorded successfully')
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