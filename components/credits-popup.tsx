'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { loadStripe } from '@stripe/stripe-js'
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
  'price_100': { amount: 10, credits: 100 },
  'price_40': { amount: 5, credits: 40 },
  'price_15': { amount: 3, credits: 15 }
} as const;

export function CreditsPopup({ user }: CreditsPopupProps) {
  const [credits, setCredits] = useState(5) // Default credits as per your schema
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClientComponentClient()

  const fetchCredits = useCallback(async () => {
    const { data, error } = await supabase
      .from('users')
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

  const handlePurchase = async (priceId: keyof typeof PRICE_OPTIONS) => {
    setLoading(true)
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId, userId: user.id })
      })

      const { sessionId, error } = await response.json()
      if (error) throw new Error(error)

      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
      if (!stripe) throw new Error('Failed to load Stripe')

      await stripe.redirectToCheckout({ sessionId })
    } catch (error) {
      console.error('Purchase error:', error)
    } finally {
      setLoading(false)
    }
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
        {(Object.entries(PRICE_OPTIONS) as [keyof typeof PRICE_OPTIONS, { amount: number, credits: number }][]).map(([priceId, { amount, credits }]) => (
          <Button
            key={priceId}
            className="w-full justify-between"
            onClick={() => handlePurchase(priceId)}
            disabled={loading}
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