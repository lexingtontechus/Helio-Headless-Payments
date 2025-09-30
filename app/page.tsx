import { PaymentForm } from "@/components/payment-form"

export default function Home() {
  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-6">Payment Request</h1>
        <PaymentForm />
      </div>
    </main>
  )
}
