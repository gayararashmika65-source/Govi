'use client'
import { useEffect, useState } from 'react'
import { useApp, api } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Save, ShieldCheck, Upload, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { SRI_LANKAN_DISTRICTS, COMMON_CROPS } from '@/lib/types'
import { ImageUpload } from '@/components/govisahana/shared/image-upload'
import { VerifiedBadge } from '@/components/govisahana/badges'

type Profile = {
  id: string; email: string; name: string; phone?: string | null; role: string; avatarUrl?: string | null; status: string
  farmerProfile?: any; expertProfile?: any; enterpriseProfile?: any; workerProfile?: any; buyerProfile?: any
}

export default function OnboardingView() {
  const { user, setView, refreshUser } = useApp()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [verificationDoc, setVerificationDoc] = useState('')

  useEffect(() => {
    if (!user) { setView('login'); return }
    fetch('/api/profile', { credentials: 'include' }).then((r) => r.json()).then((d) => { setProfile(d.profile); setLoading(false) }).catch(() => setLoading(false))
  }, [user, setView])

  if (!user) return null
  if (loading) return <div className="mx-auto max-w-2xl p-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div>
  if (!profile) return <div className="mx-auto max-w-2xl p-10 text-center text-muted-foreground">Unable to load profile.</div>

  const isExpert = profile.role === 'EXPERT'
  const ep = profile.expertProfile

  const save = async (payload: Record<string, unknown>) => {
    setSaving(true)
    try {
      await api('/api/profile', { method: 'PUT', body: JSON.stringify(payload) })
      await refreshUser()
      toast.success('Profile saved')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const submitVerification = async () => {
    if (!verificationDoc) { toast.error('Please upload your qualification document'); return }
    try {
      await api('/api/experts/verify', { method: 'POST', body: JSON.stringify({ documentPath: verificationDoc, note: 'Submitted via profile' }) })
      toast.success('Verification document submitted for review')
      setVerificationDoc('')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">My Profile</h1>
          <p className="text-sm text-muted-foreground">Complete your profile to get the most out of GoviSahana</p>
        </div>
        <Button variant="outline" onClick={() => setView('dashboard')}>Back to dashboard</Button>
      </div>

      {/* Account basics */}
      <Card className="mb-5">
        <CardHeader><CardTitle className="text-lg">Account details</CardTitle><CardDescription>Your name, contact and avatar.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <AccountForm profile={profile} saving={saving} onSave={save} />
        </CardContent>
      </Card>

      {/* Role-specific profile */}
      <Card className="mb-5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            {profile.role === 'FARMER' && 'Farm details'}
            {profile.role === 'EXPERT' && (<><ShieldCheck className="h-5 w-5 text-primary" /> Expert profile</>)}
            {profile.role === 'ENTERPRISE' && 'Business details'}
            {profile.role === 'WORKER' && 'Worker profile'}
            {profile.role === 'BUYER' && 'Buyer profile'}
          </CardTitle>
          <CardDescription>{profile.role === 'EXPERT' ? 'Build trust with farmers by completing your professional profile.' : 'Keep this up to date so others can find and trust you.'}</CardDescription>
        </CardHeader>
        <CardContent>
          {profile.role === 'FARMER' && <FarmerForm profile={profile} saving={saving} onSave={save} />}
          {profile.role === 'EXPERT' && <ExpertForm profile={profile} saving={saving} onSave={save} />}
          {profile.role === 'ENTERPRISE' && <EnterpriseForm profile={profile} saving={saving} onSave={save} />}
          {profile.role === 'WORKER' && <WorkerForm profile={profile} saving={saving} onSave={save} />}
          {profile.role === 'BUYER' && <BuyerForm profile={profile} saving={saving} onSave={save} />}
          {profile.role === 'ADMIN' && <p className="text-sm text-muted-foreground">Administrators manage the platform from the dashboard.</p>}
        </CardContent>
      </Card>

      {/* Expert verification */}
      {isExpert && (
        <Card className="mb-5 border-amber-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Verification</span>
              <VerifiedBadge verified={!!ep?.verified} />
            </CardTitle>
            <CardDescription>
              {ep?.verified
                ? 'You are a verified expert. Your verified badge is visible to farmers.'
                : 'Upload a qualification document (degree certificate, professional registration) to receive a verified badge. It will be reviewed by an administrator.'}
            </CardDescription>
          </CardHeader>
          {!ep?.verified && (
            <CardContent className="space-y-3">
              <ImageUpload value={verificationDoc} onChange={setVerificationDoc} accept="image/*,application/pdf" label="Upload qualification document" />
              <Button onClick={submitVerification} disabled={!verificationDoc}><Upload className="mr-2 h-4 w-4" /> Submit for verification</Button>
            </CardContent>
          )}
        </Card>
      )}

      {user.profileComplete && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4" /> Your profile is complete.
        </div>
      )}
    </div>
  )
}

function AccountForm({ profile, saving, onSave }: { profile: Profile; saving: boolean; onSave: (p: Record<string, unknown>) => void }) {
  const [name, setName] = useState(profile.name || '')
  const [phone, setPhone] = useState(profile.phone || '')
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || '')
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <ImageUpload value={avatarUrl} onChange={setAvatarUrl} label="Profile photo" className="max-w-[200px]" />
        <div className="flex-1 space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={profile.email} disabled className="bg-muted/50" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="077 123 4567" />
        </div>
      </div>
      <Button disabled={saving} onClick={() => onSave({ name, phone, avatarUrl })}>
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save account
      </Button>
    </div>
  )
}

function FarmerForm({ profile, saving, onSave }: { profile: Profile; saving: boolean; onSave: (p: Record<string, unknown>) => void }) {
  const p = profile.farmerProfile || {}
  const [district, setDistrict] = useState(p.district || '')
  const [location, setLocation] = useState(p.location || '')
  const [farmSizeAcres, setFarmSizeAcres] = useState(p.farmSizeAcres || '')
  const [crops, setCrops] = useState(p.crops || '')
  const [bio, setBio] = useState(p.bio || '')
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>District</Label>
          <Select value={district} onValueChange={setDistrict}>
            <SelectTrigger><SelectValue placeholder="Select district" /></SelectTrigger>
            <SelectContent>{SRI_LANKAN_DISTRICTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Location / Village</Label>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Kekirawa" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Farm size (acres)</Label>
          <Input type="number" step="0.1" value={farmSizeAcres} onChange={(e) => setFarmSizeAcres(Number(e.target.value))} placeholder="e.g. 3.5" />
        </div>
        <div className="space-y-2">
          <Label>Crops grown</Label>
          <Select value="" onValueChange={(v) => setCrops((c) => (c ? `${c},${v}` : v))}>
            <SelectTrigger><SelectValue placeholder="Add a crop" /></SelectTrigger>
            <SelectContent>{COMMON_CROPS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      {crops && (
        <div className="flex flex-wrap gap-1.5">
          {crops.split(',').filter(Boolean).map((c, i) => (
            <button key={c + i} onClick={() => setCrops(crops.split(',').filter((x: string) => x !== c).join(','))} className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary hover:bg-primary/20">
              {c} ✕
            </button>
          ))}
        </div>
      )}
      <div className="space-y-2"><Label>Bio</Label><Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell experts about your farm and experience" rows={3} /></div>
      <Button disabled={saving} onClick={() => onSave({ farmer: { district, location, farmSizeAcres: farmSizeAcres === '' ? undefined : Number(farmSizeAcres), crops, bio } })}>
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save farm details
      </Button>
    </div>
  )
}

function ExpertForm({ profile, saving, onSave }: { profile: Profile; saving: boolean; onSave: (p: Record<string, unknown>) => void }) {
  const p = profile.expertProfile || {}
  const [title, setTitle] = useState(p.title || '')
  const [qualifications, setQualifications] = useState(p.qualifications || '')
  const [expertise, setExpertise] = useState(p.expertise || '')
  const [crops, setCrops] = useState(p.crops || '')
  const [languages, setLanguages] = useState(p.languages || '')
  const [serviceAreas, setServiceAreas] = useState(p.serviceAreas || '')
  const [bio, setBio] = useState(p.bio || '')
  const [hourlyRate, setHourlyRate] = useState(p.hourlyRate ?? '')
  const [available, setAvailable] = useState(p.available ?? true)
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label>Professional title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Agricultural Officer" /></div>
        <div className="space-y-2"><Label>Languages (comma separated)</Label><Input value={languages} onChange={(e) => setLanguages(e.target.value)} placeholder="Sinhala, English, Tamil" /></div>
      </div>
      <div className="space-y-2"><Label>Qualifications</Label><Textarea value={qualifications} onChange={(e) => setQualifications(e.target.value)} placeholder="BSc Agriculture, MSc Plant Pathology…" rows={2} /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label>Areas of expertise (comma separated)</Label><Input value={expertise} onChange={(e) => setExpertise(e.target.value)} placeholder="Plant Pathology, Pest Management" /></div>
        <div className="space-y-2"><Label>Crops you advise on (comma separated)</Label><Input value={crops} onChange={(e) => setCrops(e.target.value)} placeholder="Rice (Paddy), Vegetables" /></div>
      </div>
      <div className="space-y-2"><Label>Service areas (districts, comma separated)</Label><Input value={serviceAreas} onChange={(e) => setServiceAreas(e.target.value)} placeholder="Anuradhapura, Polonnaruwa" /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label>Hourly rate (Rs.)</Label><Input type="number" value={hourlyRate} onChange={(e) => setHourlyRate(Number(e.target.value))} placeholder="1500" /></div>
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div><div className="text-sm font-medium">Available for consultations</div><div className="text-xs text-muted-foreground">Toggle off to pause new requests</div></div>
          <Switch checked={available} onCheckedChange={setAvailable} />
        </div>
      </div>
      <div className="space-y-2"><Label>Bio</Label><Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Describe your experience and how you help farmers" rows={3} /></div>
      <Button disabled={saving} onClick={() => onSave({ expert: { title, qualifications, expertise, crops, languages, serviceAreas, bio, hourlyRate: hourlyRate === '' ? undefined : Number(hourlyRate), available } })}>
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save expert profile
      </Button>
    </div>
  )
}

function EnterpriseForm({ profile, saving, onSave }: { profile: Profile; saving: boolean; onSave: (p: Record<string, unknown>) => void }) {
  const p = profile.enterpriseProfile || {}
  const [businessName, setBusinessName] = useState(p.businessName || '')
  const [businessType, setBusinessType] = useState(p.businessType || '')
  const [registrationNo, setRegistrationNo] = useState(p.registrationNo || '')
  const [district, setDistrict] = useState(p.district || '')
  const [address, setAddress] = useState(p.address || '')
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label>Business name</Label><Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} /></div>
        <div className="space-y-2"><Label>Business type</Label>
          <Select value={businessType} onValueChange={setBusinessType}>
            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>
              {['Seed Supplier', 'Fertilizer Retailer', 'Agrochemicals', 'Equipment Dealer', 'Irrigation Provider', 'Agri-Tech Company', 'Nursery', 'Other'].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label>Registration no.</Label><Input value={registrationNo} onChange={(e) => setRegistrationNo(e.target.value)} /></div>
        <div className="space-y-2"><Label>District</Label>
          <Select value={district} onValueChange={setDistrict}><SelectTrigger><SelectValue placeholder="Select district" /></SelectTrigger><SelectContent>{SRI_LANKAN_DISTRICTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select>
        </div>
      </div>
      <div className="space-y-2"><Label>Address</Label><Textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} /></div>
      <Button disabled={saving} onClick={() => onSave({ enterprise: { businessName, businessType, registrationNo, district, address } })}>
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save business details
      </Button>
    </div>
  )
}

function WorkerForm({ profile, saving, onSave }: { profile: Profile; saving: boolean; onSave: (p: Record<string, unknown>) => void }) {
  const p = profile.workerProfile || {}
  const [skills, setSkills] = useState(p.skills || '')
  const [experience, setExperience] = useState(p.experience || '')
  const [district, setDistrict] = useState(p.district || '')
  const [available, setAvailable] = useState(p.available ?? true)
  const [bio, setBio] = useState(p.bio || '')
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label>Skills (comma separated)</Label><Input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Harvesting, Spraying, Tractor Operation" /></div>
        <div className="space-y-2"><Label>District</Label><Select value={district} onValueChange={setDistrict}><SelectTrigger><SelectValue placeholder="Select district" /></SelectTrigger><SelectContent>{SRI_LANKAN_DISTRICTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></div>
      </div>
      <div className="space-y-2"><Label>Experience</Label><Textarea value={experience} onChange={(e) => setExperience(e.target.value)} rows={2} /></div>
      <div className="space-y-2"><Label>Bio</Label><Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={2} /></div>
      <div className="flex items-center justify-between rounded-lg border border-border p-3">
        <div className="text-sm font-medium">Available for work</div>
        <Switch checked={available} onCheckedChange={setAvailable} />
      </div>
      <Button disabled={saving} onClick={() => onSave({ worker: { skills, experience, district, available, bio } })}>
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save worker profile
      </Button>
    </div>
  )
}

function BuyerForm({ profile, saving, onSave }: { profile: Profile; saving: boolean; onSave: (p: Record<string, unknown>) => void }) {
  const p = profile.buyerProfile || {}
  const [buyerType, setBuyerType] = useState(p.buyerType || '')
  const [company, setCompany] = useState(p.company || '')
  const [district, setDistrict] = useState(p.district || '')
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label>Buyer type</Label>
          <Select value={buyerType} onValueChange={setBuyerType}><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger><SelectContent>
            {['Wholesaler', 'Supermarket', 'Restaurant', 'Food Processor', 'Retailer', 'Exporter'].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent></Select>
        </div>
        <div className="space-y-2"><Label>Company name</Label><Input value={company} onChange={(e) => setCompany(e.target.value)} /></div>
      </div>
      <div className="space-y-2"><Label>District</Label><Select value={district} onValueChange={setDistrict}><SelectTrigger><SelectValue placeholder="Select district" /></SelectTrigger><SelectContent>{SRI_LANKAN_DISTRICTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></div>
      <Button disabled={saving} onClick={() => onSave({ buyer: { buyerType, company, district } })}>
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save buyer profile
      </Button>
    </div>
  )
}
