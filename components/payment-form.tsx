"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

export function PaymentForm() {
  const [senderPublicKey, setSenderPublicKey] = useState("")
  const [paymentRequestId] = useState("68b8bca427b2f7ead7efd550") // Hidden field with default value
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!senderPublicKey.trim()) {
      toast({
        title: "Error",
        description: "Sender public key is required",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/headlessprepare", {
        method: "POST",
        headers: {
        "Application": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          senderPublicKey: senderPublicKey.trim(),
          paymentrequestId: paymentRequestId,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: "Payment request prepared successfully",
        })
        console.log("Response:", data)
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to prepare payment request",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error occurred",
        variant: "destructive",
      })
      console.error("Error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prepare Payment</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="senderPublicKey">Sender Public Key</Label>
            <Input
              id="senderPublicKey"
              type="text"
              value={senderPublicKey}
              onChange={(e) => setSenderPublicKey(e.target.value)}
              placeholder="Enter sender public key"
              required
            />
          </div>

          {/* Hidden field */}
          <input type="hidden" name="paymentrequestId" value={paymentRequestId} />

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "Preparing..." : "Prepare Payment"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
