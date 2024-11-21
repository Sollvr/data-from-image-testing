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
    console.log('Starting webhook processing...')
    
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )

    console.log('Event constructed:', event.type)

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const customerEmail = session.customer_details?.email
      const amount = session.amount_total

      console.log('Session details:', { customerEmail, amount })

      if (!customerEmail) {
        throw new Error('No customer email provided')
      }

      let creditsToAdd = 0
      if (amount === 999) creditsToAdd = 100
      else if (amount === 499) creditsToAdd = 40
      else if (amount === 299) creditsToAdd = 15
      else if (amount === 1) creditsToAdd = 3

      // First find the profile
      const { data: existingProfile, error: findError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('email', customerEmail)
        .single()

      if (findError && findError.code !== 'PGRST116') { // PGRST116 is "not found" error
        console.error('Error finding profile:', findError)
        throw findError
      }

      let profile
      if (!existingProfile) {
        // Create new profile
        const { data: newProfile, error: createError } = await supabaseAdmin
          .from('profiles')
          .insert({
            email: customerEmail,
            credits: creditsToAdd,
            updated_at: new Date().toISOString()
          })
          .select('*')
          .single()

        if (createError) {
          console.error('Error creating profile:', createError)
          throw createError
        }
        profile = newProfile
      } else {
        // Update existing profile
        const { data: updatedProfile, error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({
            credits: existingProfile.credits + creditsToAdd,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingProfile.id)
          .select('*')
          .single()

        if (updateError) {
          console.error('Error updating profile:', updateError)
          throw updateError
        }
        profile = updatedProfile
      }

      console.log('Profile operation successful:', profile)

      // Record transaction
      console.log('Attempting to record transaction...')
      
      const { error: transactionError } = await supabaseAdmin
        .from('transactions')
        .insert({
          user_id: profile.id,
          amount: amount,
          credits: creditsToAdd,
          stripe_payment_id: session.payment_intent,
          created_at: new Date().toISOString()
        })

      if (transactionError) {
        console.error('Full transaction error:', transactionError)
        throw new Error(`Transaction failed: ${JSON.stringify(transactionError)}`)
      }

      console.log('Transaction recorded successfully')
    }

    return NextResponse.json({ 
      status: 'success', 
      event: event.type,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Detailed webhook error:', error)
    return NextResponse.json(
      {
        status: 'failed',
        error: error instanceof Error ? error.message : JSON.stringify(error),
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






























