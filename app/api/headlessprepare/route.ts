import { type NextRequest, NextResponse } from "next/server"
import { VersionedTransaction, Keypair } from "@solana/web3.js"
import bs58 from "bs58"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { senderPublicKey, paymentrequestId } = body

    console.log("[v0] Received request body:", body)

    // Validate required fields
    if (!senderPublicKey) {
      return NextResponse.json({ error: "senderPublicKey is required" }, { status: 400 })
    }

    if (!paymentrequestId) {
      return NextResponse.json({ error: "paymentrequestId is required" }, { status: 400 })
    }

    const requestPayload = {
      paymentRequestId: paymentrequestId,
      senderPublicKey,
    }

    console.log("[v0] Sending to Hel.io API:", requestPayload)

    const response = await fetch("https://api.dev.hel.io/v1/transaction/headless/prepare", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestPayload),
    })

    const data = await response.json()
    console.log("[v0] Hel.io API response status:", response.status)
    console.log("[v0] Hel.io API response data:", data)

    if (!response.ok) {
      console.log("[v0] API error details:", data)
      return NextResponse.json({ error: "External API error", details: data }, { status: response.status })
    }

    console.log("[v0] Prepare response: Serialized Token:", data.serializedTransaction)

    try {
      const privateKeyString = process.env.myPrivateKey!
      let privateKeyBytes: Uint8Array

      console.log("[v0] Private key format detection...")

      // Try to detect and parse the private key format
      if (privateKeyString.startsWith("[") && privateKeyString.endsWith("]")) {
        console.log("[v0] Detected JSON array format")
        const keyArray = JSON.parse(privateKeyString)
        privateKeyBytes = Uint8Array.from(keyArray)
      } else if (privateKeyString.length === 88 || privateKeyString.includes("+") || privateKeyString.includes("/")) {
        console.log("[v0] Detected base64 format")
        privateKeyBytes = Uint8Array.from(Buffer.from(privateKeyString, "base64"))
      } else if (privateKeyString.length >= 87 && privateKeyString.length <= 88) {
        console.log("[v0] Detected base58 format")
        privateKeyBytes = bs58.decode(privateKeyString)
      } else if (/^[0-9a-fA-F]+$/.test(privateKeyString)) {
        console.log("[v0] Detected hex format")
        privateKeyBytes = Uint8Array.from(Buffer.from(privateKeyString, "hex"))
      } else {
        console.log("[v0] Defaulting to base58 format")
        privateKeyBytes = bs58.decode(privateKeyString)
      }

      console.log("[v0] Private key bytes length:", privateKeyBytes.length)

      if (privateKeyBytes.length !== 64) {
        throw new Error(`Invalid private key size: ${privateKeyBytes.length} bytes (expected 64 bytes)`)
      }

      const keyPair = Keypair.fromSecretKey(privateKeyBytes)
      console.log("[v0] Keypair created successfully")

      const serializedTransactionBytes = Buffer.from(data.serializedTransaction, "base64")
      const transaction = VersionedTransaction.deserialize(serializedTransactionBytes)

      console.log("[v0] Versioned transaction deserialized successfully")

      transaction.sign([keyPair])
      console.log("[v0] Transaction signed successfully")

      const signedTransactionBytes = transaction.serialize()
      const signedTransactionBase64 = Buffer.from(signedTransactionBytes).toString("base64")

      console.log("[v0] Signed transaction serialized")

      const submitPayload = {
        signedTransaction: signedTransactionBase64,
        transactionToken: data.transactionToken,
      }

      console.log("[v0] Submitting signed transaction")

      const submitResponse = await fetch("https://api.dev.hel.io/v1/transaction/headless/submit", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitPayload),
      })

      const submitData = await submitResponse.json()
      console.log("[v0] Submit API response status:", submitResponse.status)
      console.log("[v0] Submit API response data:", submitData)

      if (!submitResponse.ok) {
        console.log("[v0] Submit API error details:", submitData)
        return NextResponse.json(
          {
            error: "Transaction submit failed",
            details: submitData,
            prepareData: data,
          },
          { status: submitResponse.status },
        )
      }

      return NextResponse.json({
        prepare: data,
        submit: submitData,
        signature: transaction.signatures[0] ? bs58.encode(transaction.signatures[0]) : null,
      })
    } catch (signingError) {
      console.error("[v0] Transaction signing error:", signingError)
      return NextResponse.json(
        {
          error: "Transaction signing failed",
          details: signingError instanceof Error ? signingError.message : String(signingError),
          prepareData: data,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("[v0] API Error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
