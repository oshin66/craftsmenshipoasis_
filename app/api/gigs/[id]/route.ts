export const dynamic = "force-dynamic"
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ok, notFound, serverError } from '@/lib/apiHelpers'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const gig = await prisma.gig.findUnique({
      where: { id },
      include: {
        seller: { select: { id: true, name: true, avatar: true, sellerBio: true, skills: true } },
      },
    })

    if (!gig) return notFound('Gig')
    return ok({ gig })
  } catch (e) {
    return serverError(e)
  }
}
