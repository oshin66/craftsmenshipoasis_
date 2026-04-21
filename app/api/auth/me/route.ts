export const dynamic = "force-dynamic"
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, unauthorized, serverError } from '@/lib/apiHelpers'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return unauthorized()

    const user = await prisma.user.findUnique({
      where:  { id: session.userId },
      select: { id: true, name: true, email: true, avatar: true, role: true, isSeller: true, sellerBio: true, skills: true, createdAt: true },
    })

    if (!user) return unauthorized()
    return ok({ user })
  } catch (e) {
    return serverError(e)
  }
}
