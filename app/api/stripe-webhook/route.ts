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
  const headersList = await headers()
  const signature = headersList.get('stripe-signature') ?? ''
  
  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )

    console.log('Event type:', event.type)

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const customerEmail = session.customer_details?.email
      const amount = session.amount_total

      console.log('Processing payment:', { customerEmail, amount })

      if (!customerEmail) {
        throw new Error('No customer email provided')
      }

      let creditsToAdd = 0
      if (amount === 999) creditsToAdd = 100
      else if (amount === 499) creditsToAdd = 40
      else if (amount === 299) creditsToAdd = 15
      else if (amount === 51) creditsToAdd = 3

      // Get auth user by email
      let { data: userData, error: userError } = await supabaseAdmin
        .from('auth.users')
        .select('id')
        .eq('email', customerEmail)
        .single()

      // If user not found, create a profile
      if (userError) {
        console.log('User not found, creating profile...')
        const { data: newProfile, error: createError } = await supabaseAdmin
          .from('profiles')
          .insert({
            email: customerEmail,
            credits: creditsToAdd,
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (createError) {
          console.error('Profile creation error:', createError)
          throw createError
        }
        userData = { id: newProfile.id }
        console.log('Created new profile:', newProfile)
      }

      console.log('Adding credits:', creditsToAdd)

      if (!userData) {
        throw new Error('Failed to find user profile')
      }

      // Update existing profile
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ 
          credits: supabaseAdmin.rpc('increment_credits', { amount: creditsToAdd }),
          updated_at: new Date().toISOString()
        })
        .eq('id', userData.id)

      if (updateError) {
        console.error('Profile update error:', updateError)
        throw updateError
      }

      console.log('Credits updated')

      if (!userData) {
        throw new Error('Failed to find or create user profile')
      }

      // Record transaction
      const { error: transactionError } = await supabaseAdmin
        .from('transactions')
        .insert({
          user_id: userData.id,
          amount: amount,
          credits: creditsToAdd,
          stripe_payment_id: session.payment_intent,
          created_at: new Date().toISOString()
        })

      if (transactionError) {
        console.error('Transaction error:', transactionError)
        throw transactionError
      }

      console.log('Transaction recorded')
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






























