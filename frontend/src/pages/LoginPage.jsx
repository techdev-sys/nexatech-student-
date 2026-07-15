import { useMemo, useState } from 'react'
import api from '../api/axios'
import heroImage from '../assets/hero.png'
import { useAuth } from '../context/AuthContext'

const DEMO_ACCESS_CODE = 'NEXATECH-DEMO'

const DEMO_ROLES = [
  { label: 'Admin Workspace', scope: 'Operations, students, finance, academics, behaviour, and communications.', email: 'admin@lordwidney.ac.zw', password: 'password' },
  { label: 'Super Admin Workspace', scope: 'Platform oversight, institution provisioning, demo approvals, and cross-school administration.', email: 'platform@studentmonitor.app', password: 'password' },
  { label: 'Teacher Workspace', scope: 'Class registers, grading, student records, timetable, and behaviour reporting.', email: 'teacher@lordwidney.ac.zw', password: 'password' },
  { label: 'Parent Workspace', scope: 'Attendance, fees, results, reports, behaviour, announcements, and timetable views.', email: 'parent@lordwidney.ac.zw', password: 'password' },
]

const FEATURES = [
  ['Performance Tracking', 'Attendance, marks, behaviour, report cards, and learner progress in one controlled profile.'],
  ['Real-Time Communication', 'Announcements, SMS, email, templates, delivery logs, and parent-school messaging workflows.'],
  ['Centralised Student Hub', 'Student 360 records for guardians, classes, documents, invoices, conduct, and results.'],
  ['Academic Administration', 'Assessments, grading systems, marks entry, results dashboards, and printable reports.'],
  ['Fee & Cashbook Control', 'Fee structures, invoicing, payment recording, income categories, expenses, and cashbook views.'],
  ['Timetable Management', 'Periods, rooms, class timetables, teacher availability, and operational scheduling views.'],
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
        <p className={`text-[11px] leading-4 uppercase ${light ? 'text-white/75' : 'text-[#44474f]'}`}>Student Monitor</p>
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
  const [mode, setMode] = useState('manual')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [approved, setApproved] = useState(false)

  const codeMessage = useMemo(() => {
    if (!code) return ''
    return code.trim().toUpperCase() === DEMO_ACCESS_CODE ? 'Approved demo access enabled.' : 'Access code not approved.'
  }, [code])

  const submitManual = e => {
    e.preventDefault()
    onManualLogin(email, password)
  }

  const verifyCode = e => {
    e.preventDefault()
    setApproved(code.trim().toUpperCase() === DEMO_ACCESS_CODE)
  }

  return (
    <div className="bg-white border border-[#D2D2D2]">
      <div className="grid grid-cols-2 border-b border-[#D2D2D2]">
        <button type="button" onClick={() => setMode('manual')} className={`h-10 text-[12px] font-bold uppercase ${mode === 'manual' ? 'bg-[#113264] text-white' : 'bg-[#F3F3F3] text-[#44474f]'}`}>Client Login</button>
        <button type="button" onClick={() => setMode('demo')} className={`h-10 text-[12px] font-bold uppercase ${mode === 'demo' ? 'bg-[#113264] text-white' : 'bg-[#F3F3F3] text-[#44474f]'}`}>Approved Demo</button>
      </div>
      <div className="p-5">
        {error && <div className="mb-4 border border-[#A80000] bg-[#ffdad6] px-3 py-2 text-[13px] text-[#93000a]">{error}</div>}
        {mode === 'manual' ? (
          <form onSubmit={submitManual} className="space-y-3">
            <Field label="Work email" value={email} onChange={setEmail} type="email" required />
            <Field label="Password" value={password} onChange={setPassword} type="password" required />
            <button type="submit" disabled={busy} className="w-full h-10 bg-[#113264] text-white text-[13px] font-bold uppercase disabled:opacity-50">{busy ? 'Signing in...' : 'Sign In'}</button>
          </form>
        ) : (
          <div className="space-y-4">
            <form onSubmit={verifyCode} className="space-y-3">
              <Field label="Approved access code" value={code} onChange={setCode} placeholder="Issued after approval" required />
              <button type="submit" className="w-full h-10 bg-[#113264] text-white text-[13px] font-bold uppercase">Verify Access</button>
              {codeMessage && <p className={`text-[12px] ${approved ? 'text-[#107C41]' : 'text-[#A80000]'}`}>{codeMessage}</p>}
            </form>
            <div className="border-t border-[#D2D2D2] pt-4 space-y-2">
              <p className="text-[11px] leading-4 font-bold uppercase text-[#44474f]">Role workspaces</p>
              {DEMO_ROLES.map(role => (
                <button key={role.label} type="button" disabled={!approved || busy} onClick={() => onDemoLogin(role)} className="w-full border border-[#D2D2D2] bg-white p-3 text-left disabled:opacity-40 hover:bg-[#F3F3F3]">
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
  const { login } = useAuth()
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

  return (
    <div className="min-h-screen bg-white text-[#1a1b1f]">
      <header className="sticky top-0 z-40 h-16 bg-white/95 border-b border-[#D2D2D2] px-4 lg:px-10 flex items-center justify-between">
        <LogoMark />
        <nav className="hidden md:flex items-center gap-7 text-[12px] font-bold uppercase text-[#44474f]">
          <a href="#home">Home</a>
          <a href="#about">About</a>
          <a href="#features">Features</a>
          <a href="#reviews">Reviews</a>
          <a href="#contact">Contact</a>
        </nav>
        <a href="#consultation" className="h-10 px-4 bg-[#113264] text-white text-[12px] font-bold uppercase flex items-center">Get In Touch</a>
      </header>

      <main>
        <section id="home" className="relative bg-[#faf9fe] border-b border-[#D2D2D2] overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_410px] min-h-[620px]">
            <div className="px-4 lg:px-10 py-12 lg:py-16 flex flex-col justify-center">
              <p className="text-[13px] leading-5 font-bold uppercase text-[#005A9C] mb-4">Connecting schools, students, and parents seamlessly</p>
              <h1 className="text-[38px] md:text-[52px] leading-tight font-bold text-[#001d45] max-w-4xl">
                Simplify school operations, strengthen engagement, and improve student outcomes.
              </h1>
              <p className="mt-5 max-w-2xl text-[16px] leading-7 text-[#44474f]">
                NEXATECH Student Monitor is a cloud-based school management platform for learner records, attendance, finance, results, behaviour, timetable operations, and parent communication.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#consultation" className="h-11 px-5 bg-[#113264] text-white text-[13px] font-bold uppercase flex items-center">Book Free Consultation</a>
                <a href="#approved-demo" className="h-11 px-5 border border-[#113264] text-[#113264] text-[13px] font-bold uppercase flex items-center">Approved Demo Access</a>
              </div>
              <div className="mt-10 grid grid-cols-3 max-w-2xl border border-[#D2D2D2] bg-white">
                {[
                  ['4', 'Role portals'],
                  ['20+', 'Operational modules'],
                  ['1', 'Connected school view'],
                ].map(([value, label]) => (
                  <div key={label} className="p-4 border-r last:border-r-0 border-[#D2D2D2]">
                    <p className="text-[28px] leading-8 font-bold text-[#113264]">{value}</p>
                    <p className="mt-1 text-[11px] uppercase text-[#44474f]">{label}</p>
                  </div>
                ))}
              </div>
            </div>
            <aside id="consultation" className="bg-white border-t lg:border-t-0 lg:border-l border-[#D2D2D2] p-4 lg:p-6 flex items-center">
              <div className="w-full">
                <h2 className="text-[20px] leading-7 font-bold text-[#001d45]">Book a Free Consultation</h2>
                <p className="mt-2 mb-5 text-[13px] leading-[18px] text-[#44474f]">Submit your institution details and our team can prepare an evaluation workspace.</p>
                <DemoRequestForm compact />
              </div>
            </aside>
          </div>
        </section>

        <section id="about" className="grid grid-cols-1 lg:grid-cols-[430px_1fr] border-b border-[#D2D2D2]">
          <div className="bg-[#113264] p-8 lg:p-10 flex items-center justify-center">
            <div className="bg-white border border-white/30 w-full max-w-sm p-8">
              <img src={heroImage} alt="School management dashboard illustration" className="w-full h-auto object-contain" />
            </div>
          </div>
          <div className="p-6 lg:p-10 flex flex-col justify-center">
            <p className="text-[11px] leading-4 font-bold uppercase text-[#005A9C] mb-3">Every student's success matters</p>
            <h2 className="text-[30px] leading-9 font-bold text-[#001d45] max-w-3xl">A central school operations platform built for accountability.</h2>
            <p className="mt-5 text-[15px] leading-7 text-[#44474f] max-w-3xl">
              The system helps schools reduce administrative fragmentation by joining learner records, academic progress, finance, communication, and operational planning in one professional environment.
            </p>
            <div className="mt-7 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
              {['Improve parent visibility', 'Standardise school records', 'Track learner performance', 'Reduce manual paperwork'].map(item => (
                <div key={item} className="border border-[#D2D2D2] bg-[#F3F3F3] px-4 py-3 text-[13px] font-bold uppercase text-[#1A1A1A]">{item}</div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="px-4 lg:px-10 py-10 border-b border-[#D2D2D2] bg-white">
          <div className="max-w-3xl mb-7">
            <p className="text-[11px] leading-4 font-bold uppercase text-[#005A9C]">Key features</p>
            <h2 className="mt-2 text-[30px] leading-9 font-bold text-[#001d45]">Everything a school needs to operate with clarity.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border border-[#D2D2D2]">
            {FEATURES.map(([title, body]) => (
              <article key={title} className="min-h-44 p-5 border-r border-b border-[#D2D2D2] bg-white">
                <p className="text-[15px] leading-5 font-bold text-[#1A1A1A] uppercase">{title}</p>
                <p className="mt-3 text-[13px] leading-[19px] text-[#44474f]">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="reviews" className="px-4 lg:px-10 py-10 bg-[#faf9fe] border-b border-[#D2D2D2]">
          <div className="max-w-3xl mb-7">
            <p className="text-[11px] leading-4 font-bold uppercase text-[#005A9C]">Happy stories</p>
            <h2 className="mt-2 text-[30px] leading-9 font-bold text-[#001d45]">Trusted by school communities that need visibility.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              ['Parent Engagement', 'The platform improves how families receive updates, reports, and important school communication.'],
              ['Administrative Control', 'School leadership can monitor finance, attendance, academic records, and operations without jumping between tools.'],
              ['Teacher Efficiency', 'Teachers gain faster access to registers, marks, timetables, behaviour reporting, and class records.'],
            ].map(([title, quote]) => (
              <figure key={title} className="bg-white border border-[#D2D2D2] p-5 min-h-44">
                <blockquote className="text-[14px] leading-6 text-[#44474f]">{quote}</blockquote>
                <figcaption className="mt-5 text-[12px] font-bold uppercase text-[#113264]">{title}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section id="approved-demo" className="grid grid-cols-1 lg:grid-cols-[1fr_430px] border-b border-[#D2D2D2]">
          <div className="p-6 lg:p-10 bg-[#113264] text-white">
            <LogoMark light />
            <h2 className="mt-8 text-[32px] leading-10 font-bold max-w-3xl">Approved evaluators can explore role-specific workspaces.</h2>
            <p className="mt-4 text-[15px] leading-7 text-white/80 max-w-2xl">
              Once a demo request is approved, the visitor receives an access code and can evaluate the system from the admin, super-admin, teacher, and parent perspectives.
            </p>
          </div>
          <div className="p-4 lg:p-6 bg-[#F3F3F3]">
            <AccessPanel onManualLogin={handleLogin} onDemoLogin={role => handleLogin(role.email, role.password)} busy={loading} error={error} />
            <p className="mt-3 text-[11px] leading-4 text-[#747780]">Demo access codes are issued after internal approval.</p>
          </div>
        </section>

        <section id="contact" className="grid grid-cols-1 md:grid-cols-2 border-b border-[#D2D2D2] bg-white">
          <div className="p-6 lg:p-8 border-r border-[#D2D2D2]">
            <p className="text-[13px] font-bold uppercase text-[#001d45]">Call Us</p>
            <p className="mt-3 text-[13px] text-[#44474f]">+263 781 312 079</p>
            <p className="mt-1 text-[13px] text-[#44474f]">+263 777 432 518</p>
          </div>
          <div className="p-6 lg:p-8">
            <p className="text-[13px] font-bold uppercase text-[#001d45]">Zimbabwe Office</p>
            <p className="mt-3 text-[13px] text-[#44474f]">2140 Pike Way, Hatfield, Harare</p>
          </div>
        </section>
      </main>

      <footer className="bg-[#001d45] text-white px-4 lg:px-10 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <LogoMark light />
        <p className="text-[12px] text-white/70">Copyright 2026 NEXATECH Student Monitor. Powered by NEXATECH.</p>
      </footer>
    </div>
  )
}
