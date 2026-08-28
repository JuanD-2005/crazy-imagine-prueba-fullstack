import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router-dom'
import { LogoMark } from '../components/Logo'
import { loginSchema, type LoginFormValues } from '../features/auth/schemas'
import { useAuth } from '../features/auth/useAuth'
import { useMouseSpotlight } from '../hooks/useMouseSpotlight'
import { ApiError } from '../lib/api-client'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [formError, setFormError] = useState<string | null>(null)
  const spotlight = useMouseSpotlight('percent')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (values: LoginFormValues) => {
    setFormError(null)
    try {
      await login(values.email, values.password)
      const redirectTo =
        (location.state as { from?: string } | null)?.from ?? '/tickets'
      navigate(redirectTo, { replace: true })
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setFormError('Email o contraseña incorrectos.')
      } else {
        setFormError('No se pudo iniciar sesión. Intentá de nuevo.')
      }
    }
  }

  return (
    <div className="grid h-screen grid-cols-1 overflow-hidden md:grid-cols-[1.15fr_1fr]">
      {/* ---------- Panel izquierdo: brand / spotlight grid ---------- */}
      <div
        className="spotlight-grid spotlight-glow grain-overlay relative hidden flex-col justify-between border-r border-[var(--line)] bg-[#050605] p-14 md:flex"
        onMouseMove={spotlight.onMouseMove}
        style={spotlight.style}
      >
        <div className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center">
          <LogoMark className="h-[560px] w-[560px] opacity-5" />
        </div>

        <div className="relative z-[2]">
          <div className="mb-16 inline-flex items-center gap-2.5">
            <LogoMark />
            <span className="font-mono text-[11px] tracking-[0.24em] text-white/40 uppercase">
              CrazySupportHub · Console
            </span>
          </div>

          <h1 className="max-w-[520px] font-heading text-[clamp(38px,4.4vw,58px)] leading-[1.02] font-semibold tracking-tight text-[#f3f5ef]">
            Empowering support
            <br />
            with <span className="text-neon not-italic">advanced</span> technology.
          </h1>

          <p className="mt-5 max-w-[400px] font-mono text-[13.5px] leading-[1.7] text-white/42">
            Un solo panel para tickets, IA de triage y automatizaciones. Diseñado para
            equipos que resuelven rápido y no pierden contexto.
          </p>
        </div>

        <div className="relative z-[2] flex items-center gap-3.5 text-[11px] tracking-wide text-white/30">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-neon shadow-[0_0_6px_1px_rgba(204,255,0,0.8)]" />
          <span>All systems operational — v2.4.1</span>
        </div>
      </div>

      {/* ---------- Panel derecho: login card ---------- */}
      <div className="relative flex items-center justify-center bg-bg">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(500px_400px_at_50%_20%,rgba(204,255,0,0.035),transparent_65%)]" />

        <div className="card-border w-[400px] max-w-[90vw]">
          <div className="relative rounded-[19px] border border-white/[0.04] bg-[#08090a] px-9 py-10">
            <div className="mb-7 flex flex-col items-center">
              <div className="relative mb-4 flex h-20 w-20 items-center justify-center rounded-xl border border-[var(--line-strong)] bg-[linear-gradient(160deg,#101210,#050605)] shadow-[0_0_20px_rgba(204,255,0,0.3)]">
                <LogoMark className="h-11 w-11" />
              </div>
              <LogoWordmarkTitle />
              <div className="mt-1.5 text-[11px] text-white/32">
                Iniciá sesión para ver los tickets de soporte
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-[10.5px] tracking-[0.12em] text-white/38 uppercase"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className="w-full rounded-[10px] border border-[var(--line-strong)] bg-[#0d0e0d] px-3.5 py-3 font-mono text-[13.5px] text-[#eef1e9] outline-none transition placeholder:text-white/22 focus:border-neon/55 focus:shadow-[0_0_0_3px_rgba(204,255,0,0.08)]"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="mt-1.5 text-[12px] text-red-400">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-[10.5px] tracking-[0.12em] text-white/38 uppercase"
                >
                  Contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  className="w-full rounded-[10px] border border-[var(--line-strong)] bg-[#0d0e0d] px-3.5 py-3 font-mono text-[13.5px] text-[#eef1e9] outline-none transition placeholder:text-white/22 focus:border-neon/55 focus:shadow-[0_0_0_3px_rgba(204,255,0,0.08)]"
                  {...register('password')}
                />
                {errors.password && (
                  <p className="mt-1.5 text-[12px] text-red-400">{errors.password.message}</p>
                )}
              </div>

              {formError && (
                <p className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-[12.5px] text-red-300">
                  {formError}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-sheen w-full rounded-[10px] bg-neon py-3.5 font-mono text-[13px] font-medium tracking-wide text-[#0a0c06] transition hover:-translate-y-px hover:shadow-[0_4px_24px_-4px_rgba(204,255,0,0.45)] active:translate-y-0 disabled:opacity-50"
              >
                {isSubmitting ? 'Ingresando…' : 'Ingresar'}
              </button>
            </form>

            <div className="mt-6 mb-4 flex items-center gap-2.5">
              <div className="h-px flex-1 bg-[var(--line)]" />
              <span className="text-[10px] tracking-wide text-white/28">O</span>
              <div className="h-px flex-1 bg-[var(--line)]" />
            </div>

            <p className="w-full rounded-[10px] border border-[var(--line-strong)] py-2.5 text-center text-[12.5px] text-white/40">
              Registro deshabilitado — pedile una cuenta a un admin
            </p>

            <div className="mt-5 text-center text-[10.5px] text-white/22">
              Protegido con verificación en dos pasos
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function LogoWordmarkTitle() {
  return (
    <div className="font-heading text-[19px] font-semibold tracking-tight text-[#f2f4ee]">
      Crazy<b className="font-semibold text-neon">Support</b>Hub
    </div>
  )
}
