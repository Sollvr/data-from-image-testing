'use client'

import { useState, useEffect, Suspense } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Mail } from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useSearchParams } from 'next/navigation'

function AuthContent() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)
  const supabase = createClientComponentClient()
  const searchParams = useSearchParams()

  useEffect(() => {
    const emailParam = searchParams.get('email')
    if (emailParam) {
      setEmail(emailParam)
    }
  }, [searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/extract-data`,
        },
      })

      if (error) throw error

      setMessage({
        type: 'success',
        text: 'Check your email for the login link!'
      })
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'An error occurred'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <h2 className="mt-6 text-3xl font-bold">Sign in</h2>
          <p className="mt-2 text-muted-foreground">
            Use your email to sign in via magic link
          </p>
        </div>

        <form onSubmit={handleLogin} className="mt-8 space-y-6">
          <div>
            <Input
              type="email"
              placeholder="Your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full"
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
            size="lg"
          >
            {loading ? 'Sending magic link...' : 'Send magic link'}
          </Button>
        </form>

        {message && (
          <div className={`mt-4 p-4 rounded-md ${
            message.type === 'success' 
              ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400' 
              : 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'
          }`}>
            {message.text}
          </div>
        )}
      </Card>
    </div>
  )
}

// Loading component for Suspense fallback
function AuthLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center">
          <div className="animate-pulse bg-primary/10 w-12 h-12 rounded-full mx-auto" />
          <div className="mt-6 h-8 bg-primary/10 rounded animate-pulse w-32 mx-auto" />
          <div className="mt-2 h-4 bg-primary/10 rounded animate-pulse w-48 mx-auto" />
        </div>
      </Card>
    </div>
  )
}

export default function Auth() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <AuthContent />
    </Suspense>
  )
} 


