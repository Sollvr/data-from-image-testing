'use client'



import { useState, useEffect, useCallback } from 'react'

import { Button } from "@/components/ui/button"

import { Card } from "@/components/ui/card"

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

import { Coins, Clock } from 'lucide-react'



interface Transaction {

  id: string

  user_id: string

  amount: number

  credits: number

  stripe_payment_id: string | null

  created_at: string

}



interface CreditsPopupProps {

  user: {

    id: string

    email?: string

  }

}



const PRICE_OPTIONS = {

  'price_100': { 

    amount: 10, 

    credits: 100,

    paymentLink: 'https://buy.stripe.com/14kaFDebL2GmgqQeUV'

  },

  'price_40': { 

    amount: 5, 

    credits: 40,

    paymentLink: 'https://buy.stripe.com/fZe4hf4Bb80G3E4002'

  },

  'price_15': { 

    amount: 3, 

    credits: 15,

    paymentLink: 'https://buy.stripe.com/9AQ4hf5Ff0ye6QgbIL'

  },

  'price_test': { 

    amount: 0.01, 

    credits: 3,

    paymentLink: 'https://buy.stripe.com/9AQeVT1oZ2Gm2A06os'

  }

} as const;



export function CreditsPopup({ user }: CreditsPopupProps) {

  const [credits, setCredits] = useState(5)

  const [transactions, setTransactions] = useState<Transaction[]>([])

  const supabase = createClientComponentClient()



  const fetchCredits = useCallback(async () => {

    const { data, error } = await supabase

      .from('profiles')

      .select('credits')

      .eq('id', user.id)

      .single()



    if (error) {

      console.error('Error fetching credits:', error)

      return

    }



    if (data) {

      setCredits(data.credits)

    }

  }, [supabase, user.id])



  const fetchTransactions = useCallback(async () => {

    const { data, error } = await supabase

      .from('transactions')

      .select('*')

      .eq('user_id', user.id)

      .order('created_at', { ascending: false })

      .limit(5)



    if (error) {

      console.error('Error fetching transactions:', error)

      return

    }



    if (data) {

      setTransactions(data)

    }

  }, [supabase, user.id])



  useEffect(() => {

    if (user?.id) {

      fetchCredits()

      fetchTransactions()

    }

  }, [user?.id, fetchCredits, fetchTransactions])



  const handlePurchase = (paymentLink: string) => {

    const urlWithParams = `${paymentLink}?prefilled_email=${encodeURIComponent(user.email || '')}`

    window.location.href = urlWithParams

  }



  return (

    <Card className="w-full max-w-md p-6">

      <div className="flex items-center justify-between mb-6">

        <div className="flex items-center gap-2">

          <Coins className="w-6 h-6 text-primary" />

          <h2 className="text-2xl font-bold">Credits: {credits}</h2>

        </div>

      </div>



      <div className="space-y-4 mb-8">

        {(Object.entries(PRICE_OPTIONS) as [keyof typeof PRICE_OPTIONS, { amount: number, credits: number, paymentLink: string }][]).map(([priceId, { amount, credits, paymentLink }]) => (

          <Button

            key={priceId}

            className="w-full justify-between"

            onClick={() => handlePurchase(paymentLink)}

          >

            <span>{credits} credits</span>

            <span>${amount}</span>

          </Button>

        ))}

      </div>



      {transactions.length > 0 && (

        <div>

          <div className="flex items-center gap-2 mb-4">

            <Clock className="w-4 h-4 text-muted-foreground" />

            <h3 className="font-semibold">Recent Transactions</h3>

          </div>

          <div className="space-y-2">

            {transactions.map((transaction) => (

              <div

                key={transaction.id}

                className="flex justify-between items-center text-sm text-muted-foreground"

              >

                <span>{new Date(transaction.created_at).toLocaleDateString()}</span>

                <span>{transaction.credits} credits</span>

                <span>${(transaction.amount / 100).toFixed(2)}</span>

                <span className="text-xs text-muted-foreground truncate max-w-[100px]">

                  {transaction.stripe_payment_id || 'Processing...'}

                </span>

              </div>

            ))}

          </div>

        </div>

      )}

    </Card>

  )

} 
