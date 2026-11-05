import { useEffect, useState } from 'react'
import { API } from './api.js'

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
]

export default function Auth({ onLogin }) {
  const [mode, setMode] = useState(() =>
    new URLSearchParams(window.location.search).get('ref')
      ? 'register'
      : 'login'
  )

  const [name, setName] = useState('')
  const [stateName, setStateName] = useState('')
  const [email, setEmail] = useState('')
  const [mobile, setMobile] = useState('')
  const [age, setAge] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [telegramDeepLink, setTelegramDeepLink] = useState('')
  const [botUsername, setBotUsername] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  const [referralCode, setReferralCode] = useState(() => {
    return new URLSearchParams(window.location.search).get('ref') || ''
  })
  const [agentReferralCode] = useState(() => {
    return new URLSearchParams(window.location.search).get('aref') || ''
  })

  const isRegister = mode === 'register'
  const isLogin = mode === 'login'
  const isVerify = mode === 'verify'
  const isForgot = mode === 'forgot'
  const isReset = mode === 'reset'

  function switchMode(next) {
    setMode(next)
    setError('')
    setInfo('')
    setOtp('')
    if (next === 'login' || next === 'register') {
      setPassword('')
      setConfirmPassword('')
      setTelegramDeepLink('')
    }
  }

  useEffect(() => {
    if (!isVerify || !email.trim()) return undefined
    let cancelled = false
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(
          `${API}/auth/verification-status?email=${encodeURIComponent(email.trim())}`,
          { cache: 'no-store' },
        )
        const data = await response.json().catch(() => ({}))
        if (!cancelled && response.ok && data.verified) {
          setInfo('Telegram verified. Ab login karo.')
          setMode('login')
          setTelegramDeepLink('')
        }
      } catch {
        // keep polling
      }
    }, 2500)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [isVerify, email])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setInfo('')
    setBusy(true)

    try {
      if (isRegister) {
        if (!name.trim() || !stateName || !email.trim() || !mobile.trim() || !age) {
          setError('Please complete all required fields.')
          return
        }
        if (!email.trim().toLowerCase().endsWith('@gmail.com')) {
          setError('Only Gmail addresses (@gmail.com) are allowed.')
          return
        }
        if (!/^[6-9]\d{9}$/.test(mobile.trim())) {
          setError('Enter a valid 10-digit mobile number.')
          return
        }
        const ageNum = Number(age)
        if (!Number.isInteger(ageNum) || ageNum < 18 || ageNum > 99) {
          setError('Age must be between 18 and 99.')
          return
        }
        if (password.length < 8) {
          setError('Password must contain at least 8 characters.')
          return
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match.')
          return
        }
        if (!acceptedTerms) {
          setError('Please accept the Terms and Conditions.')
          return
        }

        const response = await fetch(`${API}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            state: stateName,
            email: email.trim(),
            mobileNumber: mobile.trim(),
            age: ageNum,
            password,
            referralCode: agentReferralCode.trim() ? '' : referralCode.trim(),
            agentReferralCode: agentReferralCode.trim() || undefined,
          }),
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          setError(data.message || 'Registration failed.')
          return
        }
        setTelegramDeepLink(data.telegramDeepLink || '')
        setBotUsername(data.botUsername || '')
        setInfo(data.message || 'Telegram pe Open karke account verify karo.')
        setMode('verify')
        setPassword('')
        setConfirmPassword('')
        return
      }

      if (isVerify) {
        setError('Pehle Telegram pe Open / Start dabao. Verify hone ke baad automatic login screen aayega.')
        return
      }

      if (isForgot) {
        if (!email.trim().toLowerCase().endsWith('@gmail.com')) {
          setError('Only Gmail addresses (@gmail.com) are allowed.')
          return
        }
        const response = await fetch(`${API}/auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim() }),
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          setError(data.message || 'Could not start password reset.')
          return
        }
        setTelegramDeepLink(data.telegramDeepLink || '')
        setBotUsername(data.botUsername || '')
        setInfo(data.message || 'Telegram pe reset link open karo. Code wahan milega.')
        setMode('reset')
        return
      }

      if (isReset) {
        if (!/^\d{6}$/.test(otp.trim())) {
          setError('Telegram se mila 6-digit code daalo.')
          return
        }
        if (password.length < 8) {
          setError('Password must contain at least 8 characters.')
          return
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match.')
          return
        }
        const response = await fetch(`${API}/auth/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim(),
            code: otp.trim(),
            newPassword: password,
          }),
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          setError(data.message || 'Password reset failed.')
          return
        }
        setInfo(data.message || 'Password updated. You can log in now.')
        setOtp('')
        setPassword('')
        setConfirmPassword('')
        setTelegramDeepLink('')
        setMode('login')
        return
      }

      if (!email.trim() || !password) {
        setError('Enter your Gmail and password.')
        return
      }

      const response = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usernameOrEmail: email.trim(),
          password,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.message || 'Invalid email or password.')
        if (data.message && String(data.message).toLowerCase().includes('verify')) {
          setMode('verify')
        }
        return
      }

      localStorage.setItem('colorwin_token', data.token)
      setError('')
      onLogin(data.token)
    } catch {
      setError('Cannot connect to the server. Check that Spring Boot is running.')
    } finally {
      setBusy(false)
    }
  }

  async function refreshTelegramLink() {
    setError('')
    setInfo('')
    setBusy(true)
    try {
      const response = await fetch(`${API}/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.message || 'Could not create Telegram link.')
        return
      }
      setTelegramDeepLink(data.telegramDeepLink || '')
      setBotUsername(data.botUsername || '')
      setInfo(data.message || 'Naya Telegram link ready hai.')
    } catch {
      setError('Cannot connect to the server.')
    } finally {
      setBusy(false)
    }
  }

  const field = 'mt-2 w-full rounded-2xl border border-yellow-400/30 bg-[#050510] p-3 font-bold text-white outline-none focus:border-yellow-300'

  const title = isVerify
    ? 'Verify Telegram'
    : isForgot
      ? 'Forgot Password'
      : isReset
        ? 'Reset Password'
        : isRegister
          ? 'Create Account'
          : 'Welcome Back'

  const subtitle = isVerify
    ? `Telegram bot${botUsername ? ` @${botUsername}` : ''} pe Start dabao`
    : isForgot
      ? 'Reset Telegram bot se hoga'
      : isReset
        ? 'Telegram code daalo aur naya password set karo'
        : isRegister
          ? 'Join Millionaire Hub'
          : 'Login to Millionaire Hub'

  return (
    <div className="flex min-h-[75vh] items-center justify-center p-2">
      <section className="relative w-full max-w-md overflow-hidden rounded-3xl border border-yellow-400/40 bg-[linear-gradient(180deg,#1a1230_0%,#0d0d1c_45%,#080817_100%)] p-5 shadow-[0_12px_32px_rgba(88,28,135,0.4)] sm:p-7">
        <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-yellow-400/20 blur-2xl" />
        <div className="mb-6 text-center">
          <img src="/millionaire-hub-logo.svg" alt="" className="mx-auto h-16 w-16 rounded-full ring-2 ring-yellow-300" />
          <h2 className="mt-3 text-2xl font-black text-white">{title}</h2>
          <p className="mt-2 text-sm font-bold text-fuchsia-200">{subtitle}</p>
          <p className="mt-2 text-xs font-black text-yellow-300">Virtual points · Play smart</p>
        </div>

        {(isLogin || isRegister) && (
          <div className="mb-5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`rounded-2xl py-2.5 text-sm font-black shadow-[0_3px_0_#3b0764] active:translate-y-0.5 ${
                isLogin
                  ? 'border border-yellow-200 bg-gradient-to-b from-yellow-300 to-amber-500 text-black shadow-[0_3px_0_#92400e]'
                  : 'border border-yellow-400/20 bg-[#080817] text-slate-400'
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`rounded-2xl py-2.5 text-sm font-black shadow-[0_3px_0_#3b0764] active:translate-y-0.5 ${
                isRegister
                  ? 'border border-yellow-200 bg-gradient-to-b from-yellow-300 to-amber-500 text-black shadow-[0_3px_0_#92400e]'
                  : 'border border-yellow-400/20 bg-[#080817] text-slate-400'
              }`}
            >
              Register
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <>
              <label className="block text-sm text-slate-300">
                Name
                <input
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  placeholder="Your full name"
                  className={field}
                />
              </label>

              <label className="block text-sm text-slate-300">
                State
                <select
                  required
                  value={stateName}
                  onChange={(event) => setStateName(event.target.value)}
                  className={field}
                >
                  <option value="">Select state</option>
                  {INDIAN_STATES.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>

              <label className="block text-sm text-slate-300">
                Mobile Number
                <input
                  required
                  type="tel"
                  inputMode="numeric"
                  value={mobile}
                  onChange={(event) => setMobile(event.target.value.replace(/\D/g, '').slice(0, 10))}
                  autoComplete="tel"
                  placeholder="10-digit mobile"
                  className={field}
                />
              </label>

              <label className="block text-sm text-slate-300">
                Age
                <input
                  required
                  type="number"
                  min={18}
                  max={99}
                  value={age}
                  onChange={(event) => setAge(event.target.value)}
                  placeholder="18+"
                  className={field}
                />
              </label>

              {agentReferralCode ? (
                <div className="rounded-2xl border border-emerald-400/40 bg-emerald-950/30 p-3 text-sm">
                  <p className="font-black text-emerald-300">Agent invite linked</p>
                  <p className="mt-1 break-all text-xs text-emerald-100/80">aref={agentReferralCode}</p>
                </div>
              ) : (
                <label className="block text-sm text-slate-300">
                  Referral Code (Optional)
                  <input
                    value={referralCode}
                    onChange={(event) => setReferralCode(event.target.value)}
                    placeholder="Enter referral code"
                    autoComplete="off"
                    className={field}
                  />
                </label>
              )}
            </>
          )}

          {(isLogin || isRegister || isForgot || isReset) && (
            <label className="block text-sm text-slate-300">
              Gmail
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="you@gmail.com"
                disabled={isReset}
                className={`${field} disabled:opacity-70`}
              />
            </label>
          )}

          {isVerify && (
            <div className="space-y-3 rounded-2xl border border-sky-400/30 bg-[#07111f] p-4">
              <p className="text-sm font-bold text-sky-100">
                1) Neeche button se Telegram kholo
              </p>
              <p className="text-sm font-bold text-sky-100">
                2) Bot mein Start dabao
              </p>
              <p className="text-sm font-bold text-sky-100">
                3) Verify hone ke baad yahan automatic Login screen aa jayega
              </p>
              {telegramDeepLink ? (
                <a
                  href={telegramDeepLink}
                  target="_blank"
                  rel="noreferrer"
                  className="block w-full rounded-2xl border border-sky-200 bg-gradient-to-b from-sky-300 to-blue-600 py-3.5 text-center font-black text-black shadow-[0_4px_0_#1e3a8a]"
                >
                  Open Telegram {botUsername ? `@${botUsername}` : ''}
                </a>
              ) : (
                <p className="text-sm font-bold text-amber-300">
                  Telegram bot configured nahi hai. BOT_TOKEN / BOT_USERNAME set karo.
                </p>
              )}
            </div>
          )}

          {isReset && telegramDeepLink && (
            <a
              href={telegramDeepLink}
              target="_blank"
              rel="noreferrer"
              className="block w-full rounded-2xl border border-sky-200 bg-gradient-to-b from-sky-300 to-blue-600 py-3.5 text-center font-black text-black shadow-[0_4px_0_#1e3a8a]"
            >
              Open Telegram for reset code
            </a>
          )}

          {isReset && (
            <label className="block text-sm text-slate-300">
              Telegram code
              <input
                required
                inputMode="numeric"
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className={field}
              />
            </label>
          )}

          {(isLogin || isRegister || isReset) && (
            <label className="block text-sm text-slate-300">
              {isReset ? 'New Password' : 'Password'}
              <input
                required
                type="password"
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                placeholder="Minimum 8 characters"
                className={field}
              />
            </label>
          )}

          {(isRegister || isReset) && (
            <label className="block text-sm text-slate-300">
              Confirm Password
              <input
                required
                type="password"
                minLength={8}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                placeholder="Enter password again"
                className={field}
              />
            </label>
          )}

          {isRegister && (
            <label className="flex items-start gap-2 text-sm text-slate-400">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) => setAcceptedTerms(event.target.checked)}
                className="mt-1 accent-fuchsia-500"
              />
              <span>I agree to the Terms and Conditions.</span>
            </label>
          )}

          {error && (
            <p role="alert" className="rounded-2xl border border-red-900/50 bg-[#3a1518] p-3 text-sm font-bold text-red-300/80">
              {error}
            </p>
          )}
          {info && (
            <p className="rounded-2xl border border-emerald-900/50 bg-emerald-950/40 p-3 text-sm font-bold text-emerald-300">
              {info}
            </p>
          )}

          {!isVerify && (
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-2xl border border-yellow-200 bg-gradient-to-b from-yellow-300 to-amber-500 py-3.5 font-black text-black shadow-[0_4px_0_#92400e] active:translate-y-0.5 active:shadow-[0_2px_0_#92400e] disabled:opacity-60"
            >
              {busy
                ? 'Please wait...'
                : isForgot
                  ? 'GET TELEGRAM RESET LINK'
                  : isReset
                    ? 'UPDATE PASSWORD'
                    : isRegister
                      ? 'CREATE ACCOUNT'
                      : 'LOGIN'}
            </button>
          )}
        </form>

        {isVerify && (
          <button
            type="button"
            disabled={busy}
            onClick={refreshTelegramLink}
            className="mt-3 w-full text-center text-sm font-black text-yellow-300 disabled:opacity-60"
          >
            New Telegram link
          </button>
        )}

        {isLogin && (
          <p className="mt-4 text-center text-sm font-bold text-slate-400">
            <button
              type="button"
              onClick={() => switchMode('forgot')}
              className="font-black text-yellow-300"
            >
              Forgot password?
            </button>
          </p>
        )}

        <p className="mt-5 text-center text-sm font-bold text-slate-400">
          {isVerify || isForgot || isReset ? (
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="font-black text-yellow-300"
            >
              Back to Login
            </button>
          ) : (
            <>
              {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type="button"
                onClick={() => switchMode(isRegister ? 'login' : 'register')}
                className="font-black text-yellow-300"
              >
                {isRegister ? 'Login' : 'Register'}
              </button>
            </>
          )}
        </p>
      </section>
    </div>
  )
}
