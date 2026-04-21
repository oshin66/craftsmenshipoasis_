export const dynamic = "force-dynamic"
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, signToken, setSessionCookie } from '@/lib/auth'
import { ok, err, unauthorized, serverError } from '@/lib/apiHelpers'
import { z } from 'zod'

// ── GET /api/gigs ─────────────────────────────────────────────────────────
// Query params: category, techStack, budgetMin, budgetMax, deliveryDays, sort, page, limit
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const category     = searchParams.get('category')
    const techStack    = searchParams.get('techStack')
    const search       = searchParams.get('search')
    const budgetMin    = Number(searchParams.get('budgetMin')  ?? 0)
    const budgetMax    = Number(searchParams.get('budgetMax')  ?? 999999)
    const deliveryDays = Number(searchParams.get('deliveryDays') ?? 0)
    const sort         = searchParams.get('sort') ?? 'newest'
    const page         = Math.max(1, Number(searchParams.get('page') ?? 1))
    const limit        = Math.min(50, Number(searchParams.get('limit') ?? 12))
    const skip         = (page - 1) * limit
    const sellerId     = searchParams.get('sellerId')
    const session      = await getSession()

    const where: Record<string, any> = { status: 'PUBLISHED' }
    
    // If filtering by sellerId, allow seeing non-published gigs if requester is the seller or admin
    if (sellerId) {
      delete where.status 
      where.sellerId = sellerId
      if (session?.userId !== sellerId && session?.role !== 'ADMIN') {
        where.status = 'PUBLISHED'
      }
    }

    if (category)           where.category     = category
    if (techStack)          where.techStack     = { contains: techStack }
    if (search) {
      where.OR = [
        { title:       { contains: search } },
        { description: { contains: search } },
        { techStack:   { contains: search } },
      ]
    }
    if (budgetMin > 0)      where.basicPrice    = { ...(where.basicPrice as object ?? {}), gte: budgetMin }
    if (budgetMax < 999999) where.basicPrice    = { ...(where.basicPrice as object ?? {}), lte: budgetMax }
    if (deliveryDays > 0)   where.deliveryDays  = { lte: deliveryDays }

    const orderBy =
      sort === 'rating'       ? { rating:       'desc' as const } :
      sort === 'price_asc'    ? { basicPrice:   'asc'  as const } :
      sort === 'price_desc'   ? { basicPrice:   'desc' as const } :
      sort === 'popular'      ? { totalOrders:  'desc' as const } :
                                { createdAt:    'desc' as const }

    const [gigs, total] = await Promise.all([
      prisma.gig.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          seller: { select: { id: true, name: true, avatar: true, skills: true } },
        },
      }),
      prisma.gig.count({ where }),
    ])

    return ok({ gigs, total, page, limit, pages: Math.ceil(total / limit) })
  } catch (e) {
    return serverError(e)
  }
}

// ── POST /api/gigs ────────────────────────────────────────────────────────
const GigSchema = z.object({
  title:         z.string().min(10, 'Title must be at least 10 characters').max(120),
  description:   z.string().min(30, 'Description must be at least 30 characters').max(3000),
  category:      z.enum(['AI & ML', 'Web Dev', 'App Dev', 'Data Science', 'Scripting', 'CS Projects']),
  techStack:     z.string().min(2),
  thumbnail:     z.string().optional(),
  basicPrice:    z.number().int().min(500,   'Minimum price is ₹500'),
  basicDesc:     z.string().min(5).max(200),
  standardPrice: z.number().int().min(1000),
  standardDesc:  z.string().min(5).max(200),
  premiumPrice:  z.number().int().min(2000),
  premiumDesc:   z.string().min(5).max(200),
  deliveryDays:  z.number().int().min(1).max(60),
})

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return unauthorized()

    let upgraded = false
    // Auto-upgrade Buyer to Seller if they are creating a gig
    if (session.role === 'BUYER') {
      await prisma.user.update({
        where: { id: session.userId },
        data: { role: 'SELLER', isSeller: true }
      })
      upgraded = true
    }

    const body   = await req.json()
    const parsed = GigSchema.safeParse(body)
    if (!parsed.success) {
      return err(parsed.error.issues[0]?.message ?? 'Invalid gig data', 422)
    }

    const { basicPrice, standardPrice, premiumPrice } = parsed.data
    if (basicPrice >= standardPrice) return err('Standard price must be higher than Basic', 422)
    if (standardPrice >= premiumPrice) return err('Premium price must be higher than Standard', 422)

    const gig = await prisma.gig.create({
      data: {
        ...parsed.data,
        sellerId: session.userId,
        status: 'PENDING_REVIEW',
      },
    })

    const response = ok({ gig }, 201)
    if (upgraded) {
      const newToken = await signToken({ ...session, role: 'SELLER', isSeller: true })
      response.cookies.set(setSessionCookie(newToken))
    }
    return response

  } catch (e) {
    return serverError(e)
  }
}
