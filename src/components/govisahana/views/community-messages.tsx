'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useApp, api } from '@/lib/store'
import { useT } from '@/lib/use-t'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { RoleBadge } from '@/components/govisahana/badges'
import {
  Send, Image as ImageIcon, Search, ArrowLeft, MoreVertical,
  Sparkles, Check, CheckCheck, Loader2, MessageCircle, UserPlus,
  ShieldAlert, RefreshCw, X, ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ConversationSummary {
  id: string
  otherUser: {
    id: string
    name: string
    email: string
    role: string
    avatarUrl?: string | null
    verified: boolean
    title?: string | null
  }
  lastMessage: {
    id: string
    senderId: string
    body: string
    mediaUrl?: string | null
    read: boolean
    createdAt: string
  } | null
  unreadCount: number
  lastMessageAt: string
}

interface MessageItem {
  id: string
  conversationId: string
  senderId: string
  body: string
  mediaUrl?: string | null
  read: boolean
  createdAt: string
  isMine: boolean
}

export default function CommunityMessagesView() {
  const { user, viewParam, setView } = useApp()
  const t = useT()

  // State
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [activeConversationData, setActiveConversationData] = useState<{
    conversationId: string
    otherUser: ConversationSummary['otherUser']
    messages: MessageItem[]
  } | null>(null)

  // Loading states
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [isSending, setIsSending] = useState(false)

  // Message draft state
  const [messageText, setMessageText] = useState('')
  const [mediaUrl, setMediaUrl] = useState('')
  const [showMediaInput, setShowMediaInput] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // New Chat modal state
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [searchedUsers, setSearchedUsers] = useState<any[]>([])
  const [isSearchingUsers, setIsSearchingUsers] = useState(false)

  // Image preview modal
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  // Auto-scroll to bottom of chat
  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' })
    }
  }, [])

  // Load conversation list
  const loadConversations = useCallback(async (silent = false) => {
    if (!silent) setLoadingConversations(true)
    try {
      const res = await fetch('/api/community/messages', { credentials: 'include' })
      const data = await res.json()
      if (data.conversations) {
        setConversations(data.conversations)
      }
    } catch {
      if (!silent) toast.error('Failed to load conversations')
    } finally {
      if (!silent) setLoadingConversations(false)
    }
  }, [])

  // Load messages for active conversation
  const loadActiveConversation = useCallback(async (convId: string, silent = false) => {
    if (!silent) setLoadingMessages(true)
    try {
      const res = await fetch(`/api/community/messages/${convId}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to load thread')
      const data = await res.json()
      setActiveConversationData(data)
      // Update unread count locally in list
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c))
      )
    } catch {
      if (!silent) toast.error('Could not load chat messages')
    } finally {
      if (!silent) setLoadingMessages(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  // Handle incoming viewParam (recipient ID passed from Profile or Feed)
  useEffect(() => {
    if (!viewParam || conversations.length === 0) return

    // Check if conversation already exists with this user
    const existing = conversations.find((c) => c.otherUser.id === viewParam)
    if (existing) {
      setActiveConversationId(existing.id)
    } else {
      // Fetch target user's details to initiate draft
      fetch(`/api/community/profile/${viewParam}`, { credentials: 'include' })
        .then((res) => res.json())
        .then((data) => {
          if (data.user) {
            setActiveConversationData({
              conversationId: 'draft',
              otherUser: {
                id: data.user.id,
                name: data.user.name,
                email: data.user.email,
                role: data.user.role,
                avatarUrl: data.user.avatarUrl,
                verified: data.user.expertProfile?.verified || false,
                title: data.user.expertProfile?.title || data.user.communityProfile?.profession || null,
              },
              messages: [],
            })
            setActiveConversationId('draft')
          }
        })
        .catch(() => {})
    }
  }, [viewParam, conversations])

  // Polling for active conversation and conversation list
  useEffect(() => {
    if (!activeConversationId || activeConversationId === 'draft') return

    loadActiveConversation(activeConversationId, true)

    const interval = setInterval(() => {
      loadActiveConversation(activeConversationId, true)
    }, 4500)

    return () => clearInterval(interval)
  }, [activeConversationId, loadActiveConversation])

  // Scroll to bottom when messages update
  useEffect(() => {
    if (activeConversationData?.messages?.length) {
      scrollToBottom()
    }
  }, [activeConversationData?.messages?.length, scrollToBottom])

  // Handle sending a message
  const handleSendMessage = async () => {
    if (!messageText.trim() && !mediaUrl.trim()) return
    if (!activeConversationData) return

    const trimmedText = messageText.trim()
    const trimmedMedia = mediaUrl.trim() || undefined

    setIsSending(true)

    try {
      if (activeConversationId === 'draft' || !activeConversationId) {
        // Send via POST /api/community/messages with recipientId
        const res = await api<{ conversationId?: string }>('/api/community/messages', {
          method: 'POST',
          body: JSON.stringify({
            recipientId: activeConversationData.otherUser.id,
            body: trimmedText,
            mediaUrl: trimmedMedia,
          }),
        })

        setMessageText('')
        setMediaUrl('')
        setShowMediaInput(false)
        toast.success('Message sent!')

        // Switch to the newly created conversation ID
        if (res.conversationId) {
          setActiveConversationId(res.conversationId)
          loadActiveConversation(res.conversationId)
          loadConversations(true)
        }
      } else {
        // Send reply via POST /api/community/messages/[id]
        await api(`/api/community/messages/${activeConversationId}`, {
          method: 'POST',
          body: JSON.stringify({
            body: trimmedText,
            mediaUrl: trimmedMedia,
          }),
        })

        setMessageText('')
        setMediaUrl('')
        setShowMediaInput(false)

        // Refresh thread immediately
        await loadActiveConversation(activeConversationId, true)
        loadConversations(true)
      }
    } catch (e) {
      toast.error((e as Error).message || 'Failed to send message')
    } finally {
      setIsSending(false)
    }
  }

  // Handle Enter key inside textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Search users for New Chat modal
  const handleSearchUsers = async (query: string) => {
    setUserSearchQuery(query)
    if (!query.trim() || query.length < 2) {
      setSearchedUsers([])
      return
    }
    setIsSearchingUsers(true)
    try {
      const res = await fetch(`/api/community/search?q=${encodeURIComponent(query)}&type=users`, {
        credentials: 'include',
      })
      const data = await res.json()
      if (data.users) {
        // Exclude current user
        setSearchedUsers(data.users.filter((u: any) => u.id !== user?.id))
      }
    } catch {
      // ignore
    } finally {
      setIsSearchingUsers(false)
    }
  }

  // Select user from New Chat modal
  const handleStartChatWithUser = (targetUser: any) => {
    setShowNewChatModal(false)
    setUserSearchQuery('')
    setSearchedUsers([])

    // Check if conversation exists
    const existing = conversations.find((c) => c.otherUser.id === targetUser.id)
    if (existing) {
      setActiveConversationId(existing.id)
      loadActiveConversation(existing.id)
    } else {
      // Set draft state
      setActiveConversationData({
        conversationId: 'draft',
        otherUser: {
          id: targetUser.id,
          name: targetUser.name,
          email: targetUser.email,
          role: targetUser.role,
          avatarUrl: targetUser.avatarUrl,
          verified: targetUser.expertProfile?.verified || false,
          title: targetUser.expertProfile?.title || targetUser.communityProfile?.profession || null,
        },
        messages: [],
      })
      setActiveConversationId('draft')
    }
  }

  // Block active user
  const handleBlockUser = async (targetUserId: string) => {
    if (!confirm('Are you sure you want to block this user? You will no longer receive messages from them.')) return
    try {
      await api('/api/community/blocks', {
        method: 'POST',
        body: JSON.stringify({ targetUserId, action: 'block' }),
      })
      toast.success('User blocked')
      setActiveConversationId(null)
      setActiveConversationData(null)
      loadConversations()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  // Filtered conversation list
  const filteredConversations = conversations.filter((c) => {
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase()
    return (
      c.otherUser.name.toLowerCase().includes(term) ||
      c.otherUser.role.toLowerCase().includes(term) ||
      (c.otherUser.title && c.otherUser.title.toLowerCase().includes(term))
    )
  })

  // Format message timestamp
  const formatMsgTime = (isoString: string) => {
    try {
      const d = new Date(isoString)
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  // Format date header
  const formatDateHeader = (isoString: string) => {
    try {
      const d = new Date(isoString)
      const now = new Date()
      if (d.toDateString() === now.toDateString()) return 'Today'
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return ''
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-muted/20 pb-8 pt-4">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView('community')}
              className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Community Feed
            </Button>
          </div>
          <Button
            size="sm"
            onClick={() => setShowNewChatModal(true)}
            className="gap-1.5 bg-primary text-white shadow-xs hover:bg-primary/90 text-xs h-8"
          >
            <UserPlus className="h-3.5 w-3.5" /> New Message
          </Button>
        </div>

        {/* Messaging Container */}
        <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm flex h-[760px] max-h-[82vh]">
          {/* LEFT COLUMN: Conversation List */}
          <div
            className={cn(
              'flex flex-col border-r border-border/80 bg-card w-full md:w-80 lg:w-96 shrink-0 transition-all',
              activeConversationId ? 'hidden md:flex' : 'flex'
            )}
          >
            {/* Conversations Header */}
            <div className="border-b border-border/60 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <MessageCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold tracking-tight">Direct Messages</h2>
                    <p className="text-[11px] text-muted-foreground">Agricultural community conversations</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground"
                  onClick={() => loadConversations()}
                  title="Refresh conversations"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Search bar */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search chats by name or role..."
                  className="pl-8 h-8 text-xs bg-muted/40 border-border/60"
                />
              </div>
            </div>

            {/* Conversation Items List */}
            <div className="flex-1 overflow-y-auto divide-y divide-border/40">
              {loadingConversations ? (
                <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-xs">Loading conversations...</span>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center px-4 text-center">
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-semibold">No conversations yet</h3>
                  <p className="mt-1 text-xs text-muted-foreground max-w-[200px]">
                    Connect with agricultural experts, farmers, and crop buyers.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 gap-1.5 text-xs h-8"
                    onClick={() => setShowNewChatModal(true)}
                  >
                    <UserPlus className="h-3.5 w-3.5 text-primary" /> Start a Chat
                  </Button>
                </div>
              ) : (
                filteredConversations.map((c) => {
                  const isActive = activeConversationId === c.id
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        setActiveConversationId(c.id)
                        loadActiveConversation(c.id)
                      }}
                      className={cn(
                        'flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-muted/50',
                        isActive && 'bg-primary/5 hover:bg-primary/10'
                      )}
                    >
                      <div className="relative shrink-0">
                        <Avatar className="h-10 w-10 border border-border/60">
                          <AvatarImage src={c.otherUser.avatarUrl || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                            {c.otherUser.name.split(' ').map((s) => s[0]).slice(0, 2).join('')}
                          </AvatarFallback>
                        </Avatar>
                        {c.unreadCount > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white shadow-xs">
                            {c.unreadCount}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-semibold text-foreground truncate">
                            {c.otherUser.name}
                          </span>
                          {c.lastMessage && (
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {formatMsgTime(c.lastMessage.createdAt)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 mt-0.5">
                          <RoleBadge role={c.otherUser.role} />
                          {c.otherUser.verified && (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] px-1 py-0 h-4 gap-0.5">
                              <Sparkles className="h-2.5 w-2.5" /> Expert
                            </Badge>
                          )}
                        </div>

                        <p className={cn(
                          'mt-1 text-xs truncate',
                          c.unreadCount > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'
                        )}>
                          {c.lastMessage ? (
                            c.lastMessage.mediaUrl && !c.lastMessage.body ? (
                              <span className="flex items-center gap-1">
                                <ImageIcon className="h-3 w-3" /> Image attachment
                              </span>
                            ) : (
                              c.lastMessage.body
                            )
                          ) : (
                            'Started a conversation'
                          )}
                        </p>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Active Chat Thread */}
          <div
            className={cn(
              'flex-1 flex flex-col bg-background h-full overflow-hidden',
              !activeConversationId ? 'hidden md:flex' : 'flex'
            )}
          >
            {activeConversationData ? (
              <>
                {/* Chat Header */}
                <div className="flex items-center justify-between border-b border-border/80 px-4 py-3 bg-card shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Mobile back to conversations */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="md:hidden h-8 w-8 -ml-1 text-muted-foreground"
                      onClick={() => {
                        setActiveConversationId(null)
                        setActiveConversationData(null)
                      }}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>

                    <div
                      className="flex items-center gap-3 cursor-pointer group"
                      onClick={() => {
                        setView('user-profile', activeConversationData.otherUser.id)
                      }}
                      title="View Profile"
                    >
                      <Avatar className="h-10 w-10 border border-border/60">
                        <AvatarImage src={activeConversationData.otherUser.avatarUrl || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                          {activeConversationData.otherUser.name.split(' ').map((s) => s[0]).slice(0, 2).join('')}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
                            {activeConversationData.otherUser.name}
                          </h3>
                          {activeConversationData.otherUser.verified && (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-1.5 py-0 h-4 gap-0.5">
                              <Sparkles className="h-2.5 w-2.5" /> Verified
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="capitalize">{activeConversationData.otherUser.role.toLowerCase()}</span>
                          {activeConversationData.otherUser.title && (
                            <>
                              <span>•</span>
                              <span className="truncate">{activeConversationData.otherUser.title}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Header Actions */}
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="hidden sm:flex text-xs h-8 gap-1.5"
                      onClick={() => {
                        setView('user-profile', activeConversationData.otherUser.id)
                      }}
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Profile
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem
                          onClick={() => {
                            setView('user-profile', activeConversationData.otherUser.id)
                          }}
                        >
                          View Social Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleBlockUser(activeConversationData.otherUser.id)}
                          className="text-rose-600 focus:text-rose-600"
                        >
                          <ShieldAlert className="mr-2 h-4 w-4" /> Block User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Messages Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10">
                  {loadingMessages ? (
                    <div className="flex h-48 items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : activeConversationData.messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center px-4">
                      <Avatar className="h-16 w-16 mb-3 border-2 border-primary/20">
                        <AvatarImage src={activeConversationData.otherUser.avatarUrl || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                          {activeConversationData.otherUser.name.split(' ').map((s) => s[0]).slice(0, 2).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <h4 className="text-sm font-semibold">{activeConversationData.otherUser.name}</h4>
                      <p className="text-xs text-muted-foreground max-w-sm mt-1">
                        Send a message to discuss crop diagnosis, agricultural best practices, market prices, or collaborations.
                      </p>
                    </div>
                  ) : (
                    activeConversationData.messages.map((m, idx) => {
                      const showDateHeader =
                        idx === 0 ||
                        formatDateHeader(m.createdAt) !== formatDateHeader(activeConversationData.messages[idx - 1].createdAt)

                      return (
                        <div key={m.id} className="space-y-2">
                          {showDateHeader && (
                            <div className="flex items-center justify-center my-3">
                              <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                {formatDateHeader(m.createdAt)}
                              </span>
                            </div>
                          )}

                          <div
                            className={cn(
                              'flex flex-col max-w-[82%] sm:max-w-[70%]',
                              m.isMine ? 'ml-auto items-end' : 'mr-auto items-start'
                            )}
                          >
                            <div
                              className={cn(
                                'rounded-2xl px-3.5 py-2.5 text-xs shadow-xs space-y-1.5 break-words',
                                m.isMine
                                  ? 'bg-primary text-white rounded-br-xs'
                                  : 'bg-card border border-border/70 text-foreground rounded-bl-xs'
                              )}
                            >
                              {/* Attached Image */}
                              {m.mediaUrl && (
                                <div
                                  className="overflow-hidden rounded-lg cursor-pointer max-w-sm border border-black/10"
                                  onClick={() => setPreviewImage(m.mediaUrl!)}
                                >
                                  <img
                                    src={m.mediaUrl}
                                    alt="Shared attachment"
                                    className="max-h-56 w-full object-cover hover:opacity-95 transition-opacity"
                                  />
                                </div>
                              )}

                              {/* Text message */}
                              {m.body && <p className="leading-relaxed whitespace-pre-wrap">{m.body}</p>}
                            </div>

                            {/* Timestamp & read status */}
                            <div className="flex items-center gap-1 mt-0.5 px-1 text-[10px] text-muted-foreground">
                              <span>{formatMsgTime(m.createdAt)}</span>
                              {m.isMine && (
                                m.read ? (
                                  <CheckCheck className="h-3 w-3 text-emerald-600" />
                                ) : (
                                  <Check className="h-3 w-3 text-muted-foreground" />
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Photo Attachment URL Input Drawer */}
                {showMediaInput && (
                  <div className="border-t border-border/60 bg-muted/30 p-2.5 flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-primary shrink-0" />
                    <Input
                      value={mediaUrl}
                      onChange={(e) => setMediaUrl(e.target.value)}
                      placeholder="Paste image URL (e.g. crop photo, diseased leaf, invoice)..."
                      className="h-8 text-xs bg-background"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground"
                      onClick={() => {
                        setShowMediaInput(false)
                        setMediaUrl('')
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}

                {/* Input Bar */}
                <div className="border-t border-border/80 p-3 bg-card shrink-0">
                  <div className="flex items-end gap-2">
                    <Button
                      variant={showMediaInput ? 'secondary' : 'ghost'}
                      size="icon"
                      className="h-9 w-9 text-muted-foreground hover:text-foreground shrink-0"
                      onClick={() => setShowMediaInput(!showMediaInput)}
                      title="Attach photo URL"
                    >
                      <ImageIcon className="h-4 w-4" />
                    </Button>

                    <Textarea
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={`Type a message to ${activeConversationData.otherUser.name.split(' ')[0]}...`}
                      rows={1}
                      className="min-h-[38px] max-h-24 resize-none text-xs py-2.5 px-3 bg-muted/20 border-border/70"
                    />

                    <Button
                      onClick={handleSendMessage}
                      disabled={isSending || (!messageText.trim() && !mediaUrl.trim())}
                      className="h-9 w-9 p-0 bg-primary text-white hover:bg-primary/90 shrink-0"
                      title="Send message (Enter)"
                    >
                      {isSending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 block px-1">
                    Press <kbd className="rounded border px-1 text-[9px]">Enter</kbd> to send, <kbd className="rounded border px-1 text-[9px]">Shift+Enter</kbd> for new line
                  </span>
                </div>
              </>
            ) : (
              /* No Conversation Selected Placeholder */
              <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-muted/10">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3">
                  <MessageCircle className="h-7 w-7" />
                </div>
                <h3 className="text-base font-bold text-foreground">Select a Conversation</h3>
                <p className="mt-1 text-xs text-muted-foreground max-w-sm leading-relaxed">
                  Choose a conversation from the left sidebar or start a new direct chat with agricultural experts, farmers, and verified stakeholders.
                </p>
                <Button
                  onClick={() => setShowNewChatModal(true)}
                  className="mt-4 gap-1.5 bg-primary text-white text-xs h-8"
                >
                  <UserPlus className="h-3.5 w-3.5" /> Start New Chat
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* NEW CHAT MODAL */}
      <Dialog open={showNewChatModal} onOpenChange={setShowNewChatModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <MessageCircle className="h-4 w-4 text-primary" /> Start a Direct Conversation
            </DialogTitle>
            <DialogDescription className="text-xs">
              Search for Sri Lankan agricultural experts, farmers, workers, or crop buyers to start messaging.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={userSearchQuery}
                onChange={(e) => handleSearchUsers(e.target.value)}
                placeholder="Type a name, role, or district (e.g. Anura, Farmer, Kandy)..."
                className="pl-8 h-9 text-xs"
              />
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-border/50 rounded-lg border border-border/60">
              {isSearchingUsers ? (
                <div className="flex h-28 items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : searchedUsers.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  {userSearchQuery ? 'No members found matching your search.' : 'Type at least 2 characters to search members.'}
                </div>
              ) : (
                searchedUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handleStartChatWithUser(u)}
                    className="flex w-full items-center gap-3 p-2.5 text-left transition-colors hover:bg-muted/60"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={u.avatarUrl || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {u.name.split(' ').map((s: string) => s[0]).slice(0, 2).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-foreground truncate">{u.name}</span>
                        {u.expertProfile?.verified && (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] px-1 py-0 h-4">
                            Expert
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="capitalize">{u.role.toLowerCase()}</span>
                        {u.communityProfile?.district && (
                          <span>• {u.communityProfile.district}</span>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-primary">
                      Chat
                    </Button>
                  </button>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowNewChatModal(false)} className="text-xs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* IMAGE PREVIEW MODAL */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="sm:max-w-2xl p-2 bg-black/90 border-0">
          <div className="relative flex items-center justify-center p-2">
            {previewImage && (
              <img
                src={previewImage}
                alt="Enlarged photo attachment"
                className="max-h-[80vh] w-auto rounded object-contain"
              />
            )}
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-2 right-2 h-7 w-7 rounded-full bg-background/80"
              onClick={() => setPreviewImage(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
