'use client'

import { useEffect, useState } from 'react'
import { useApp, api } from '@/lib/store'
import { useT } from '@/lib/use-t'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { RoleBadge } from '@/components/govisahana/badges'
import {
  MapPin, Calendar, Globe, Sparkles, MessageCircle, UserPlus, UserCheck,
  UserMinus, Edit, ShieldCheck, Flag, Ban, Share2, Heart, MoreVertical,
  Check, ArrowLeft, Loader2, Wheat, Briefcase, Award, ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { CommunityPostItem } from '@/lib/types'

export default function UserProfileView() {
  const { user, viewParam, setView, lang } = useApp()
  const t = useT()

  // Target user ID is viewParam or current user id
  const targetUserId = viewParam || user?.id

  const [profileData, setProfileData] = useState<any>(null)
  const [userPosts, setUserPosts] = useState<CommunityPostItem[]>([])
  const [friendsList, setFriendsList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('posts')

  // Edit profile modal state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editBio, setEditBio] = useState('')
  const [editDistrict, setEditDistrict] = useState('')
  const [editCrops, setEditCrops] = useState('')
  const [editInterests, setEditInterests] = useState('')
  const [editLanguages, setEditLanguages] = useState('')
  const [editProfession, setEditProfession] = useState('')
  const [editCoverUrl, setEditCoverUrl] = useState('')
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  // Report modal state
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [isReporting, setIsReporting] = useState(false)

  const loadProfile = async () => {
    if (!targetUserId) return
    setLoading(true)
    try {
      const [profRes, postsRes] = await Promise.all([
        fetch(`/api/community/profile/${targetUserId}`, { credentials: 'include' }),
        fetch(`/api/community/posts?authorId=${targetUserId}&limit=30`, { credentials: 'include' }),
      ])
      const prof = await profRes.json()
      const postData = await postsRes.json()

      if (prof.user) {
        setProfileData(prof)
        setEditBio(prof.user.communityProfile?.bio || prof.user.farmerProfile?.bio || '')
        setEditDistrict(prof.user.communityProfile?.district || prof.user.farmerProfile?.district || '')
        setEditCrops(prof.user.communityProfile?.crops || prof.user.farmerProfile?.crops || prof.user.expertProfile?.crops || '')
        setEditInterests(prof.user.communityProfile?.interests || '')
        setEditLanguages(prof.user.communityProfile?.languages || prof.user.expertProfile?.languages || '')
        setEditProfession(prof.user.communityProfile?.profession || prof.user.expertProfile?.title || '')
        setEditCoverUrl(prof.user.communityProfile?.coverUrl || '')
      }
      if (postData.posts) {
        setUserPosts(postData.posts)
      }
    } catch {
      toast.error('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfile()
  }, [targetUserId])

  // Connection action
  const handleConnection = async (action: 'send_request' | 'accept_request' | 'remove_friend') => {
    if (!user) {
      setView('login')
      return
    }
    try {
      await api('/api/community/connections', {
        method: 'POST',
        body: JSON.stringify({ action, targetUserId }),
      })
      toast.success(
        action === 'send_request'
          ? 'Connection request sent!'
          : action === 'accept_request'
          ? 'Connection accepted!'
          : 'Connection removed',
      )
      loadProfile()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  // Follow toggle
  const handleToggleFollow = async () => {
    if (!user) {
      setView('login')
      return
    }
    try {
      const res = await api<{ following: boolean; followersCount: number }>('/api/community/follow', {
        method: 'POST',
        body: JSON.stringify({ targetUserId }),
      })
      toast.success(res.following ? 'Following user' : 'Unfollowed user')
      setProfileData((prev: any) => ({
        ...prev,
        relationship: { ...prev.relationship, isFollowing: res.following },
        counts: { ...prev.counts, followersCount: res.followersCount },
      }))
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  // Save profile edits
  const handleSaveProfile = async () => {
    if (!user) return
    setIsSavingProfile(true)
    try {
      await api(`/api/community/profile/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          bio: editBio,
          district: editDistrict,
          crops: editCrops,
          interests: editInterests,
          languages: editLanguages,
          profession: editProfession,
          coverUrl: editCoverUrl,
        }),
      })
      toast.success('Social profile updated!')
      setShowEditModal(false)
      loadProfile()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setIsSavingProfile(false)
    }
  }

  // Block user
  const handleBlock = async () => {
    if (!confirm('Are you sure you want to block this user?')) return
    try {
      await api('/api/community/blocks', {
        method: 'POST',
        body: JSON.stringify({ targetUserId, action: 'block' }),
      })
      toast.success('User blocked')
      setView('community')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  // Submit report
  const handleReport = async () => {
    if (!reportReason.trim()) return
    setIsReporting(true)
    try {
      await api('/api/community/reports', {
        method: 'POST',
        body: JSON.stringify({
          targetType: 'USER',
          targetId: targetUserId,
          reason: reportReason.trim(),
        }),
      })
      toast.success('User report submitted to moderation team')
      setShowReportModal(false)
      setReportReason('')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setIsReporting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!profileData?.user) {
    return (
      <div className="mx-auto max-w-4xl py-16 text-center space-y-4">
        <h2 className="text-xl font-bold">User Not Found</h2>
        <Button onClick={() => setView('community')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Return to Community
        </Button>
      </div>
    )
  }

  const { user: profileUser, counts, relationship } = profileData
  const isSelf = relationship?.isSelf
  const defaultCover = 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80'
  const coverUrl = profileUser.communityProfile?.coverUrl || defaultCover

  return (
    <div className="min-h-screen bg-muted/20 pb-16">
      {/* Cover Image & Header */}
      <div className="relative">
        <div className="h-48 sm:h-64 w-full overflow-hidden bg-muted">
          <img
            src={coverUrl}
            alt="Profile cover"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
        </div>

        {/* Back Button */}
        <div className="absolute top-4 left-4 z-10">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setView('community')}
            className="bg-background/80 backdrop-blur-md shadow-xs gap-1.5 h-8 text-xs font-medium"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Feed
          </Button>
        </div>

        {/* Profile Card Header */}
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="relative -mt-16 sm:-mt-20 flex flex-col md:flex-row md:items-end md:justify-between gap-4 pb-4">
            {/* Avatar & Name */}
            <div className="flex items-end gap-4">
              <Avatar className="h-28 w-28 sm:h-32 sm:w-32 border-4 border-background shadow-md ring-1 ring-border/50">
                <AvatarImage src={profileUser.avatarUrl || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-2xl">
                  {profileUser.name.split(' ').map((s: string) => s[0]).slice(0, 2).join('')}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-1 mb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold text-foreground">{profileUser.name}</h1>
                  {profileUser.expertProfile?.verified && (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs gap-1 font-semibold">
                      <Sparkles className="h-3 w-3" /> Verified Expert
                    </Badge>
                  )}
                  <RoleBadge role={profileUser.role} />
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  {profileUser.communityProfile?.profession || profileUser.expertProfile?.title || profileUser.role}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap pt-0.5">
                  {(profileUser.communityProfile?.district || profileUser.farmerProfile?.district) && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      {profileUser.communityProfile?.district || profileUser.farmerProfile?.district}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Member since {new Date(profileUser.createdAt).getFullYear()}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              {isSelf ? (
                <Button
                  onClick={() => setShowEditModal(true)}
                  className="bg-primary hover:bg-primary/90 text-white gap-1.5 h-9"
                >
                  <Edit className="h-4 w-4" /> Edit Social Profile
                </Button>
              ) : (
                <>
                  {/* Connection Button */}
                  {relationship?.friendshipStatus === 'CONNECTED' ? (
                    <Button
                      variant="outline"
                      className="border-primary/40 text-primary hover:bg-primary/10 gap-1.5 h-9"
                      onClick={() => handleConnection('remove_friend')}
                    >
                      <UserCheck className="h-4 w-4" /> Connected
                    </Button>
                  ) : relationship?.friendshipStatus === 'PENDING_SENT' ? (
                    <Button variant="outline" disabled className="gap-1.5 h-9 text-muted-foreground">
                      Request Pending
                    </Button>
                  ) : relationship?.friendshipStatus === 'PENDING_RECEIVED' ? (
                    <Button
                      className="bg-primary hover:bg-primary/90 text-white gap-1.5 h-9"
                      onClick={() => handleConnection('accept_request')}
                    >
                      <Check className="h-4 w-4" /> Accept Request
                    </Button>
                  ) : (
                    <Button
                      className="bg-primary hover:bg-primary/90 text-white gap-1.5 h-9"
                      onClick={() => handleConnection('send_request')}
                    >
                      <UserPlus className="h-4 w-4" /> Connect
                    </Button>
                  )}

                  {/* Follow Button */}
                  <Button
                    variant={relationship?.isFollowing ? 'secondary' : 'outline'}
                    className="gap-1.5 h-9"
                    onClick={handleToggleFollow}
                  >
                    {relationship?.isFollowing ? 'Following' : 'Follow'}
                  </Button>

                  {/* Direct Message Button */}
                  <Button
                    variant="outline"
                    className="gap-1.5 h-9"
                    onClick={() => {
                      setView('community-messages')
                    }}
                  >
                    <MessageCircle className="h-4 w-4 text-primary" /> Message
                  </Button>

                  {/* 3-dot options */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground"
                    onClick={() => setShowReportModal(true)}
                    title="Report or Block"
                  >
                    <Flag className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Social Stats Counters Bar */}
          <div className="flex items-center gap-6 border-y border-border/70 py-3 text-sm">
            <div>
              <span className="font-bold text-foreground mr-1">{counts?.postsCount || 0}</span>
              <span className="text-muted-foreground">Posts</span>
            </div>
            <div>
              <span className="font-bold text-foreground mr-1">{counts?.friendsCount || 0}</span>
              <span className="text-muted-foreground">Connections</span>
            </div>
            <div>
              <span className="font-bold text-foreground mr-1">{counts?.followersCount || 0}</span>
              <span className="text-muted-foreground">Followers</span>
            </div>
            <div>
              <span className="font-bold text-foreground mr-1">{counts?.followingCount || 0}</span>
              <span className="text-muted-foreground">Following</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Profile Tabs Content */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 pt-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
          {/* Left / Sidebar Info (4 cols) */}
          <div className="md:col-span-4 space-y-4">
            {/* Bio Card */}
            <Card className="border border-border/80 bg-card">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-semibold">About</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1 space-y-3 text-xs leading-relaxed">
                <p className="text-foreground/90 whitespace-pre-line">
                  {profileUser.communityProfile?.bio || profileUser.farmerProfile?.bio || profileUser.expertProfile?.bio || 'No biography added yet.'}
                </p>

                {/* Crops */}
                {(profileUser.communityProfile?.crops || profileUser.farmerProfile?.crops || profileUser.expertProfile?.crops) && (
                  <div className="pt-2 border-t border-border/60 space-y-1.5">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <Wheat className="h-3.5 w-3.5 text-primary" /> Crops & Focus:
                    </span>
                    <p className="text-muted-foreground">
                      {profileUser.communityProfile?.crops || profileUser.farmerProfile?.crops || profileUser.expertProfile?.crops}
                    </p>
                  </div>
                )}

                {/* Interests */}
                {profileUser.communityProfile?.interests && (
                  <div className="pt-2 border-t border-border/60 space-y-1.5">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-emerald-600" /> Agricultural Interests:
                    </span>
                    <p className="text-muted-foreground">{profileUser.communityProfile.interests}</p>
                  </div>
                )}

                {/* Languages */}
                {(profileUser.communityProfile?.languages || profileUser.expertProfile?.languages) && (
                  <div className="pt-2 border-t border-border/60 space-y-1.5">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-primary" /> Languages:
                    </span>
                    <p className="text-muted-foreground">
                      {profileUser.communityProfile?.languages || profileUser.expertProfile?.languages}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Expert Credentials (if Expert) */}
            {profileUser.expertProfile && (
              <Card className="border border-border/80 bg-emerald-50/30 dark:bg-emerald-950/20">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                    <ShieldCheck className="h-4 w-4" /> Expert Credentials
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-1 space-y-2 text-xs">
                  <div>
                    <span className="font-medium">Specialization:</span>{' '}
                    <span className="text-muted-foreground">{profileUser.expertProfile.expertise || 'Plant Protection'}</span>
                  </div>
                  {profileUser.expertProfile.hourlyRate && (
                    <div>
                      <span className="font-medium">Consultation Fee:</span>{' '}
                      <span className="text-primary font-bold">Rs. {profileUser.expertProfile.hourlyRate}/hr</span>
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Rating:</span>{' '}
                    <span className="text-amber-600 font-bold">★ {profileUser.expertProfile.rating || '4.9'}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Content / User Posts Feed (8 cols) */}
          <div className="md:col-span-8 space-y-4">
            <h3 className="text-base font-bold text-foreground">
              Posts by {profileUser.name.split(' ')[0]} ({userPosts.length})
            </h3>

            {userPosts.length === 0 ? (
              <Card className="py-12 text-center border-dashed">
                <CardContent>
                  <p className="text-sm text-muted-foreground">This user has not published any posts yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {userPosts.map((post) => (
                  <Card key={post.id} className="border border-border/80 bg-card">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={post.author.avatarUrl || undefined} />
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {post.author.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-semibold text-xs">{post.author.name}</span>
                            <p className="text-[10px] text-muted-foreground">{new Date(post.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          {post.category}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-1 space-y-2 text-sm">
                      <p className="whitespace-pre-line leading-relaxed">{post.content}</p>
                      {post.mediaUrls && post.mediaUrls.length > 0 && (
                        <img
                          src={post.mediaUrls[0]}
                          alt="Post media"
                          className="h-56 w-full rounded-lg object-cover mt-2"
                        />
                      )}
                    </CardContent>
                    <div className="p-4 pt-1 border-t border-border/60 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Heart className="h-3.5 w-3.5" /> {post.likesCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-3.5 w-3.5" /> {post.commentsCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <Share2 className="h-3.5 w-3.5" /> {post.sharesCount}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* EDIT SOCIAL PROFILE MODAL */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-primary" /> Edit Social Profile
            </DialogTitle>
            <DialogDescription>
              Update your agricultural bio, crops, and contact details visible to the community.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-semibold text-muted-foreground mb-1 block">Cover Image URL</label>
              <Input
                placeholder="https://images.unsplash.com/..."
                value={editCoverUrl}
                onChange={(e) => setEditCoverUrl(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div>
              <label className="font-semibold text-muted-foreground mb-1 block">Title / Profession</label>
              <Input
                placeholder="e.g. Organic Farmer, Agronomist, Vegetable Grower"
                value={editProfession}
                onChange={(e) => setEditProfession(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div>
              <label className="font-semibold text-muted-foreground mb-1 block">District / Location</label>
              <Input
                placeholder="e.g. Anuradhapura, Welimada, Jaffna"
                value={editDistrict}
                onChange={(e) => setEditDistrict(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div>
              <label className="font-semibold text-muted-foreground mb-1 block">Bio / Farming Story</label>
              <Textarea
                placeholder="Describe your agricultural background, crops, and practices..."
                rows={3}
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                className="text-xs"
              />
            </div>

            <div>
              <label className="font-semibold text-muted-foreground mb-1 block">Crops Cultivated / Advised</label>
              <Input
                placeholder="e.g. Rice (Paddy), Big Onion, Chilli, Potato"
                value={editCrops}
                onChange={(e) => setEditCrops(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div>
              <label className="font-semibold text-muted-foreground mb-1 block">Agricultural Interests</label>
              <Input
                placeholder="e.g. Drip irrigation, Biological pest control, High-yield seeds"
                value={editInterests}
                onChange={(e) => setEditInterests(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div>
              <label className="font-semibold text-muted-foreground mb-1 block">Languages</label>
              <Input
                placeholder="e.g. Sinhala, English, Tamil"
                value={editLanguages}
                onChange={(e) => setEditLanguages(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveProfile}
              disabled={isSavingProfile}
              className="bg-primary text-white"
            >
              {isSavingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* REPORT USER MODAL */}
      <Dialog open={showReportModal} onOpenChange={setShowReportModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <Flag className="h-5 w-5" /> Report or Block User
            </DialogTitle>
            <DialogDescription>
              Report this account for inappropriate behavior or block them from interacting with you.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Report Reason *</label>
              <Textarea
                placeholder="Describe why you are reporting this user..."
                rows={3}
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="text-xs"
              />
              <Button
                size="sm"
                onClick={handleReport}
                disabled={isReporting || !reportReason.trim()}
                className="mt-2 w-full bg-rose-600 hover:bg-rose-700 text-white text-xs"
              >
                {isReporting ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                Submit Report
              </Button>
            </div>

            <div className="border-t border-border pt-3">
              <p className="text-xs text-muted-foreground mb-2">
                Blocking will prevent this user from seeing your posts, messaging you, or sending connection requests.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBlock}
                className="w-full text-rose-600 border-rose-300 hover:bg-rose-50 text-xs"
              >
                <Ban className="mr-2 h-3.5 w-3.5" /> Block This User
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
