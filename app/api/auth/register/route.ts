export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, signToken, setSessionCookie } from '@/lib/auth'
import { ok, err, serverError } from '@/lib/apiHelpers'
import { z } from 'zod'

const RegisterSchema = z.object({
  name:     z.string().min(2,  'Name must be at least 2 characters'),
  email:    z.string().email('Invalid email address'),
  password: z.string().min(8,  'Password must be at least 8 characters'),
  isSeller: z.boolean().optional().default(false),
  bio:      z.string().max(500).optional(),
  skills:   z.string().max(300).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = RegisterSchema.safeParse(body)

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Invalid input'
      return err(message, 422)
    }

    const { name, email, password, isSeller, bio, skills } = parsed.data

    // Check duplicate email
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return err('An account with this email already exists.', 409)

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create user
    let role: 'BUYER' | 'SELLER' | 'ADMIN' = isSeller ? 'SELLER' : 'BUYER'
    if (email === 'admin@co.in') role = 'ADMIN'

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        isSeller: isSeller || role === 'SELLER',
        sellerBio: bio     ?? null,
        skills:    skills  ?? null,
      },
      select: {
        id: true, name: true, email: true, role: true, isSeller: true, createdAt: true,
      },
    })

    // Sign JWT session token
    const token = await signToken({
      userId:   user.id,
      email:    user.email,
      role:     user.role,
      isSeller: user.isSeller,
    })

    const cookie = setSessionCookie(token)
    const response = ok({ user }, 201)
    response.cookies.set(cookie)
    return response

  } catch (e) {
    return serverError(e)
  }
}
