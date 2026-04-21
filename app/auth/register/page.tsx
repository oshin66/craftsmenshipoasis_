'use client'
import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle, Eye, EyeOff } from 'lucide-react'
import Button from '@/components/ui/Button'
import Toast from '@/components/ui/Toast'

interface Form {
  name: string; email: string; password: string; confirm: string
  bio: string; skills: string; isSeller: boolean
}
type FormErrors = { name?: string; email?: string; password?: string; confirm?: string }
const INIT: Form = { name:'', email:'', password:'', confirm:'', bio:'', skills:'', isSeller:false }

const SELLER_PERKS = [
  'Set your own price and packages',
  'Get paid within 48h of delivery',
  'Build your portfolio with real projects',
]
const BUYER_PERKS = [
  'Access 300+ vetted student developers',
  'Transparent pricing, no hidden fees',
  'Managed delivery with quality oversight',
]

export default function RegisterPage() {
  const [form, setForm]     = useState<Form>(INIT)
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw]   = useState(false)
  const [toast, setToast]     = useState<{ msg: string; type: 'success'|'error' } | null>(null)
  const [errors, setErrors]   = useState<FormErrors>({})

  const setField = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm(f => ({ ...f, [k]: v }))
    if (k !== 'isSeller' && k !== 'bio' && k !== 'skills') {
      setErrors(e => ({ ...e, [k]: undefined }))
    }
  }

  const validate = (): boolean => {
    const e: FormErrors = {}
    if (!form.name.trim() || form.name.trim().length < 2) e.name = 'Name must be at least 2 characters'
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = 'Enter a valid email address'
    if (form.password.length < 8) e.password = 'Password must be at least 8 characters'
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          isSeller: form.isSeller,
          bio: form.bio || undefined,
          skills: form.skills || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setToast({ msg: data.error ?? 'Registration failed', type: 'error' }); return }
      setToast({ msg: 'Account created! Redirecting…', type: 'success' })
      setTimeout(() => window.location.href = form.isSeller ? '/dashboard/seller' : '/dashboard/buyer', 1200)
    } catch {
      setToast({ msg: 'Network error. Please try again.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const perks = form.isSeller ? SELLER_PERKS : BUYER_PERKS

  return (
    <div className="min-h-screen bg-[var(--paper)] flex">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Left decorative panel ─────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[42%] bg-[var(--forest)] p-14">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 border border-white/30 flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1L11 4v4L6 11 1 8V4z" stroke="white" strokeWidth="0.75" fill="none" opacity="0.8"/>
              <circle cx="6" cy="6" r="1.5" fill="white" opacity="0.5"/>
            </svg>
          </div>
          <span className="font-display text-[13px] tracking-[2px] uppercase text-white">
            Craftsmanship <span className="opacity-40">Oasis</span>
          </span>
        </Link>

        <div>
          <p className="text-[9px] uppercase tracking-[4px] text-white/40 font-[Jost] font-medium mb-5">Join today</p>
          <h2 className="font-display text-5xl font-light leading-[1.1] text-white mb-8">
            {form.isSeller
              ? <><em className="text-[var(--teal-pale)]">Sell</em> your<br/>skills to<br/>real brands.</>
              : <>Find your<br/>perfect<br/><em className="text-[var(--teal-pale)]">builder.</em></>
            }
          </h2>
          <ul className="space-y-4">
            {perks.map(p => (
              <li key={p} className="flex items-start gap-3 text-[12px] text-white/55 font-[Jost] font-light leading-relaxed">
                <CheckCircle size={13} className="shrink-0 mt-0.5 text-[var(--teal-pale)] opacity-80" />
                {p}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-[11px] text-white/20 font-[Jost]">© 2025 Craftsmanship Oasis</p>
      </div>

      {/* ── Right form ───────────────────────────────────────── */}
      <div className="flex-1 flex items-start justify-center px-8 py-16 overflow-y-auto">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <Link href="/" className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-6 h-6 border border-[var(--forest)] flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1L11 4v4L6 11 1 8V4z" stroke="var(--forest)" strokeWidth="0.75" fill="none"/>
                <circle cx="6" cy="6" r="1.5" fill="var(--forest)" opacity="0.6"/>
              </svg>
            </div>
            <span className="font-display text-[13px] tracking-[2px] uppercase text-[var(--forest)]">Craftsmanship Oasis</span>
          </Link>

          <div className="mb-8">
            <h1 className="font-display text-4xl font-light text-[var(--charcoal)] mb-2">Create Account</h1>
            <p className="text-[13px] text-[var(--grey)] font-[Jost] font-light">
              Already have one?{' '}
              <Link href="/auth/login" className="text-[var(--forest)] hover:underline">Sign in</Link>
            </p>
          </div>

          {/* Role toggle */}
          <div className="flex border-[0.5px] border-[var(--line)] mb-8">
            {([false, true] as const).map(s => (
              <button key={String(s)} type="button" onClick={() => setField('isSeller', s)}
                className={`flex-1 py-3 text-[10px] uppercase tracking-[2px] font-medium font-[Jost] transition-colors
                  ${form.isSeller === s
                    ? 'bg-[var(--forest)] text-[var(--paper)]'
                    : 'text-[var(--grey-light)] hover:text-[var(--grey)]'}`}>
                {s ? 'I am a Seller' : 'I am a Buyer'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>

            {/* Name */}
            <div>
              <label className="block text-[9px] uppercase tracking-[2.5px] text-[var(--grey-light)] mb-2 font-[Jost] font-medium">
                Full Name
              </label>
              <input required className="input-underline" placeholder="Your full name"
                value={form.name} onChange={e => setField('name', e.target.value)} />
              {errors.name && <p className="text-[11px] text-red-500 mt-1 font-[Jost]">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-[9px] uppercase tracking-[2.5px] text-[var(--grey-light)] mb-2 font-[Jost] font-medium">
                Email Address
              </label>
              <input type="email" required className="input-underline" placeholder="you@college.ac.in"
                value={form.email} onChange={e => setField('email', e.target.value)} />
              {errors.email && <p className="text-[11px] text-red-500 mt-1 font-[Jost]">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-[9px] uppercase tracking-[2.5px] text-[var(--grey-light)] mb-2 font-[Jost] font-medium">
                Password
              </label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} required className="input-underline pr-8"
                  placeholder="Min. 8 characters"
                  value={form.password} onChange={e => setField('password', e.target.value)} />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-[var(--grey-light)] hover:text-[var(--forest)] transition-colors">
                  {showPw ? <EyeOff size={14}/> : <Eye size={14}/>}
                </button>
              </div>
              {errors.password && <p className="text-[11px] text-red-500 mt-1 font-[Jost]">{errors.password}</p>}
            </div>

            {/* Confirm */}
            <div>
              <label className="block text-[9px] uppercase tracking-[2.5px] text-[var(--grey-light)] mb-2 font-[Jost] font-medium">
                Confirm Password
              </label>
              <input type="password" required className="input-underline" placeholder="Re-enter password"
                value={form.confirm} onChange={e => setField('confirm', e.target.value)} />
              {errors.confirm && <p className="text-[11px] text-red-500 mt-1 font-[Jost]">{errors.confirm}</p>}
            </div>

            {/* Seller-only fields */}
            {form.isSeller && (
              <>
                <div className="border-t border-[var(--line)] pt-5">
                  <p className="text-[9px] uppercase tracking-[2px] text-[var(--forest)] font-[Jost] font-medium mb-4">
                    Seller Profile
                  </p>
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-[2.5px] text-[var(--grey-light)] mb-2 font-[Jost] font-medium">
                    College / University
                  </label>
                  <input className="input-underline" placeholder="IIT Bombay, NIT Trichy..."
                    value={form.bio} onChange={e => setField('bio', e.target.value)} />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-[2.5px] text-[var(--grey-light)] mb-2 font-[Jost] font-medium">
                    Primary Skills
                  </label>
                  <input className="input-underline" placeholder="Python, React, LangChain..."
                    value={form.skills} onChange={e => setField('skills', e.target.value)} />
                  <p className="text-[10px] text-[var(--grey-light)] mt-1.5 font-[Jost]">
                    Comma-separated. Helps buyers discover you.
                  </p>
                </div>
              </>
            )}

            <Button type="submit" size="lg" className="w-full mt-2" loading={loading}>
              {form.isSeller ? 'Create Seller Account →' : 'Join as Buyer →'}
            </Button>

            <p className="text-center text-[10px] text-[var(--grey-light)] font-[Jost]">
              By joining you agree to our{' '}
              <Link href="#" className="underline hover:text-[var(--forest)]">Terms</Link>
              {' '}and{' '}
              <Link href="#" className="underline hover:text-[var(--forest)]">Privacy Policy</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
