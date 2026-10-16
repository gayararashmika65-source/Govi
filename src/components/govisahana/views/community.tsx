'use client'

import { useEffect, useState, useTransition } from 'react'
import { useApp, api } from '@/lib/store'
import { useT } from '@/lib/use-t'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RoleBadge } from '@/components/govisahana/badges'
import {
  Heart, MessageCircle, Share2, Bookmark, BookmarkCheck, MoreVertical,
  Plus, Search, Filter, Image as ImageIcon, Send, X, ShieldAlert,
  UserPlus, UserCheck, Check, Sparkles, MessageSquare, Flag, Ban,
  Globe, Users, Loader2, ArrowRight, CornerDownRight, ThumbsUp, RefreshCw, Pin,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { COMMUNITY_CATEGORIES, type CommunityPostItem, type PostCommentItem } from '@/lib/types'

function formatTimeAgo(dateString: string): string {
  try {
    const d = new Date(dateString)
    const now = new Date()
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000)
    if (diffSec < 60) return 'Just now'
    const diffMin = Math.floor(diffSec / 60)
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHr = Math.floor(diffMin / 60)
    if (diffHr < 24) return `${diffHr}h ago`
    const diffDay = Math.floor(diffHr / 24)
    if (diffDay < 7) return `${diffDay}d ago`
    return d.toLocaleDateString()
  } catch {
    return 'Recently'
  }
}

export default function CommunityView() {
  const { user, setView, lang } = useApp()
  const t = useT()

  // State
  const [posts, setPosts] = useState<CommunityPostItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'popular' | 'following' | 'my' | 'saved'>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeHashtag, setActiveHashtag] = useState<string | null>(null)

  // Side widget state
  const [connections, setConnections] = useState<any>({ friends: [], incoming: [], outgoing: [], suggestions: [] })
  const [loadingConnections, setLoadingConnections] = useState(false)

  // Create post modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [newCategory, setNewCategory] = useState('GENERAL')
  const [newVisibility, setNewVisibility] = useState<'PUBLIC' | 'CONNECTIONS'>('PUBLIC')
  const [newMediaUrls, setNewMediaUrls] = useState<string[]>([])
  const [mediaInputUrl, setMediaInputUrl] = useState('')
  const [isSubmittingPost, setIsSubmittingPost] = useState(false)

  // Share quote modal
  const [postToShare, setPostToShare] = useState<CommunityPostItem | null>(null)
  const [shareCaption, setShareCaption] = useState('')
  const [isSharing, setIsSharing] = useState(false)

  // Report modal
  const [reportTarget, setReportTarget] = useState<{ type: 'POST' | 'COMMENT' | 'USER'; id: string } | null>(null)
  const [reportReason, setReportReason] = useState('')
  const [isReporting, setIsReporting] = useState(false)

  // Comments open state per post (post.id -> boolean)
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({})
  const [commentsData, setCommentsData] = useState<Record<string, PostCommentItem[]>>({})
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({})
  const [replyInputs, setReplyInputs] = useState<Record<string, { parentId: string; content: string }>>({})

  // Load posts
  const loadPosts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('tab', activeTab)
      if (selectedCategory && selectedCategory !== 'ALL') params.set('category', selectedCategory)
      if (activeHashtag) params.set('hashtag', activeHashtag)
      if (searchQuery.trim()) params.set('search', searchQuery.trim())

      const res = await fetch(`/api/community/posts?${params.toString()}`, { credentials: 'include' })
      const data = await res.json()
      if (data.posts) {
        setPosts(data.posts)
      }
    } catch (e) {
      toast.error('Failed to load community feed')
    } finally {
      setLoading(false)
    }
  }

  // Load connections & suggestions
  const loadConnections = async () => {
    if (!user) return
    setLoadingConnections(true)
    try {
      const res = await fetch('/api/community/connections', { credentials: 'include' })
      const data = await res.json()
      setConnections(data)
    } catch {
      /* ignore */
    } finally {
      setLoadingConnections(false)
    }
  }

  useEffect(() => {
    loadPosts()
  }, [activeTab, selectedCategory, activeHashtag])

  useEffect(() => {
    loadConnections()
  }, [user])

  // Handle Search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loadPosts()
  }

  // Toggle Like
  const handleToggleLike = async (postId: string) => {
    if (!user) {
      toast.info('Please sign in to like posts')
      setView('login')
      return
    }

    // Optimistic update
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const nextLiked = !p.likedByMe
          return {
            ...p,
            likedByMe: nextLiked,
            likesCount: nextLiked ? p.likesCount + 1 : Math.max(0, p.likesCount - 1),
          }
        }
        return p
      }),
    )

    try {
      const res = await api<{ liked: boolean; likesCount: number }>(`/api/community/posts/${postId}/like`, {
        method: 'POST',
      })
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, likedByMe: res.liked, likesCount: res.likesCount } : p)),
      )
    } catch (e) {
      toast.error((e as Error).message)
      loadPosts()
    }
  }

  // Toggle Save
  const handleToggleSave = async (postId: string) => {
    if (!user) {
      toast.info('Please sign in to save posts')
      setView('login')
      return
    }

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const nextSaved = !p.savedByMe
          return { ...p, savedByMe: nextSaved, savesCount: nextSaved ? p.savesCount + 1 : Math.max(0, p.savesCount - 1) }
        }
        return p
      }),
    )

    try {
      const res = await api<{ saved: boolean }>(`/api/community/posts/${postId}/save`, { method: 'POST' })
      toast.success(res.saved ? 'Post saved to your bookmarks' : 'Post removed from saved')
    } catch (e) {
      toast.error((e as Error).message)
      loadPosts()
    }
  }

  // Toggle comments list
  const toggleComments = async (postId: string) => {
    const isOpen = openComments[postId]
    setOpenComments((prev) => ({ ...prev, [postId]: !isOpen }))

    if (!isOpen && !commentsData[postId]) {
      try {
        const res = await fetch(`/api/community/posts/${postId}/comments`, { credentials: 'include' })
        const data = await res.json()
        setCommentsData((prev) => ({ ...prev, [postId]: data.comments || [] }))
      } catch {
        /* ignore */
      }
    }
  }

  // Submit comment
  const handleAddComment = async (postId: string, parentId?: string) => {
    if (!user) {
      toast.info('Please sign in to comment')
      setView('login')
      return
    }

    const text = parentId ? replyInputs[parentId]?.content : commentInputs[postId]
    if (!text || !text.trim()) return

    try {
      const res = await api<{ comment: PostCommentItem }>(`/api/community/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: text.trim(), parentId: parentId || undefined }),
      })

      // Add to comments data
      setCommentsData((prev) => {
        const current = prev[postId] || []
        if (parentId) {
          return {
            ...prev,
            [postId]: current.map((c) => (c.id === parentId ? { ...c, replies: [...(c.replies || []), res.comment] } : c)),
          }
        } else {
          return { ...prev, [postId]: [...current, res.comment] }
        }
      })

      // Increment comment count on post
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p)))

      // Reset inputs
      if (parentId) {
        setReplyInputs((prev) => ({ ...prev, [parentId]: { parentId, content: '' } }))
      } else {
        setCommentInputs((prev) => ({ ...prev, [postId]: '' }))
      }
      toast.success('Comment posted')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  // Create post
  const handlePublishPost = async () => {
    if (!user) {
      setView('login')
      return
    }
    if (!newContent.trim()) {
      toast.error('Please write something in your post')
      return
    }

    setIsSubmittingPost(true)
    try {
      const res = await api<{ post: CommunityPostItem }>('/api/community/posts', {
        method: 'POST',
        body: JSON.stringify({
          content: newContent.trim(),
          category: newCategory,
          visibility: newVisibility,
          mediaUrls: newMediaUrls,
        }),
      })

      setPosts((prev) => [res.post, ...prev])
      setShowCreateModal(false)
      setNewContent('')
      setNewMediaUrls([])
      toast.success('Post published to GoviSahana community!')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setIsSubmittingPost(false)
    }
  }

  // Share / Quote Post
  const handleQuoteShare = async () => {
    if (!user || !postToShare) return
    setIsSharing(true)
    try {
      const res = await api<{ post: CommunityPostItem }>('/api/community/posts', {
        method: 'POST',
        body: JSON.stringify({
          content: shareCaption.trim() || `Reposted from ${postToShare.author.name}`,
          sharedPostId: postToShare.id,
          sharedCaption: shareCaption.trim() || undefined,
          category: postToShare.category,
          visibility: 'PUBLIC',
        }),
      })

      setPosts((prev) => [
        res.post,
        ...prev.map((p) => (p.id === postToShare.id ? { ...p, sharesCount: p.sharesCount + 1 } : p)),
      ])
      setPostToShare(null)
      setShareCaption('')
      toast.success('Post shared to your feed!')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setIsSharing(false)
    }
  }

  // Delete post
  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return
    try {
      await api(`/api/community/posts/${postId}`, { method: 'DELETE' })
      setPosts((prev) => prev.filter((p) => p.id !== postId))
      toast.success('Post deleted')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  // Connection action (Connect / Accept / Decline)
  const handleConnectionAction = async (action: 'send_request' | 'accept_request' | 'reject_request', targetUserId: string) => {
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
          : 'Request declined',
      )
      loadConnections()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  // Block user
  const handleBlockUser = async (targetUserId: string, targetName: string) => {
    if (!confirm(`Are you sure you want to block ${targetName}? You will not see their posts or messages.`)) return
    try {
      await api('/api/community/blocks', {
        method: 'POST',
        body: JSON.stringify({ targetUserId, action: 'block' }),
      })
      toast.success(`${targetName} has been blocked`)
      loadPosts()
      loadConnections()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  // Submit report
  const handleSubmitReport = async () => {
    if (!reportTarget || !reportReason.trim()) return
    setIsReporting(true)
    try {
      await api('/api/community/reports', {
        method: 'POST',
        body: JSON.stringify({
          targetType: reportTarget.type,
          targetId: reportTarget.id,
          reason: reportReason.trim(),
        }),
      })
      toast.success('Report submitted to moderation team. Thank you for keeping the community safe.')
      setReportTarget(null)
      setReportReason('')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setIsReporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-muted/20 pb-16">
      {/* Top Hero Banner */}
      <div className="border-b border-border/60 bg-gradient-to-b from-primary/10 via-background to-background py-8 sm:py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-0.5 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" /> GoviSahana Social Community
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {lang === 'si' ? 'කෘෂිකාර්මික ප්‍රජා සංසදය' : lang === 'ta' ? 'விவசாய சமூக மன்றம்' : 'Agricultural Community Feed'}
              </h1>
              <p className="text-sm text-muted-foreground sm:text-base max-w-2xl">
                {lang === 'si'
                  ? 'ශ්‍රී ලංකාවේ ගොවීන්, කෘෂි විශේෂඥයන්, ව්‍යවසායකයන් සහ ගැනුම්කරුවන් සමග ඔබේ අත්දැකීම්, බෝග ගැටලු සහ තාක්ෂණය බෙදාගන්න.'
                  : lang === 'ta'
                  ? 'இலங்கை விவசாயிகள், வேளாண் நிபுணர்கள் மற்றும் வாங்குபவர்களுடன் விவசாய அனுபவங்களை பகிர்ந்து கொள்ளுங்கள்.'
                  : 'Connect with Sri Lankan farmers, agricultural officers, enterprises, and crop buyers. Share harvest updates, field questions, and sustainable techniques.'}
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {user ? (
                <>
                  <Button
                    onClick={() => setShowCreateModal(true)}
                    className="h-10 bg-primary hover:bg-primary/90 text-white shadow-sm font-medium gap-2"
                  >
                    <Plus className="h-4 w-4" /> Post to Community
                  </Button>
                  <Button
                    variant="outline"
                    className="h-10 gap-2"
                    onClick={() => setView('community-messages')}
                  >
                    <MessageCircle className="h-4 w-4 text-primary" /> Messages
                  </Button>
                </>
              ) : (
                <Button onClick={() => setView('login')} className="h-10 bg-primary">
                  Sign in to join the conversation
                </Button>
              )}
            </div>
          </div>

          {/* Search & Topic Filters */}
          <div className="mt-6 flex flex-col gap-3">
            <form onSubmit={handleSearchSubmit} className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search posts, topics, or hashtags (#Paddy, #LateBlight, #DripIrrigation)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 bg-background"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    loadPosts()
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </form>

            {/* Category Pills (Horizontal Scroll) */}
            <div className="gs-scroll flex items-center gap-1.5 overflow-x-auto pb-1 pt-1">
              {COMMUNITY_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.value
                return (
                  <button
                    key={cat.value}
                    onClick={() => {
                      setSelectedCategory(cat.value)
                      setActiveHashtag(null)
                    }}
                    className={cn(
                      'shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-all',
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                        : 'border-border/70 bg-card hover:bg-muted text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {lang === 'si' ? cat.labelSi : lang === 'ta' ? cat.labelTa : cat.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left / Main Feed Column (8 cols) */}
          <main className="lg:col-span-8 space-y-4">
            {/* Quick Share Input Box (if logged in) */}
            {user && (
              <Card className="border border-border/80 shadow-xs bg-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar
                      className="h-10 w-10 cursor-pointer"
                      onClick={() => setView('user-profile', user.id)}
                    >
                      <AvatarImage src={user.avatarUrl || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                        {user.name.split(' ').map((s) => s[0]).slice(0, 2).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="flex-1 rounded-full border border-border bg-muted/40 px-4 py-2.5 text-left text-sm text-muted-foreground hover:bg-muted transition-colors"
                    >
                      Share an update, crop photo, or agricultural question, {user.name.split(' ')[0]}...
                    </button>
                    <Button
                      size="sm"
                      onClick={() => setShowCreateModal(true)}
                      className="bg-primary hover:bg-primary/90 hidden sm:inline-flex"
                    >
                      <Plus className="h-4 w-4 mr-1" /> Post
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Feed Tabs: All, Popular, Following, My Posts, Saved */}
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                <TabsList className="bg-muted/50 p-1">
                  <TabsTrigger value="all" className="text-xs sm:text-sm">
                    All Posts
                  </TabsTrigger>
                  <TabsTrigger value="popular" className="text-xs sm:text-sm">
                    🔥 Popular
                  </TabsTrigger>
                  {user && (
                    <>
                      <TabsTrigger value="following" className="text-xs sm:text-sm">
                        Following
                      </TabsTrigger>
                      <TabsTrigger value="my" className="text-xs sm:text-sm">
                        My Posts
                      </TabsTrigger>
                      <TabsTrigger value="saved" className="text-xs sm:text-sm">
                        Saved
                      </TabsTrigger>
                    </>
                  )}
                </TabsList>
              </Tabs>

              {activeHashtag && (
                <div className="flex items-center gap-1.5 pl-2 text-xs text-primary font-semibold">
                  <span>Filtered: {activeHashtag}</span>
                  <button onClick={() => setActiveHashtag(null)} className="hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Posts List */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm">Loading agricultural community posts...</p>
              </div>
            ) : posts.length === 0 ? (
              <Card className="py-16 text-center border-dashed">
                <CardContent className="space-y-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <MessageCircle className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-semibold">No posts found</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    {searchQuery || activeHashtag
                      ? 'No posts matched your current search filters. Try clearing your search keywords.'
                      : activeTab === 'following'
                      ? "You aren't following anyone yet or they haven't posted. Explore 'All Posts' to discover active farmers and experts!"
                      : activeTab === 'saved'
                      ? 'You have not saved any posts yet. Click the bookmark icon on any post to read it later.'
                      : 'Be the first to share an agricultural update, pest advisory, or harvest photo with the community!'}
                  </p>
                  {user && (
                    <Button onClick={() => setShowCreateModal(true)} className="bg-primary mt-2">
                      <Plus className="mr-2 h-4 w-4" /> Create First Post
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => {
                  const isCommentsOpen = !!openComments[post.id]
                  const comments = commentsData[post.id] || []
                  const catConfig =
                    COMMUNITY_CATEGORIES.find((c) => c.value === post.category) || COMMUNITY_CATEGORIES[0]

                  return (
                    <Card
                      key={post.id}
                      className={cn(
                        'border border-border/80 transition-shadow hover:shadow-xs bg-card',
                        post.pinned && 'border-primary/40 bg-primary/[0.02]',
                      )}
                    >
                      <CardHeader className="p-4 pb-3">
                        <div className="flex items-start justify-between gap-3">
                          {/* Author Info */}
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar
                              className="h-10 w-10 shrink-0 cursor-pointer ring-1 ring-border/50"
                              onClick={() => setView('user-profile', post.author.id)}
                            >
                              <AvatarImage src={post.author.avatarUrl || undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                                {post.author.name.split(' ').map((s) => s[0]).slice(0, 2).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className="font-semibold text-sm hover:underline cursor-pointer text-foreground"
                                  onClick={() => setView('user-profile', post.author.id)}
                                >
                                  {post.author.name}
                                </span>
                                {post.author.verified && (
                                  <Badge variant="outline" className="h-5 px-1.5 bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold gap-1">
                                    <Sparkles className="h-3 w-3" /> Verified Expert
                                  </Badge>
                                )}
                                <RoleBadge role={post.author.role} />
                              </div>

                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                <span>{formatTimeAgo(post.createdAt)}</span>
                                {post.author.district && (
                                  <>
                                    <span>•</span>
                                    <span>{post.author.district}</span>
                                  </>
                                )}
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  {post.visibility === 'PUBLIC' ? (
                                    <Globe className="h-3 w-3" />
                                  ) : (
                                    <Users className="h-3 w-3" />
                                  )}
                                  {post.visibility === 'PUBLIC' ? 'Public' : 'Connections'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Post Category & 3-dot Menu */}
                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={cn(
                                'text-[11px] font-medium px-2 py-0.5 rounded-full border hidden sm:inline-block',
                                catConfig.color,
                              )}
                            >
                              {lang === 'si' ? catConfig.labelSi : lang === 'ta' ? catConfig.labelTa : catConfig.label}
                            </span>

                            {post.pinned && (
                              <Badge className="bg-primary text-white text-[10px] h-5 px-1.5 gap-1">
                                <Pin className="h-2.5 w-2.5" /> Pinned
                              </Badge>
                            )}

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => handleToggleSave(post.id)}>
                                  {post.savedByMe ? (
                                    <>
                                      <BookmarkCheck className="mr-2 h-4 w-4 text-primary" /> Unsave Post
                                    </>
                                  ) : (
                                    <>
                                      <Bookmark className="mr-2 h-4 w-4" /> Save Post
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setPostToShare(post)
                                  }}
                                >
                                  <Share2 className="mr-2 h-4 w-4" /> Quote / Repost
                                </DropdownMenuItem>

                                {user && (post.isAuthor || user.role === 'ADMIN') && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => handleDeletePost(post.id)}
                                      className="text-rose-600 focus:text-rose-700"
                                    >
                                      Delete Post
                                    </DropdownMenuItem>
                                  </>
                                )}

                                {user && !post.isAuthor && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => setReportTarget({ type: 'POST', id: post.id })}
                                      className="text-amber-600 focus:text-amber-700"
                                    >
                                      <Flag className="mr-2 h-4 w-4" /> Report Post
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleBlockUser(post.author.id, post.author.name)}
                                      className="text-rose-600 focus:text-rose-700"
                                    >
                                      <Ban className="mr-2 h-4 w-4" /> Block User
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="px-4 py-1 space-y-3">
                        {/* Text Content */}
                        <div className="text-sm text-foreground whitespace-pre-line leading-relaxed">
                          {post.content}
                        </div>

                        {/* Hashtags */}
                        {post.hashtags && post.hashtags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {post.hashtags.map((tag) => (
                              <button
                                key={tag}
                                onClick={() => setActiveHashtag(tag)}
                                className="text-xs font-semibold text-primary hover:underline hover:opacity-80"
                              >
                                {tag.startsWith('#') ? tag : `#${tag}`}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Media attachments */}
                        {post.mediaUrls && post.mediaUrls.length > 0 && (
                          <div className="overflow-hidden rounded-lg border border-border/70 mt-2">
                            {post.mediaUrls.length === 1 ? (
                              <img
                                src={post.mediaUrls[0]}
                                alt="Post media"
                                className="w-full max-h-[460px] object-cover"
                              />
                            ) : (
                              <div className="grid grid-cols-2 gap-1 bg-muted">
                                {post.mediaUrls.slice(0, 4).map((url, i) => (
                                  <img
                                    key={i}
                                    src={url}
                                    alt="Post media"
                                    className="h-48 w-full object-cover"
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Shared Post Card (if this is a quote/share) */}
                        {post.sharedPost && (
                          <div className="rounded-lg border border-border/80 bg-muted/30 p-3.5 space-y-2">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={post.sharedPost.author.avatarUrl || undefined} />
                                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                  {post.sharedPost.author.name.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span
                                className="text-xs font-semibold hover:underline cursor-pointer"
                                onClick={() => setView('user-profile', post.sharedPost!.author.id)}
                              >
                                {post.sharedPost.author.name}
                              </span>
                              {post.sharedPost.author.verified && (
                                <Sparkles className="h-3 w-3 text-emerald-600" />
                              )}
                              <RoleBadge role={post.sharedPost.author.role} />
                              <span className="text-[11px] text-muted-foreground">• {formatTimeAgo(post.sharedPost.createdAt)}</span>
                            </div>
                            <p className="text-xs text-foreground/90 whitespace-pre-line line-clamp-3">
                              {post.sharedPost.content}
                            </p>
                            {post.sharedPost.mediaUrls && post.sharedPost.mediaUrls.length > 0 && (
                              <img
                                src={post.sharedPost.mediaUrls[0]}
                                alt="Original attachment"
                                className="h-36 w-full rounded object-cover"
                              />
                            )}
                          </div>
                        )}
                      </CardContent>

                      {/* Post Footer Actions */}
                      <CardFooter className="px-4 py-2 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground mt-2">
                        {/* Likes */}
                        <button
                          onClick={() => handleToggleLike(post.id)}
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-colors hover:bg-muted font-medium',
                            post.likedByMe && 'text-rose-600 dark:text-rose-400',
                          )}
                        >
                          <Heart className={cn('h-4 w-4', post.likedByMe && 'fill-rose-600 text-rose-600')} />
                          <span>{post.likesCount > 0 ? post.likesCount : 'Like'}</span>
                        </button>

                        {/* Comments */}
                        <button
                          onClick={() => toggleComments(post.id)}
                          className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-colors hover:bg-muted font-medium"
                        >
                          <MessageCircle className="h-4 w-4" />
                          <span>{post.commentsCount > 0 ? `${post.commentsCount} Comments` : 'Comment'}</span>
                        </button>

                        {/* Share */}
                        <button
                          onClick={() => setPostToShare(post)}
                          className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-colors hover:bg-muted font-medium"
                        >
                          <Share2 className="h-4 w-4" />
                          <span>{post.sharesCount > 0 ? post.sharesCount : 'Share'}</span>
                        </button>

                        {/* Bookmark */}
                        <button
                          onClick={() => handleToggleSave(post.id)}
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-colors hover:bg-muted font-medium',
                            post.savedByMe && 'text-primary font-semibold',
                          )}
                        >
                          {post.savedByMe ? (
                            <BookmarkCheck className="h-4 w-4 fill-primary text-primary" />
                          ) : (
                            <Bookmark className="h-4 w-4" />
                          )}
                          <span className="hidden sm:inline">{post.savedByMe ? 'Saved' : 'Save'}</span>
                        </button>
                      </CardFooter>

                      {/* Comments Drawer / Section */}
                      {isCommentsOpen && (
                        <div className="border-t border-border/60 bg-muted/20 p-4 space-y-4">
                          {/* Add Comment Input */}
                          {user ? (
                            <div className="flex gap-2.5">
                              <Avatar className="h-8 w-8 shrink-0">
                                <AvatarImage src={user.avatarUrl || undefined} />
                                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                  {user.name.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 flex gap-2">
                                <Input
                                  placeholder="Write a comment or agricultural advice..."
                                  value={commentInputs[post.id] || ''}
                                  onChange={(e) =>
                                    setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault()
                                      handleAddComment(post.id)
                                    }
                                  }}
                                  className="h-9 bg-background text-sm"
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleAddComment(post.id)}
                                  className="h-9 px-3 bg-primary hover:bg-primary/90"
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-lg bg-muted/60 p-2 text-center text-xs text-muted-foreground">
                              Please{' '}
                              <span
                                className="font-semibold text-primary underline cursor-pointer"
                                onClick={() => setView('login')}
                              >
                                sign in
                              </span>{' '}
                              to join this discussion.
                            </div>
                          )}

                          {/* Comments List */}
                          {comments.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-2">
                              No comments yet. Be the first to reply!
                            </p>
                          ) : (
                            <div className="space-y-3 pt-1">
                              {comments.map((comment) => (
                                <div key={comment.id} className="space-y-2">
                                  <div className="flex items-start gap-2.5 group">
                                    <Avatar
                                      className="h-7 w-7 shrink-0 cursor-pointer"
                                      onClick={() => setView('user-profile', comment.author.id)}
                                    >
                                      <AvatarImage src={comment.author.avatarUrl || undefined} />
                                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                        {comment.author.name.slice(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 rounded-lg bg-card border border-border/70 p-2.5 text-xs space-y-1 shadow-2xs">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span
                                            className="font-semibold cursor-pointer hover:underline text-foreground"
                                            onClick={() => setView('user-profile', comment.author.id)}
                                          >
                                            {comment.author.name}
                                          </span>
                                          {comment.author.verified && (
                                            <Badge variant="outline" className="h-4 px-1 bg-emerald-50 text-emerald-700 text-[9px] gap-0.5">
                                              <Sparkles className="h-2.5 w-2.5" /> Expert
                                            </Badge>
                                          )}
                                          <RoleBadge role={comment.author.role} />
                                        </div>
                                        <span className="text-[10px] text-muted-foreground">
                                          {formatTimeAgo(comment.createdAt)}
                                        </span>
                                      </div>
                                      <p className="text-foreground/90 whitespace-pre-line leading-relaxed">
                                        {comment.content}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Reply button & Nested Replies */}
                                  <div className="pl-9 space-y-2">
                                    {user && (
                                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                        <button
                                          onClick={() =>
                                            setReplyInputs((prev) => ({
                                              ...prev,
                                              [comment.id]: { parentId: comment.id, content: `@${comment.author.name.split(' ')[0]} ` },
                                            }))
                                          }
                                          className="hover:text-primary font-medium flex items-center gap-1"
                                        >
                                          <CornerDownRight className="h-3 w-3" /> Reply
                                        </button>
                                      </div>
                                    )}

                                    {/* Reply Input Form if triggered */}
                                    {replyInputs[comment.id] && (
                                      <div className="flex gap-2 pt-1">
                                        <Input
                                          placeholder={`Reply to ${comment.author.name.split(' ')[0]}...`}
                                          value={replyInputs[comment.id].content}
                                          onChange={(e) =>
                                            setReplyInputs((prev) => ({
                                              ...prev,
                                              [comment.id]: { parentId: comment.id, content: e.target.value },
                                            }))
                                          }
                                          className="h-8 text-xs bg-background"
                                        />
                                        <Button
                                          size="sm"
                                          onClick={() => handleAddComment(post.id, comment.id)}
                                          className="h-8 px-2.5 bg-primary text-xs"
                                        >
                                          Reply
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            const copy = { ...replyInputs }
                                            delete copy[comment.id]
                                            setReplyInputs(copy)
                                          }}
                                          className="h-8 px-2 text-xs"
                                        >
                                          <X className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    )}

                                    {/* Nested replies */}
                                    {comment.replies && comment.replies.length > 0 && (
                                      <div className="space-y-2 border-l-2 border-border pl-2.5 mt-2">
                                        {comment.replies.map((reply) => (
                                          <div key={reply.id} className="flex items-start gap-2 text-xs">
                                            <Avatar
                                              className="h-6 w-6 shrink-0 cursor-pointer"
                                              onClick={() => setView('user-profile', reply.author.id)}
                                            >
                                              <AvatarImage src={reply.author.avatarUrl || undefined} />
                                              <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                                                {reply.author.name.slice(0, 2).toUpperCase()}
                                              </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 rounded-md bg-card/80 border border-border/60 p-2 text-xs space-y-0.5">
                                              <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1">
                                                  <span
                                                    className="font-medium cursor-pointer hover:underline text-foreground"
                                                    onClick={() => setView('user-profile', reply.author.id)}
                                                  >
                                                    {reply.author.name}
                                                  </span>
                                                  {reply.author.verified && (
                                                    <Sparkles className="h-3 w-3 text-emerald-600" />
                                                  )}
                                                  <RoleBadge role={reply.author.role} />
                                                </div>
                                                <span className="text-[10px] text-muted-foreground">
                                                  {formatTimeAgo(reply.createdAt)}
                                                </span>
                                              </div>
                                              <p className="text-foreground/90 whitespace-pre-line">
                                                {reply.content}
                                              </p>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  )
                })}
              </div>
            )}
          </main>

          {/* Right Sidebar (4 cols on lg) */}
          <aside className="lg:col-span-4 space-y-4">
            {/* My Community Profile Card */}
            {user ? (
              <Card className="border border-border/80 shadow-xs bg-card">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center gap-3">
                    <Avatar
                      className="h-12 w-12 cursor-pointer ring-2 ring-primary/20"
                      onClick={() => setView('user-profile', user.id)}
                    >
                      <AvatarImage src={user.avatarUrl || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {user.name.split(' ').map((s) => s[0]).slice(0, 2).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <h4
                        className="font-semibold text-sm truncate hover:underline cursor-pointer"
                        onClick={() => setView('user-profile', user.id)}
                      >
                        {user.name}
                      </h4>
                      <RoleBadge role={user.role} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-4 py-3 text-xs space-y-2 border-t border-border/50">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">Mutual Connections:</span>
                    <span className="font-semibold">{connections.counts?.friendsCount || 0}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">Pending Requests:</span>
                    <span className="font-semibold text-primary">{connections.counts?.incomingCount || 0}</span>
                  </div>

                  <div className="pt-2 flex flex-col gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs h-8 justify-start"
                      onClick={() => setView('user-profile', user.id)}
                    >
                      View My Public Profile
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs h-8 justify-start"
                      onClick={() => setView('community-messages')}
                    >
                      <MessageCircle className="mr-2 h-3.5 w-3.5 text-primary" /> Direct Messages
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border border-border/80 bg-gradient-to-br from-primary/5 via-card to-card">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" /> Join GoviSahana Community
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Connect with over 1,200 verified farmers and agricultural researchers across Sri Lanka.
                  </CardDescription>
                </CardHeader>
                <CardFooter className="p-4 pt-2">
                  <Button onClick={() => setView('login')} className="w-full bg-primary h-9 text-xs">
                    Sign in to participate
                  </Button>
                </CardFooter>
              </Card>
            )}

            {/* Connection Requests (Incoming) */}
            {user && connections.incoming && connections.incoming.length > 0 && (
              <Card className="border border-border/80 bg-card">
                <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-primary" /> Connection Requests
                  </CardTitle>
                  <Badge className="bg-primary text-white text-xs px-1.5 py-0">
                    {connections.incoming.length}
                  </Badge>
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-3">
                  {connections.incoming.map((req: any) => (
                    <div key={req.requestId} className="flex items-center justify-between gap-2 border-b border-border/50 pb-2.5 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar
                          className="h-8 w-8 shrink-0 cursor-pointer"
                          onClick={() => setView('user-profile', req.user.id)}
                        >
                          <AvatarImage src={req.user.avatarUrl || undefined} />
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {req.user.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p
                            className="text-xs font-semibold truncate hover:underline cursor-pointer"
                            onClick={() => setView('user-profile', req.user.id)}
                          >
                            {req.user.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {req.user.district || req.user.role}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          size="sm"
                          className="h-7 px-2 text-[10px] bg-primary hover:bg-primary/90 text-white"
                          onClick={() => handleConnectionAction('accept_request', req.user.id)}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-[10px] text-muted-foreground"
                          onClick={() => handleConnectionAction('reject_request', req.user.id)}
                        >
                          Decline
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Suggested Agricultural Connections */}
            {connections.suggestions && connections.suggestions.length > 0 && (
              <Card className="border border-border/80 bg-card">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-600" /> Suggested for You
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Farmers & verified experts based on your district and crops
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-3">
                  {connections.suggestions.map((sug: any) => (
                    <div key={sug.id} className="flex items-center justify-between gap-2 border-b border-border/50 pb-2.5 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar
                          className="h-9 w-9 shrink-0 cursor-pointer"
                          onClick={() => setView('user-profile', sug.id)}
                        >
                          <AvatarImage src={sug.avatarUrl || undefined} />
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {sug.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <span
                              className="text-xs font-semibold truncate hover:underline cursor-pointer"
                              onClick={() => setView('user-profile', sug.id)}
                            >
                              {sug.name}
                            </span>
                            {sug.verified && <Sparkles className="h-3 w-3 text-emerald-600 shrink-0" />}
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {sug.title || sug.crops || sug.district || sug.role}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2.5 text-xs text-primary border-primary/40 hover:bg-primary/10 shrink-0"
                        onClick={() => handleConnectionAction('send_request', sug.id)}
                      >
                        <UserPlus className="h-3 w-3 mr-1" /> Connect
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Trending Topics & Hashtags */}
            <Card className="border border-border/80 bg-card">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-semibold">🌱 Trending in Agriculture</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-2">
                {[
                  { tag: '#BrownPlanthopper', desc: 'Pest alert in North Central & Western' },
                  { tag: '#PaddyFarming', desc: 'Maha harvest preparation' },
                  { tag: '#PotatoHarvest', desc: 'Highland seed yields in Welimada' },
                  { tag: '#DripIrrigation', desc: 'Water conservation for big onions' },
                  { tag: '#OrganicFertilizer', desc: 'Vermicompost field trials' },
                  { tag: '#BellPepper', desc: 'Protected greenhouse fertigation' },
                ].map((item) => (
                  <button
                    key={item.tag}
                    onClick={() => {
                      setActiveHashtag(item.tag)
                      setSelectedCategory('ALL')
                    }}
                    className="flex flex-col text-left w-full rounded p-1.5 hover:bg-muted transition-colors"
                  >
                    <span className="text-xs font-bold text-primary">{item.tag}</span>
                    <span className="text-[10px] text-muted-foreground">{item.desc}</span>
                  </button>
                ))}
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>

      {/* CREATE POST MODAL */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" /> Create Agricultural Post
            </DialogTitle>
            <DialogDescription>
              Share field symptoms, harvest success, farming techniques, or market updates.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              <div className="w-1/2">
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Category *</label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMUNITY_CATEGORIES.filter((c) => c.value !== 'ALL').map((cat) => (
                      <SelectItem key={cat.value} value={cat.value} className="text-xs">
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-1/2">
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Visibility</label>
                <Select value={newVisibility} onValueChange={(v) => setNewVisibility(v as any)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PUBLIC" className="text-xs">
                      Public (Everyone)
                    </SelectItem>
                    <SelectItem value="CONNECTIONS" className="text-xs">
                      Connections Only
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Post Content *</label>
              <Textarea
                placeholder="What is happening on your farm? Describe symptoms, crop age, techniques, or ask a question. Use #hashtags (e.g. #Paddy, #LateBlight)..."
                rows={5}
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="text-sm"
              />
            </div>

            {/* Media URLs / attachments */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5" /> Attach Photo URL
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="Paste high-res image URL (e.g. https://...)"
                  value={mediaInputUrl}
                  onChange={(e) => setMediaInputUrl(e.target.value)}
                  className="h-8 text-xs"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-3 text-xs"
                  onClick={() => {
                    if (mediaInputUrl.trim()) {
                      setNewMediaUrls((prev) => [...prev, mediaInputUrl.trim()])
                      setMediaInputUrl('')
                    }
                  }}
                >
                  Add
                </Button>
              </div>

              {newMediaUrls.length > 0 && (
                <div className="flex gap-2 flex-wrap pt-1">
                  {newMediaUrls.map((url, i) => (
                    <div key={i} className="relative group">
                      <img src={url} alt="Attached" className="h-16 w-16 rounded object-cover border" />
                      <button
                        onClick={() => setNewMediaUrls((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute -top-1.5 -right-1.5 rounded-full bg-rose-500 text-white p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handlePublishPost}
              disabled={isSubmittingPost || !newContent.trim()}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              {isSubmittingPost ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Publish Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SHARE / QUOTE POST MODAL */}
      <Dialog open={!!postToShare} onOpenChange={(o) => !o && setPostToShare(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary" /> Quote / Repost
            </DialogTitle>
            <DialogDescription>
              Share {postToShare?.author.name}'s post to your community feed.
            </DialogDescription>
          </DialogHeader>

          {postToShare && (
            <div className="space-y-3 py-2">
              <Textarea
                placeholder="Add your thoughts or commentary (optional)..."
                rows={3}
                value={shareCaption}
                onChange={(e) => setShareCaption(e.target.value)}
                className="text-sm"
              />

              <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold">{postToShare.author.name}</span>
                  <RoleBadge role={postToShare.author.role} />
                </div>
                <p className="text-muted-foreground line-clamp-3 whitespace-pre-line">{postToShare.content}</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPostToShare(null)}>
              Cancel
            </Button>
            <Button onClick={handleQuoteShare} disabled={isSharing} className="bg-primary text-white">
              {isSharing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}
              Share Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* REPORT CONTENT MODAL */}
      <Dialog open={!!reportTarget} onOpenChange={(o) => !o && setReportTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <Flag className="h-5 w-5" /> Report Content to Moderation
            </DialogTitle>
            <DialogDescription>
              Help maintain a constructive, respectful agricultural community.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <label className="text-xs font-semibold text-muted-foreground">Reason for report *</label>
            <Textarea
              placeholder="Why are you reporting this? (e.g. Inappropriate language, false agricultural information, spam, harassment)..."
              rows={4}
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="text-sm"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReportTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitReport}
              disabled={isReporting || !reportReason.trim()}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isReporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Flag className="mr-2 h-4 w-4" />}
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
