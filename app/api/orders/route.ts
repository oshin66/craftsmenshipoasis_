export const dynamic = "force-dynamic"
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ok, err, unauthorized, serverError } from '@/lib/apiHelpers'
import { z } from 'zod'

const ORDER_INCLUDE = {
  gig:    { include: { seller: { select: { id: true, name: true, avatar: true } } } },
  buyer:  { select: { id: true, name: true, email: true, avatar: true } },
  seller: { select: { id: true, name: true, email: true, avatar: true } },
  payment: true,
}

// ── GET /api/orders ───────────────────────────────────────────────────────
// Returns orders for the current user (buyer or seller view)
export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return unauthorized()

    const { searchParams } = new URL(req.url)
    const view = searchParams.get('view') ?? 'buyer' // 'buyer' | 'seller'

    let orders
    if (session.role === 'ADMIN') {
      orders = await prisma.order.findMany({
        include: ORDER_INCLUDE,
        orderBy: { createdAt: 'desc' },
      })
    } else if (view === 'seller' && session.isSeller) {
      orders = await prisma.order.findMany({
        where:   { sellerId: session.userId },
        include: ORDER_INCLUDE,
        orderBy: { createdAt: 'desc' },
      })
    } else {
      orders = await prisma.order.findMany({
        where:   { buyerId: session.userId },
        include: ORDER_INCLUDE,
        orderBy: { createdAt: 'desc' },
      })
    }

    return ok({ orders })
  } catch (e) {
    return serverError(e)
  }
}

// ── POST /api/orders ──────────────────────────────────────────────────────
const OrderSchema = z.object({
  gigId:    z.string().cuid(),
  package:  z.enum(['basic', 'standard', 'premium']),
})

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return unauthorized()

    const body   = await req.json()
    const parsed = OrderSchema.safeParse(body)
    if (!parsed.success) return err('Invalid order data', 422)

    const { gigId, package: pkg } = parsed.data

    const gig = await prisma.gig.findUnique({ where: { id: gigId } })
    if (!gig || gig.status !== 'PUBLISHED') return err('Gig not available', 404)
    if (gig.sellerId === session.userId)     return err('You cannot order your own gig', 400)

    const price =
      pkg === 'basic'    ? gig.basicPrice :
      pkg === 'standard' ? gig.standardPrice :
                           gig.premiumPrice

    const deadline = new Date()
    deadline.setDate(deadline.getDate() + gig.deliveryDays)

    const order = await prisma.order.create({
      data: {
        gigId,
        package:  pkg,
        price,
        status:   'PENDING_PAYMENT',
        buyerId:  session.userId,
        sellerId: gig.sellerId,
        deadline,
      },
      include: ORDER_INCLUDE,
    })

    return ok({ order }, 201)
  } catch (e) {
    return serverError(e)
  }
}
