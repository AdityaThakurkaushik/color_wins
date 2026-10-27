
import { useState } from 'react'

export default function Auth({ onLogin }) {
  const [mode, setMode] = useState(() =>
    new URLSearchParams(window.location.search).get('ref')
      ? 'register'
      : 'login'
  )

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [mobile, setMobile] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [error, setError] = useState('')

  const [referralCode, setReferralCode] = useState(() => {
    return new URLSearchParams(window.location.search).get('ref') || ''
  })

  const isRegister = mode === 'register'

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (isRegister) {
      if (!username.trim() || !email.trim() || !mobile.trim()) {
        setError('Please complete all required fields.')
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

      try {
        const response = await fetch(
          'https://color-wins.onrender.com/api/auth/register',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              username: username.trim(),
              email: email.trim(),
              mobileNumber: mobile.trim(),
              password: password,
              referralCode: referralCode.trim(),
            }),
          }
        )

        const data = await response.json()

        if (!response.ok) {
          setError(data.message || 'Registration failed.')
          return
        }

        setError(data.message || 'Registration successful. Please log in.')
      } catch {
        setError(
          'Cannot connect to the server. Check that Spring Boot is running.'
        )
      }

      return
    }

    if (!email.trim() || !password) {
      setError('Enter your email and password.')
      return
    }

    try {
      const response = await fetch(
        'https://color-wins.onrender.com/api/auth/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            usernameOrEmail: email.trim(),
            password: password,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'Invalid email or password.')
        return
      }

      localStorage.setItem('colorwin_token', data.token)
      setError('')
      onLogin(data.token)
    } catch {
      setError(
        'Cannot connect to the server. Check that Spring Boot is running.'
      )
    }
  }

  return (
    <div className="flex min-h-[75vh] items-center justify-center p-4">
      <section className="w-full max-w-md rounded-2xl border border-purple-800 bg-[#0d0d1c] p-5 shadow-xl shadow-purple-950/30 sm:p-7">
        <div className="mb-6 text-center">
          <div className="mb-3 text-4xl">👑</div>

          <h2 className="text-2xl font-black">
            {isRegister ? 'Create Account' : 'Welcome Back'}
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            {isRegister
              ? 'Create your ColorWin account'
              : 'Login to your ColorWin account'}
          </p>

          <p className="mt-2 text-xs text-yellow-300">
            Free-to-play · Virtual points only
          </p>
        </div>

        <div className="mb-5 grid grid-cols-2 rounded-xl border border-purple-900 bg-[#080817] p-1">
          <button
            type="button"
            onClick={() => {
              setMode('login')
              setError('')
            }}
            className={`rounded-lg py-2 text-sm font-bold ${
              !isRegister
                ? 'bg-purple-600 text-white'
                : 'text-slate-400'
            }`}
          >
            Login
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('register')
              setError('')
            }}
            className={`rounded-lg py-2 text-sm font-bold ${
              isRegister
                ? 'bg-purple-600 text-white'
                : 'text-slate-400'
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <>
              <label className="block text-sm text-slate-300">
                Username
                <input
                  required
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  placeholder="Choose a username"
                  className="mt-2 w-full rounded-lg border border-purple-900 bg-[#050510] p-3 text-white outline-none focus:border-fuchsia-500"
                />
              </label>

              <label className="block text-sm text-slate-300">
                Mobile Number
                <input
                  required
                  type="tel"
                  value={mobile}
                  onChange={(event) => setMobile(event.target.value)}
                  autoComplete="tel"
                  placeholder="Enter mobile number"
                  className="mt-2 w-full rounded-lg border border-purple-900 bg-[#050510] p-3 text-white outline-none focus:border-fuchsia-500"
                />
              </label>

              <label className="block text-sm text-slate-300">
                Referral Code (Optional)
                <input
                  value={referralCode}
                  onChange={(event) => setReferralCode(event.target.value)}
                  placeholder="Enter referral code"
                  autoComplete="off"
                  className="mt-2 w-full rounded-lg border border-purple-900 bg-[#050510] p-3 text-white outline-none focus:border-fuchsia-500"
                />
              </label>
            </>
          )}

          <label className="block text-sm text-slate-300">
            Email Address
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
              className="mt-2 w-full rounded-lg border border-purple-900 bg-[#050510] p-3 text-white outline-none focus:border-fuchsia-500"
            />
          </label>

          <label className="block text-sm text-slate-300">
            Password
            <input
              required
              type="password"
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              placeholder="Minimum 8 characters"
              className="mt-2 w-full rounded-lg border border-purple-900 bg-[#050510] p-3 text-white outline-none focus:border-fuchsia-500"
            />
          </label>

          {isRegister && (
            <>
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
                  className="mt-2 w-full rounded-lg border border-purple-900 bg-[#050510] p-3 text-white outline-none focus:border-fuchsia-500"
                />
              </label>

              <label className="flex items-start gap-2 text-sm text-slate-400">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(event) =>
                    setAcceptedTerms(event.target.checked)
                  }
                  className="mt-1 accent-fuchsia-500"
                />
                <span>I agree to the Terms and Conditions.</span>
              </label>
            </>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-300"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-yellow-500 to-amber-300 py-3 font-black text-black transition hover:brightness-110"
          >
            {isRegister ? 'CREATE ACCOUNT' : 'LOGIN'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-400">
          {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => {
              setMode(isRegister ? 'login' : 'register')
              setError('')
            }}
            className="font-bold text-fuchsia-400 hover:text-fuchsia-300"
          >
            {isRegister ? 'Login' : 'Register'}
          </button>
        </p>
      </section>
    </div>
  )
}
