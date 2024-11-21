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
  const signature = (await headers()).get('stripe-signature') ?? ''
  
  try {
    // Log the raw webhook data
    console.log('Received webhook. Signature:', signature)
    console.log('Raw body:', body)

    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )

    console.log('Webhook event type:', event.type)
    console.log('Full event data:', JSON.stringify(event.data, null, 2))

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      console.log('Session details:', {
        customerEmail: session.customer_details?.email,
        amount: session.amount_total,
        paymentStatus: session.payment_status,
        paymentIntent: session.payment_intent
      })

      const customerEmail = session.customer_details?.email

      // Determine credits based on amount in cents
      let creditsToAdd = 0
      if (session.amount_total === 999) creditsToAdd = 100      // $9.99
      else if (session.amount_total === 499) creditsToAdd = 40   // $4.99
      else if (session.amount_total === 299) creditsToAdd = 15   // $2.99

      console.log('Credits calculation:', {
        amount: session.amount_total,
        creditsToAdd: creditsToAdd
      })

      if (!customerEmail || !creditsToAdd) {
        console.error('Missing required data:', { customerEmail, creditsToAdd })
        throw new Error('Missing required payment data')
      }

      // Find user by email
      const { data: user, error: userError } = await supabaseAdmin
        .from('profiles')
        .select('id, credits, email')
        .eq('email', customerEmail)
        .single()

      console.log('User lookup result:', { user, error: userError })

      if (userError || !user) {
        console.error('User lookup error:', userError)
        throw new Error(`User not found for email: ${customerEmail}`)
      }

      // Update user credits
      const newCredits = (user.credits || 0) + creditsToAdd
      console.log('Credit calculation:', {
        currentCredits: user.credits,
        creditsToAdd,
        newCredits
      })

      const { error: creditError } = await supabaseAdmin
        .from('profiles')
        .update({ credits: newCredits })
        .eq('id', user.id)
        .eq('email', customerEmail)

      if (creditError) {
        console.error('Credit update error:', creditError)
        throw creditError
      }

      console.log('Credits updated successfully')

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