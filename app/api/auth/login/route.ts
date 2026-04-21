export const dynamic = "force-dynamic"
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, signToken, setSessionCookie } from '@/lib/auth'
import { ok, err, serverError } from '@/lib/apiHelpers'
import { z } from 'zod'

const LoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json()
    const parsed = LoginSchema.safeParse(body)
    if (!parsed.success) return err('Invalid email or password.', 422)

    const { email, password } = parsed.data

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return err('Invalid email or password.', 401)

    const valid = await verifyPassword(password, user.password)
    if (!valid)  return err('Invalid email or password.', 401)

    const token = await signToken({
      userId:   user.id,
      email:    user.email,
      role:     user.role,
      isSeller: user.isSeller,
    })

    const response = ok({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, isSeller: user.isSeller },
    })
    response.cookies.set(setSessionCookie(token))
    return response

  } catch (e) {
    return serverError(e)
  }
}
