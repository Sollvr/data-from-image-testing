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

  console.log('Webhook endpoint hit')

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



      // Determine credits based on amount in cents

      let creditsToAdd = 0

      if (amount === 999) creditsToAdd = 100      // $9.99

      else if (amount === 499) creditsToAdd = 40  // $4.99

      else if (amount === 299) creditsToAdd = 15  // $2.99

      else if (amount === 51) creditsToAdd = 3     // $0.51 test price



      if (!customerEmail) {

        throw new Error('No customer email provided')

      }



      // Find user in profiles table

      const { data: profile, error: profileError } = await supabaseAdmin

        .from('profiles')

        .select('id, credits')

        .eq('email', customerEmail)

        .single()



      if (profileError || !profile) {

        console.error('Profile lookup error:', profileError)

        throw new Error(`Profile not found for email: ${customerEmail}`)

      }



      console.log('Found profile:', { id: profile.id, currentCredits: profile.credits })



      // Update credits in profiles table

      const newCredits = (profile.credits || 0) + creditsToAdd

      const { error: updateError } = await supabaseAdmin

        .from('profiles')

        .update({ 

          credits: newCredits,

          updated_at: new Date().toISOString()

        })

        .eq('id', profile.id)



      if (updateError) {

        console.error('Credit update error:', updateError)

        throw updateError

      }



      console.log('Credits updated:', { 

        oldCredits: profile.credits,

        added: creditsToAdd,

        newTotal: newCredits 

      })



      // Record transaction

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

        console.error('Transaction error:', transactionError)

        throw transactionError

      }



      console.log('Transaction recorded successfully:', {

        userId: profile.id,

        amount: amount,

        credits: creditsToAdd,

        paymentId: session.payment_intent

      })

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






























