import { useState } from 'react'
import api from '../api/axios'
import heroImage from '../assets/hero.png'
import { useAuth } from '../context/AuthContext'

const DEMO_ROLES = [
  { role: 'admin', label: 'Admin Workspace', scope: 'Explore operations, students, finance, academics, behaviour, and communications in read-only mode.' },
  { role: 'teacher', label: 'Teacher Workspace', scope: 'Explore class registers, grading, student records, timetables, and behaviour reporting in read-only mode.' },
  { role: 'parent', label: 'Parent Workspace', scope: 'Explore attendance, fees, results, reports, behaviour, announcements, and timetables in read-only mode.' },
]

const FEATURES = [
  {
    title: 'Fast Marks',
    body: 'Keyboard-first capture, spreadsheet paste, validation, autosave, and trusted result retrieval.',
    tags: ['Capture', 'Validate', 'Retrieve'],
  },
  {
    title: 'Real-Time Communication',
    body: 'Announcements, SMS, email, templates, delivery logs, and parent-school messaging workflows.',
    tags: ['SMS', 'Email', 'Notices'],
  },
  {
    title: 'Centralised Student Hub',
    body: 'Student 360 records for guardians, classes, documents, invoices, conduct, and results.',
    tags: ['Profiles', 'Guardians', 'Records'],
  },
  {
    title: 'Academic Administration',
    body: 'Assessments, grading systems, marks entry, results dashboards, and printable reports.',
    tags: ['Assessments', 'Grades', 'Reports'],
  },
  {
    title: 'Fee & Cashbook Control',
    body: 'Fee structures, invoicing, payment recording, income categories, expenses, and cashbook views.',
    tags: ['Invoices', 'Payments', 'Cashbook'],
  },
  {
    title: 'Timetable Management',
    body: 'Periods, rooms, class timetables, teacher availability, and operational scheduling views.',
    tags: ['Periods', 'Rooms', 'Scheduling'],
  },
]

const OUTCOMES = [
  'Improve parent visibility',
  'Standardise school records',
  'Track learner performance',
  'Reduce manual paperwork',
]

const FAST_MARKS_STEPS = [
  ['01', 'Prepare', 'Choose the class, subject, term, year, and assessment from controlled records.'],
  ['02', 'Capture', 'Enter with the keyboard or paste a column of marks from a spreadsheet.'],
  ['03', 'Save', 'See validation and save status clearly while idempotent writes prevent duplicates.'],
  ['04', 'Retrieve', 'Use connected class, learner, term, and assessment result views.'],
]

function LogoMark({ light = false }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className={`relative h-11 w-11 border ${light ? 'border-white/30 bg-white' : 'border-[#D2D2D2] bg-white'} flex items-center justify-center shrink-0`}>
        <div className="absolute left-1.5 top-1.5 h-3.5 w-3.5 bg-[#113264]" />
        <div className="absolute right-1.5 top-1.5 h-3.5 w-3.5 bg-[#005A9C]" />
        <div className="absolute left-1.5 bottom-1.5 h-3.5 w-3.5 bg-[#107C41]" />
        <div className="absolute right-1.5 bottom-1.5 h-3.5 w-3.5 bg-[#B75700]" />
      </div>
      <div className="min-w-0">
        <p className={`text-[16px] leading-5 font-bold uppercase ${light ? 'text-white' : 'text-[#1A1A1A]'}`}>NEXATECH</p>
        <p className={`text-[11px] leading-4 uppercase ${light ? 'text-white/75' : 'text-[#44474f]'}`}>School Operations Platform</p>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', required = false, placeholder = '' }) {
  return (
    <label className="block">
      <span className="block text-[11px] leading-4 font-bold uppercase text-[#44474f] mb-1">{label}</span>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full h-10 border border-[#D2D2D2] bg-white px-3 text-[13px] outline-none focus:border-[#005A9C]"
      />
    </label>
  )
}

function DemoRequestForm({ compact = false }) {
  const [form, setForm] = useState({ name: '', institution: '', email: '', phone: '', role: '', country: '' })
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const set = key => value => setForm(prev => ({ ...prev, [key]: value }))

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await api.post('/api/demo-requests', form)
      setSubmitted(true)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not submit the demo request. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="border border-[#107C41] bg-white p-4">
        <p className="text-[13px] leading-[18px] font-bold text-[#107C41] uppercase">Request received</p>
        <p className="mt-2 text-[13px] leading-[18px] text-[#44474f]">The evaluation request is pending approval. Approved visitors receive a demo access code and role workspace instructions.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={`grid grid-cols-1 ${compact ? '' : 'md:grid-cols-2'} gap-3`}>
      <Field label="Full name" value={form.name} onChange={set('name')} required />
      <Field label="Institution" value={form.institution} onChange={set('institution')} required />
      <Field label="Work email" value={form.email} onChange={set('email')} type="email" required />
      <Field label="Phone" value={form.phone} onChange={set('phone')} required />
      <Field label="Role" value={form.role} onChange={set('role')} placeholder="Principal, Director, Administrator" />
      <Field label="Country" value={form.country} onChange={set('country')} />
      {error && <div className={`${compact ? '' : 'md:col-span-2'} border border-[#A80000] bg-[#ffdad6] px-3 py-2 text-[13px] text-[#93000a]`}>{error}</div>}
      <div className={`${compact ? '' : 'md:col-span-2'} flex justify-end`}>
        <button disabled={submitting} className="h-10 px-5 bg-[#113264] text-white text-[13px] font-bold uppercase disabled:opacity-50" type="submit">
          {submitting ? 'Submitting...' : 'Book Consultation'}
        </button>
      </div>
    </form>
  )
}

function AccessPanel({ onManualLogin, onDemoLogin, busy, error }) {
  const query = new URLSearchParams(window.location.search)
  const [mode, setMode] = useState('manual')
  const [manualView, setManualView] = useState(query.get('reset_token') ? 'reset' : 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [demoEmail, setDemoEmail] = useState('')
  const [code, setCode] = useState('')
  const [recoveryEmail, setRecoveryEmail] = useState(query.get('email') || '')
  const [resetToken] = useState(query.get('reset_token') || '')
  const [newPassword, setNewPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [recoveryBusy, setRecoveryBusy] = useState(false)
  const [recoveryMessage, setRecoveryMessage] = useState('')
  const [recoveryError, setRecoveryError] = useState('')

  const submitManual = e => {
    e.preventDefault()
    onManualLogin(email, password)
  }

  const requestReset = async e => {
    e.preventDefault()
    setRecoveryBusy(true)
    setRecoveryError('')
    try {
      const { data } = await api.post('/api/forgot-password', { email: recoveryEmail })
      setRecoveryMessage(data.message)
    } catch (err) {
      setRecoveryError(err.response?.data?.message || 'Password recovery could not be started.')
    } finally {
      setRecoveryBusy(false)
    }
  }

  const submitReset = async e => {
    e.preventDefault()
    setRecoveryBusy(true)
    setRecoveryError('')
    try {
      const { data } = await api.post('/api/reset-password', {
        token: resetToken,
        email: recoveryEmail,
        password: newPassword,
        password_confirmation: passwordConfirmation,
      })
      setRecoveryMessage(data.message)
      setManualView('login')
      window.history.replaceState({}, '', window.location.pathname + window.location.hash)
    } catch (err) {
      setRecoveryError(err.response?.data?.message || 'The password reset link is invalid or expired.')
    } finally {
      setRecoveryBusy(false)
    }
  }

  return (
    <div className="bg-white border border-[#D2D2D2]">
      <div className="grid grid-cols-2 border-b border-[#D2D2D2]">
        <button type="button" onClick={() => setMode('manual')} className={`h-10 text-[12px] font-bold uppercase ${mode === 'manual' ? 'bg-[#113264] text-white' : 'bg-[#F3F3F3] text-[#44474f]'}`}>Client Login</button>
        <button type="button" onClick={() => setMode('demo')} className={`h-10 text-[12px] font-bold uppercase ${mode === 'demo' ? 'bg-[#113264] text-white' : 'bg-[#F3F3F3] text-[#44474f]'}`}>Approved Demo</button>
      </div>
      <div className="p-5">
        {error && <div className="mb-4 border border-[#A80000] bg-[#ffdad6] px-3 py-2 text-[13px] text-[#93000a]">{error}</div>}
        {recoveryMessage && <div className="mb-4 border border-[#107C41] bg-[#e7f3ec] px-3 py-2 text-[13px] text-[#0b6b35]">{recoveryMessage}</div>}
        {recoveryError && <div className="mb-4 border border-[#A80000] bg-[#ffdad6] px-3 py-2 text-[13px] text-[#93000a]">{recoveryError}</div>}
        {mode === 'manual' && manualView === 'login' ? (
          <form onSubmit={submitManual} className="space-y-3">
            <Field label="Work email" value={email} onChange={setEmail} type="email" required />
            <Field label="Password" value={password} onChange={setPassword} type="password" required />
            <button type="submit" disabled={busy} className="w-full h-10 bg-[#113264] text-white text-[13px] font-bold uppercase disabled:opacity-50">{busy ? 'Signing in...' : 'Sign In'}</button>
            <button type="button" onClick={() => { setManualView('forgot'); setRecoveryMessage(''); setRecoveryError('') }} className="w-full text-[12px] font-bold uppercase text-[#005A9C] underline">Forgot password?</button>
          </form>
        ) : mode === 'manual' && manualView === 'forgot' ? (
          <form onSubmit={requestReset} className="space-y-3">
            <p className="text-[13px] leading-[18px] text-[#44474f]">Enter your account email. If it exists, we will send a time-limited reset link.</p>
            <Field label="Work email" value={recoveryEmail} onChange={setRecoveryEmail} type="email" required />
            <button type="submit" disabled={recoveryBusy} className="w-full h-10 bg-[#113264] text-white text-[13px] font-bold uppercase disabled:opacity-50">{recoveryBusy ? 'Sending...' : 'Send reset link'}</button>
            <button type="button" onClick={() => setManualView('login')} className="w-full text-[12px] font-bold uppercase text-[#005A9C] underline">Back to sign in</button>
          </form>
        ) : mode === 'manual' ? (
          <form onSubmit={submitReset} className="space-y-3">
            <p className="text-[13px] leading-[18px] text-[#44474f]">Choose a password with at least 12 characters, uppercase and lowercase letters, and a number.</p>
            <Field label="Work email" value={recoveryEmail} onChange={setRecoveryEmail} type="email" required />
            <Field label="New password" value={newPassword} onChange={setNewPassword} type="password" required />
            <Field label="Confirm password" value={passwordConfirmation} onChange={setPasswordConfirmation} type="password" required />
            <button type="submit" disabled={recoveryBusy} className="w-full h-10 bg-[#113264] text-white text-[13px] font-bold uppercase disabled:opacity-50">{recoveryBusy ? 'Resetting...' : 'Reset password'}</button>
          </form>
        ) : (
          <div className="space-y-4">
            <form onSubmit={e => e.preventDefault()} className="space-y-3">
              <Field label="Approved work email" value={demoEmail} onChange={setDemoEmail} type="email" required />
              <Field label="Approved access code" value={code} onChange={setCode} placeholder="Issued after approval" required />
              <p className="text-[12px] leading-4 text-[#44474f]">Choose one workspace to redeem this single-use code. Access is validated securely by the server.</p>
            </form>
            <div className="border-t border-[#D2D2D2] pt-4 space-y-2">
              <p className="text-[11px] leading-4 font-bold uppercase text-[#44474f]">Role workspaces</p>
              {DEMO_ROLES.map(role => (
                <button key={role.role} type="button" disabled={!demoEmail || !code || busy} onClick={() => onDemoLogin(demoEmail, code, role.role)} className="w-full border border-[#D2D2D2] bg-white p-3 text-left disabled:opacity-40 hover:bg-[#F3F3F3]">
                  <span className="block text-[13px] leading-[18px] font-bold text-[#1A1A1A] uppercase">{role.label}</span>
                  <span className="block mt-1 text-[12px] leading-4 text-[#44474f]">{role.scope}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function LoginPage() {
  const { login, redeemDemo } = useAuth()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (email, password) => {
    setError('')
    setLoading(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed. Verify credentials and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLogin = async (email, code, role) => {
    setError('')
    setLoading(true)
    try {
      await redeemDemo(email, code, role)
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.access_code?.[0] || 'Demo access could not be redeemed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white text-[#1a1b1f]">
      <header className="sticky top-0 z-40 h-16 bg-white border-b-2 border-[#113264] shadow-[0_1px_0_rgba(17,50,100,0.06)] px-4 lg:px-10 flex items-center justify-between">
        <LogoMark />
        <nav className="hidden md:flex items-center gap-7 text-[12px] font-bold uppercase text-[#44474f]">
          <a href="#home">Home</a>
          <a href="#platform">Platform</a>
          <a href="#fast-marks">Fast Marks</a>
          <a href="#features">Modules</a>
        </nav>
        <a href="#consultation" className="h-10 px-4 bg-[#113264] text-white text-[12px] font-bold uppercase flex items-center">Get In Touch</a>
      </header>

      <main>
        <section id="home" className="relative bg-[#faf9fe] border-b border-[#D2D2D2] overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] min-h-[500px]">
            <div className="px-4 lg:px-10 py-9 lg:py-10 flex flex-col justify-center">
              <p className="text-[12px] leading-5 font-bold uppercase text-[#005A9C] mb-3">Nexatech School Operations Platform</p>
              <h1 className="text-[34px] md:text-[44px] leading-[1.08] font-bold text-[#001d45] max-w-3xl">
                Capture once. Run connected workflows. Retrieve trusted information.
              </h1>
              <p className="mt-4 max-w-2xl text-[15px] leading-6 text-[#44474f]">
                Nexatech helps schools capture records faster, run connected workflows, and retrieve trusted information when it is needed.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href="#consultation" className="h-11 px-5 bg-[#113264] text-white text-[13px] font-bold uppercase flex items-center">Book Free Consultation</a>
                <a href="#approved-demo" className="h-11 px-5 border border-[#113264] text-[#113264] text-[13px] font-bold uppercase flex items-center">Approved Demo Access</a>
              </div>
              <div className="mt-7 grid grid-cols-3 max-w-2xl border border-[#D2D2D2] bg-white">
                {[
                  ['One', 'Shared school record'],
                  ['6+', 'Core workflows'],
                  ['Role-based', 'Controlled access'],
                ].map(([value, label]) => (
                  <div key={label} className="p-4 border-r last:border-r-0 border-[#D2D2D2]">
                    <p className="text-[24px] leading-7 font-bold text-[#113264]">{value}</p>
                    <p className="mt-1 text-[11px] uppercase text-[#44474f]">{label}</p>
                  </div>
                ))}
              </div>
            </div>
            <aside id="consultation" className="scroll-mt-16 bg-white border-t lg:border-t-0 lg:border-l border-[#D2D2D2] p-4 lg:p-5 flex items-center">
              <div className="w-full">
                <h2 className="text-[20px] leading-7 font-bold text-[#001d45]">Book a Free Consultation</h2>
                <p className="mt-2 mb-5 text-[13px] leading-[18px] text-[#44474f]">Submit your institution details and our team can prepare an evaluation workspace.</p>
                <DemoRequestForm compact />
              </div>
            </aside>
          </div>
        </section>

        <section id="platform" className="scroll-mt-16 grid grid-cols-1 lg:grid-cols-[430px_1fr] border-b border-[#D2D2D2]">
          <div className="bg-[#113264] p-8 lg:p-10 flex items-center justify-center">
            <div className="bg-white border border-white/30 w-full max-w-sm p-8">
              <img src={heroImage} alt="School management dashboard illustration" className="w-full h-auto object-contain" />
            </div>
          </div>
          <div className="p-6 lg:p-10 flex flex-col justify-center">
            <p className="text-[11px] leading-4 font-bold uppercase text-[#005A9C] mb-3">One connected operating layer</p>
            <h2 className="text-[30px] leading-9 font-bold text-[#001d45] max-w-3xl">The same trusted school data, working across every workflow.</h2>
            <p className="mt-5 text-[15px] leading-7 text-[#44474f] max-w-3xl">
              Student records, academics, attendance, behaviour, finance, timetables, communication, examinations, report cards, and parent access use one school context instead of disconnected files.
            </p>
            <div className="mt-7 max-w-4xl border-y-2 border-[#113264]">
              <p className="pt-3 text-[10px] leading-4 font-mono font-bold uppercase tracking-[0.14em] text-[#6A6E76]">Operational outcomes</p>
              <div className="grid grid-cols-1 md:grid-cols-4 py-3">
                {OUTCOMES.map(item => (
                  <div key={item} className="flex items-start gap-2.5 py-2 md:px-4 first:md:pl-0 border-b last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0 border-[#D2D2D2]">
                    <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#107C41] shrink-0" />
                    <span className="text-[11px] leading-4 font-bold uppercase text-[#1A1A1A]">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="fast-marks" className="scroll-mt-16 grid grid-cols-1 lg:grid-cols-[0.82fr_1.18fr] bg-[#001d45] text-white border-b-2 border-[#113264]">
          <div className="p-6 lg:p-10 lg:border-r border-white/20 flex flex-col justify-center">
            <p className="text-[11px] leading-4 font-mono font-bold uppercase tracking-[0.14em] text-[#74B9E6]">Flagship workflow / Fast Marks</p>
            <h2 className="mt-3 text-[32px] md:text-[38px] leading-tight font-bold max-w-xl">From class roster to trusted result—without rebuilding a spreadsheet.</h2>
            <p className="mt-5 text-[15px] leading-7 text-white/75 max-w-xl">
              Teachers can capture or paste marks quickly, see errors immediately, save safely, and use the same result across reports and authorized views.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              {['Keyboard-first', 'Spreadsheet paste', 'Autosave', 'Duplicate-safe'].map(tag => (
                <span key={tag} className="border border-white/30 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-white/85">{tag}</span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2">
            {FAST_MARKS_STEPS.map(([number, title, body]) => (
              <article key={title} className="p-6 lg:p-8 border-b border-r border-white/20">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-[15px] font-bold uppercase">{title}</h3>
                  <span className="font-mono text-[11px] text-white/45">{number}</span>
                </div>
                <p className="mt-3 text-[13px] leading-5 text-white/70">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="features" className="scroll-mt-16 px-4 lg:px-10 py-10 border-b border-[#D2D2D2] bg-white">
          <div className="max-w-3xl mb-7">
            <p className="text-[11px] leading-4 font-bold uppercase text-[#005A9C]">Connected workflow modules</p>
            <h2 className="mt-2 text-[30px] leading-9 font-bold text-[#001d45]">One platform foundation. Practical workflows for each team.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border-2 border-[#113264]">
            {FEATURES.map(({ title, body, tags }, index) => (
              <article key={title} className="px-5 pt-5 pb-3.5 border-r border-b border-[#B8BEC7] bg-white">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-[15px] leading-5 font-bold text-[#1A1A1A] uppercase">{title}</p>
                  <span className="font-mono text-[11px] leading-5 tracking-[0.12em] text-[#8A8D94]" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>
                <p className="mt-2.5 text-[13px] leading-[19px] text-[#44474f]">{body}</p>
                <div className="mt-4 flex flex-wrap gap-1.5" aria-label={`${title} capabilities`}>
                  {tags.map(tag => (
                    <span key={tag} className="border border-[#D8DADE] bg-[#F7F8FA] px-2 py-1 font-mono text-[10px] leading-3 uppercase tracking-[0.04em] text-[#555A63]">
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="approved-demo" className="scroll-mt-16 grid grid-cols-1 lg:grid-cols-[1fr_430px] border-b border-[#D2D2D2]">
          <div className="p-6 lg:p-10 bg-[#113264] text-white">
            <LogoMark light />
            <h2 className="mt-8 text-[32px] leading-10 font-bold max-w-3xl">Approved evaluators can explore role-specific workspaces.</h2>
            <p className="mt-4 text-[15px] leading-7 text-white/80 max-w-2xl">
              Once a demo request is approved, the visitor receives an access code and can evaluate the system from the admin, super-admin, teacher, and parent perspectives.
            </p>
          </div>
          <div className="p-4 lg:p-6 bg-[#F3F3F3]">
            <AccessPanel onManualLogin={handleLogin} onDemoLogin={handleDemoLogin} busy={loading} error={error} />
            <p className="mt-3 text-[11px] leading-4 text-[#5F626A]">Demo access codes are issued after internal approval.</p>
          </div>
        </section>

        <section id="contact" className="scroll-mt-16 grid grid-cols-1 md:grid-cols-2 border-b border-[#D2D2D2] bg-white">
          <div className="p-6 lg:p-8 border-r border-[#D2D2D2]">
            <p className="text-[13px] font-bold uppercase text-[#001d45]">Primary contact</p>
            <a className="inline-block mt-3 text-[15px] font-semibold text-[#005A9C] underline" href="tel:+263781312078">0781 312 078</a>
          </div>
          <div className="p-6 lg:p-8">
            <p className="text-[13px] font-bold uppercase text-[#001d45]">Alternative contact</p>
            <a className="inline-block mt-3 text-[15px] font-semibold text-[#005A9C] underline" href="tel:+263772616284">0772 616 284</a>
          </div>
        </section>
      </main>

      <footer className="bg-[#001d45] text-white px-4 lg:px-10 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <LogoMark light />
        <div className="flex flex-col md:items-end gap-2">
          <nav aria-label="Legal" className="flex gap-4 text-[12px]">
            <a className="text-white underline" href="/privacy.html">Privacy</a>
            <a className="text-white underline" href="/terms.html">Terms</a>
          </nav>
          <p className="text-[12px] text-white/70">Copyright 2026 Nexatech School Operations Platform. Powered by NEXATECH.</p>
        </div>
      </footer>
    </div>
  )
}
