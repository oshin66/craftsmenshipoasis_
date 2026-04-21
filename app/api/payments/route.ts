export const dynamic = "force-dynamic"
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ok, err, unauthorized, forbidden, serverError } from '@/lib/apiHelpers'
import { z } from 'zod'

const PaymentSchema = z.object({
  orderId:       z.string().cuid(),
  transactionId: z.string().min(6,  'Enter a valid UPI transaction ID').max(50),
  screenshot:    z.string().optional(), // base64 or URL
})

// ── POST /api/payments ────────────────────────────────────────────────────
// Buyer submits UPI payment proof; sets order to PAYMENT_VERIFICATION
export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return unauthorized()

    const body   = await req.json()
    const parsed = PaymentSchema.safeParse(body)
    if (!parsed.success) return err(parsed.error.issues[0]?.message ?? 'Invalid payment data', 422)

    const { orderId, transactionId, screenshot } = parsed.data

    // Verify order belongs to buyer
    const order = await prisma.order.findUnique({ where: { id: orderId } })
    if (!order)                            return err('Order not found', 404)
    if (order.buyerId !== session.userId)  return forbidden()
    if (order.status  !== 'PENDING_PAYMENT') return err('Payment already submitted or order is not pending', 400)

    // Check no duplicate transaction ID
    const dupTxn = await prisma.payment.findFirst({ where: { transactionId } })
    if (dupTxn) return err('This transaction ID has already been used. Please contact support if this is an error.', 409)

    // Create payment record & update order in one transaction
    const [payment] = await prisma.$transaction([
      prisma.payment.create({
        data: {
          orderId,
          amount: Math.round(order.price * 1.1), // price + 10% platform fee
          transactionId,
          screenshot: screenshot ?? null,
          status: 'PENDING',
        },
      }),
      prisma.order.update({
        where: { id: orderId },
        data:  { status: 'PAYMENT_VERIFICATION' },
      }),
    ])

    return ok({ payment }, 201)
  } catch (e) {
    return serverError(e)
  }
}

// ── GET /api/payments ─────────────────────────────────────────────────────
// Admin: list all pending payments
export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') return forbidden()

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') ?? 'PENDING'

    const payments = await prisma.payment.findMany({
      where: { status: status as 'PENDING' | 'VERIFIED' | 'REJECTED' },
      include: {
        order: {
          include: {
            gig:   { select: { id: true, title: true } },
            buyer: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    return ok({ payments })
  } catch (e) {
    return serverError(e)
  }
}
