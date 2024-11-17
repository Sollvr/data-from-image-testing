'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Star } from 'lucide-react'

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (stars: number, feedback: string) => void;
}

export function ReviewModal({ isOpen, onClose, onSubmit }: ReviewModalProps) {
  const [stars, setStars] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [hoveredStar, setHoveredStar] = useState(0)

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background p-6 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">Rate Your Experience</h2>
        
        {/* Star Rating */}
        <div className="flex justify-center space-x-2 mb-4">
          {[1, 2, 3, 4, 5].map((rating) => (
            <button
              key={rating}
              onClick={() => setStars(rating)}
              onMouseEnter={() => setHoveredStar(rating)}
              onMouseLeave={() => setHoveredStar(0)}
              className="focus:outline-none"
            >
              <Star
                className={`w-8 h-8 ${
                  rating <= (hoveredStar || stars)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                } transition-colors`}
              />
            </button>
          ))}
        </div>

        {/* Feedback Text Area */}
        <Textarea
          placeholder="Share your feedback (optional)"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          className="mb-4"
          rows={4}
        />

        {/* Action Buttons */}
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onSubmit(stars, feedback)
              onClose()
            }}
            disabled={stars === 0}
          >
            Submit Review
          </Button>
        </div>
      </div>
    </div>
  )
} 