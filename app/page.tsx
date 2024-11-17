'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { FileText, Upload, Search, Download, Zap, Shield, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function LandingPage() {
  const [email, setEmail] = useState('')
  const router = useRouter()

  const handleGetStarted = () => {
    router.push('/auth')
  }

  const handleStartFreeTrial = () => {
    if (email) {
      router.push(`/auth?email=${encodeURIComponent(email)}`)
    } else {
      router.push('/auth')
    }
  }

  const features = [
    { icon: <FileText className="h-6 w-6" />, title: 'Smart Text Extraction', description: 'Extract text from any image with high accuracy' },
    { icon: <Upload className="h-6 w-6" />, title: 'Batch Processing', description: 'Upload and process multiple images at once' },
    { icon: <Search className="h-6 w-6" />, title: 'Pattern Recognition', description: 'Automatically detect dates, amounts, and more' },
    { icon: <Download className="h-6 w-6" />, title: 'Easy Export', description: 'Download extracted data in various formats' },
  ]

  const benefits = [
    { icon: <Zap className="h-6 w-6" />, title: 'Lightning Fast', description: 'Get results in seconds, not minutes' },
    { icon: <Shield className="h-6 w-6" />, title: 'Secure & Private', description: 'Your data is encrypted and never stored' },
    { icon: <Users className="h-6 w-6" />, title: '24/7 Support', description: 'Our team is always here to help' },
  ]

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="bg-[#1a1a1a] border-b border-blue-500/10">
        <div className="container mx-auto px-4 py-6">
          <nav className="flex justify-between items-center">
            <div className="text-2xl font-bold text-blue-500">AI Text Extractor</div>
            <div className="space-x-4">
              <Button variant="ghost" className="text-gray-300 hover:text-blue-400">Features</Button>
              <Button variant="ghost" className="text-gray-300 hover:text-blue-400">Pricing</Button>
              <Button variant="ghost" className="text-gray-300 hover:text-blue-400">Contact</Button>
              <Button 
                variant="outline" 
                className="border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white"
                onClick={handleGetStarted}
              >
                Sign Up
              </Button>
            </div>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-[#1a1a1a] to-black py-20">
          <div className="container mx-auto px-4 text-center">
            <motion.h1 
              className="text-5xl font-bold mb-6 text-blue-500"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              Extract Text from Images with AI Precision
            </motion.h1>
            <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
              Transform your images into actionable data in seconds. Perfect for businesses, researchers, and developers.
            </p>
            <div className="flex justify-center space-x-4">
              <Button 
                size="lg" 
                className="bg-blue-500 text-white hover:bg-blue-600"
                onClick={handleGetStarted}
              >
                Get Started
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white"
              >
                Watch Demo
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-[#1a1a1a]">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12 text-blue-500">Powerful Features</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                <Card key={index} className="bg-black border-blue-500/20 hover:border-blue-500/40 transition-colors">
                  <CardHeader>
                    <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500 mb-4">
                      {feature.icon}
                    </div>
                    <CardTitle className="text-blue-500">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-400">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="bg-black py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12 text-blue-500">Why Choose Us</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {benefits.map((benefit, index) => (
                <Card key={index} className="bg-[#1a1a1a] border-blue-500/20 hover:border-blue-500/40 transition-colors">
                  <CardHeader>
                    <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500 mb-4">
                      {benefit.icon}
                    </div>
                    <CardTitle className="text-blue-500">{benefit.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-400">{benefit.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-t from-[#1a1a1a] to-black py-20">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-6 text-blue-500">Ready to Get Started?</h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto text-gray-400">
              Join thousands of satisfied users and start extracting text from your images today.
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
              <Input 
                type="email" 
                placeholder="Enter your email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                className="w-full sm:w-64 bg-[#1a1a1a] border-blue-500/20 focus:border-blue-500 text-white"
              />
              <Button 
                size="lg" 
                className="bg-blue-500 text-white hover:bg-blue-600"
                onClick={handleStartFreeTrial}
              >
                Start Free Trial
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#1a1a1a] border-t border-blue-500/10 py-8">
        <div className="container mx-auto px-4 text-center text-gray-400">
          <p>&copy; 2024 AI Text Extractor. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}