"use client"

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSession } from "@/lib/session"
import { communityApi, type CommunityAnnouncement, type CommunityChatMessage, type CommunityPost } from "@/lib/api"
import { toast } from "sonner"
import { Users, MessageSquare, Sparkles, ShieldCheck, Lock, Send, PlusCircle, ImageIcon, Trash2, ArrowLeft } from "lucide-react"

export default function CommunityPage() {
  const router = useRouter()
  const { user, ready } = useSession()
  const [hasAccess, setHasAccess] = useState(false)
  const [loading, setLoading] = useState(true)
  const [membershipStatus, setMembershipStatus] = useState<string | null>(null)
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [messages, setMessages] = useState<CommunityChatMessage[]>([])
  const [announcements, setAnnouncements] = useState<CommunityAnnouncement[]>([])
  const [newPostTitle, setNewPostTitle] = useState("")
  const [newPostBody, setNewPostBody] = useState("")
  const [newMessage, setNewMessage] = useState("")
  const [announcementBody, setAnnouncementBody] = useState("")
  const [savingPost, setSavingPost] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [creatingAnnouncement, setCreatingAnnouncement] = useState(false)
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const [postImageUrl, setPostImageUrl] = useState<string | null>(null)
  const [messageImageUrl, setMessageImageUrl] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"chat" | "feed" | "announcements">("chat")
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const postImageInputRef = useRef<HTMLInputElement | null>(null)
  const messageImageInputRef = useRef<HTMLInputElement | null>(null)

  const features = useMemo(
    () => [
      "Lifetime access after first successful course purchase",
      "Simple group feed for updates and resources",
      "Live chat for verified buyers",
      "Admin announcements and safe moderation",
    ],
    []
  )

  useEffect(() => {
    async function load() {
      if (!ready) return
      if (!user) {
        router.replace(`/auth?redirect=${encodeURIComponent("/community")}`)
        return
      }

      setLoading(true)
      try {
        const access = await communityApi.access()
        setHasAccess(access.hasAccess)
        setMembershipStatus(access.membership?.status ?? null)
        if (access.hasAccess) {
          await refreshCommunity()
        }
      } catch (error) {
        console.error(error)
        setHasAccess(false)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [ready, router, user])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, activeTab])

  async function refreshCommunity() {
    try {
      const [postsData, messageData, announcementsData] = await Promise.all([
        communityApi.listPosts(),
        communityApi.listMessages(),
        communityApi.listAnnouncements(),
      ])
      setPosts(postsData)
      setMessages(messageData)
      setAnnouncements(announcementsData)
    } catch (error) {
      console.error(error)
      toast.error("Unable to load community content.")
    }
  }

  async function uploadCommunityImage(file: File) {
    const formData = new FormData()
    formData.append("file", file)

    const response = await fetch("/api/upload/image", {
      method: "POST",
      credentials: "include",
      body: formData,
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data.error ?? "Image upload failed")
    return data.url as string
  }

  async function handleImagePick(event: ChangeEvent<HTMLInputElement>, target: "post" | "message") {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingMedia(true)
    try {
      const url = await uploadCommunityImage(file)
      if (target === "post") {
        setPostImageUrl(url)
      } else {
        setMessageImageUrl(url)
      }
      toast.success("Image attached")
    } catch (error) {
      console.error(error)
      toast.error("Unable to upload image")
    } finally {
      setUploadingMedia(false)
      event.target.value = ""
    }
  }

  async function handleCreatePost() {
    if (!newPostTitle.trim() && !newPostBody.trim()) {
      toast.error("Write a title or body before posting.")
      return
    }

    setSavingPost(true)
    try {
      await communityApi.createPost(newPostTitle.trim(), newPostBody.trim(), postImageUrl ?? undefined)
      setNewPostTitle("")
      setNewPostBody("")
      setPostImageUrl(null)
      toast.success("Post created.")
      await refreshCommunity()
    } catch (error) {
      console.error(error)
      toast.error("Failed to create post.")
    } finally {
      setSavingPost(false)
    }
  }

  async function handleSendMessage() {
    if (!newMessage.trim() && !messageImageUrl) {
      toast.error("Type a message or attach an image before sending.")
      return
    }

    setSendingMessage(true)
    try {
      await communityApi.createMessage(newMessage.trim(), "general", messageImageUrl ?? undefined)
      setNewMessage("")
      setMessageImageUrl(null)
      toast.success("Message sent.")
      await refreshCommunity()
    } catch (error) {
      console.error(error)
      toast.error("Failed to send message.")
    } finally {
      setSendingMessage(false)
    }
  }

  async function handleCreateAnnouncement() {
    if (!announcementBody.trim()) {
      toast.error("Write an announcement before posting it.")
      return
    }

    setCreatingAnnouncement(true)
    try {
      await communityApi.createAnnouncement(announcementBody.trim())
      setAnnouncementBody("")
      toast.success("Announcement posted.")
      await refreshCommunity()
    } catch (error) {
      console.error(error)
      toast.error("Unable to post announcement.")
    } finally {
      setCreatingAnnouncement(false)
    }
  }

  async function handleDeletePost(postId: string) {
    try {
      await communityApi.deletePost(postId)
      toast.success("Post removed.")
      await refreshCommunity()
    } catch (error) {
      console.error(error)
      toast.error("Unable to remove post.")
    }
  }

  async function handleDeleteMessage(messageId: string) {
    try {
      await communityApi.deleteMessage(messageId)
      toast.success("Message removed.")
      await refreshCommunity()
    } catch (error) {
      console.error(error)
      toast.error("Unable to remove message.")
    }
  }

  async function handleDeleteAnnouncement(announcementId: string) {
    try {
      await communityApi.deleteAnnouncement(announcementId)
      toast.success("Announcement removed.")
      await refreshCommunity()
    } catch (error) {
      console.error(error)
      toast.error("Unable to remove announcement.")
    }
  }

  if (!ready || loading) {
    return <div className="py-10 text-sm text-muted-foreground">Checking community access…</div>
  }

  if (!hasAccess) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-6 py-8">
        <Button variant="outline" onClick={() => router.back()} className="w-fit gap-2">
          <ArrowLeft className="size-4" /> Back
        </Button>
        <Card className="border-dashed">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive"><Lock className="size-4" />Private Community</div>
            <CardTitle>Community access is available after your first course purchase</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>Buy any course on Edgerax and complete the Razorpay payment to unlock lifetime community access.</p>
            <Button onClick={() => router.push("/")}>Browse courses</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 py-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-border bg-background/80 p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3">
          <Button variant="outline" onClick={() => router.back()} className="w-fit gap-2">
            <ArrowLeft className="size-4" /> Back
          </Button>
          <div>
            <p className="text-sm font-medium text-primary">Edgerax Community</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Welcome back, {user?.name ?? "member"}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">A simple, friendly community for verified buyers with chat, updates, and announcements.</p>
          </div>
        </div>
        <Badge variant="secondary" className="gap-2">
          <ShieldCheck className="size-3" /> Lifetime access enabled
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-4" /> Community Hub
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border bg-muted/50 p-3 text-sm">
              <div className="font-medium text-foreground">Verified buyers only</div>
              <div className="mt-1 text-muted-foreground">Status: {membershipStatus ?? "active"}</div>
            </div>

            <div className="space-y-2">
              {[
                { key: "chat", label: "Group chat", icon: MessageSquare, description: "Live conversation" },
                { key: "feed", label: "Community feed", icon: Sparkles, description: "Share updates" },
                { key: "announcements", label: "Announcements", icon: ShieldCheck, description: "Admin notices" },
              ].map((item) => {
                const Icon = item.icon
                const active = activeTab === item.key
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setActiveTab(item.key as "chat" | "feed" | "announcements")}
                    className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${active ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-muted/60"}`}
                  >
                    <div className={`rounded-xl p-2 ${active ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      <Icon className="size-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{item.label}</div>
                      <div className="text-xs text-muted-foreground">{item.description}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "chat" | "feed" | "announcements")}
            className="flex h-full flex-col">
            <CardHeader className="pb-2">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="chat">Chat</TabsTrigger>
                <TabsTrigger value="feed">Feed</TabsTrigger>
                <TabsTrigger value="announcements">Announcements</TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent className="flex-1 p-0">
              <TabsContent value="chat" className="mt-0 flex h-[620px] flex-col">
                <div className="flex-1 overflow-y-auto bg-gradient-to-b from-muted/20 to-background p-4">
                  {messages.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border bg-background/80 p-6 text-sm text-muted-foreground">
                      No chat messages yet. Start the conversation and say hello to the community.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((message) => {
                        const isMine = message.userId === user?.id
                        return (
                          <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[85%] rounded-3xl border px-3 py-2 text-sm shadow-sm ${isMine ? "border-primary/20 bg-primary text-primary-foreground" : "border-border bg-background"}`}>
                              <div className={`mb-1 flex items-center justify-between gap-2 text-[11px] ${isMine ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                                <div>
                                  <span>{isMine ? "You" : message.userId.slice(0, 8)}</span>
                                  <span className="ml-2">{new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                                </div>
                                {user?.role === "admin" && (
                                  <button type="button" onClick={() => handleDeleteMessage(message.id)} className="rounded-full p-1 hover:bg-black/10">
                                    <Trash2 className="size-3" />
                                  </button>
                                )}
                              </div>
                              <p className="leading-relaxed">{message.message}</p>
                              {message.attachmentUrl && (
                                <img src={message.attachmentUrl} alt="Community attachment" className="mt-2 max-h-48 rounded-xl border object-cover" />
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="border-t bg-background p-3">
                  <Textarea
                    value={newMessage}
                    onChange={(event) => setNewMessage(event.target.value)}
                    placeholder="Type a message to the group"
                    rows={3}
                    className="min-h-[88px] resize-none"
                  />
                  <input
                    ref={messageImageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => handleImagePick(event, "message")}
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button type="button" variant="outline" onClick={() => messageImageInputRef.current?.click()} disabled={uploadingMedia}>
                      <ImageIcon data-icon="inline-start" /> {uploadingMedia ? "Uploading…" : "Add image"}
                    </Button>
                    {messageImageUrl && (
                      <Button type="button" variant="ghost" onClick={() => setMessageImageUrl(null)}>
                        <Trash2 data-icon="inline-start" /> Remove image
                      </Button>
                    )}
                  </div>
                  {messageImageUrl && (
                    <img src={messageImageUrl} alt="Message attachment preview" className="mt-3 max-h-28 rounded-xl border object-cover" />
                  )}
                  <Button onClick={handleSendMessage} disabled={sendingMessage} className="mt-3 w-full justify-center">
                    <Send data-icon="inline-start" /> {sendingMessage ? "Sending…" : "Send message"}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="feed" className="mt-0 flex h-[620px] flex-col">
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="mb-4 rounded-2xl border border-border bg-muted/40 p-4">
                    <Input
                      value={newPostTitle}
                      onChange={(event) => setNewPostTitle(event.target.value)}
                      placeholder="What do you want to share?"
                      className="mb-2"
                    />
                    <Textarea
                      value={newPostBody}
                      onChange={(event) => setNewPostBody(event.target.value)}
                      placeholder="Share an update, question, or resource with the group"
                      rows={3}
                    />
                    <input
                      ref={postImageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => handleImagePick(event, "post")}
                    />
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Button type="button" variant="outline" onClick={() => postImageInputRef.current?.click()} disabled={uploadingMedia}>
                        <ImageIcon data-icon="inline-start" /> {uploadingMedia ? "Uploading…" : "Add image"}
                      </Button>
                      {postImageUrl && (
                        <Button type="button" variant="ghost" onClick={() => setPostImageUrl(null)}>
                          <Trash2 data-icon="inline-start" /> Remove image
                        </Button>
                      )}
                    </div>
                    {postImageUrl && (
                      <img src={postImageUrl} alt="Attached preview" className="mt-3 max-h-48 rounded-xl border object-cover" />
                    )}
                    <Button onClick={handleCreatePost} disabled={savingPost} className="mt-3 w-full justify-center">
                      <PlusCircle data-icon="inline-start" /> {savingPost ? "Posting…" : "Create update"}
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {posts.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-border bg-background/80 p-6 text-sm text-muted-foreground">
                        No feed posts yet. Start the conversation with your first update.
                      </div>
                    ) : (
                      posts.map((post) => (
                        <div key={post.id} className="rounded-2xl border border-border bg-background p-4 shadow-sm">
                          <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <span>from {post.userId.slice(0, 8)}</span>
                              <span>{new Date(post.createdAt).toLocaleString()}</span>
                            </div>
                            {user?.role === "admin" && (
                              <Button type="button" variant="ghost" size="sm" onClick={() => handleDeletePost(post.id)}>
                                <Trash2 className="size-3" />
                              </Button>
                            )}
                          </div>
                          <div className="font-medium text-foreground">{post.title || "Untitled update"}</div>
                          <p className="mt-2 text-sm leading-relaxed text-foreground/90">{post.body}</p>
                          {post.attachments && post.attachments !== "[]" && (
                            <img src={JSON.parse(post.attachments)[0]} alt="Community post attachment" className="mt-3 max-h-60 rounded-xl border object-cover" />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="announcements" className="mt-0 flex h-[620px] flex-col overflow-y-auto p-4">
                {user?.role === "admin" && (
                  <div className="mb-4 rounded-2xl border border-border bg-muted/40 p-4">
                    <Textarea
                      value={announcementBody}
                      onChange={(event) => setAnnouncementBody(event.target.value)}
                      placeholder="Write an announcement for the group"
                      rows={3}
                    />
                    <Button onClick={handleCreateAnnouncement} disabled={creatingAnnouncement} className="mt-3 w-full justify-center">
                      <ShieldCheck data-icon="inline-start" /> {creatingAnnouncement ? "Posting…" : "Post announcement"}
                    </Button>
                  </div>
                )}
                {announcements.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-background/80 p-6 text-sm text-muted-foreground">
                    No announcements yet. Admins will post important updates here.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {announcements.map((announcement) => (
                      <div key={announcement.id} className="rounded-2xl border border-border bg-muted/40 p-4">
                        <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <span>Announcement</span>
                            <span>{new Date(announcement.createdAt).toLocaleDateString()}</span>
                          </div>
                          {user?.role === "admin" && (
                            <Button type="button" variant="ghost" size="sm" onClick={() => handleDeleteAnnouncement(announcement.id)}>
                              <Trash2 className="size-3" />
                            </Button>
                          )}
                        </div>
                        <p className="text-sm leading-relaxed text-foreground/90">{announcement.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Community membership</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm text-muted-foreground md:grid-cols-3">
          <div className="rounded-md border p-3">Status: <span className="font-semibold text-foreground">{membershipStatus ?? "active"}</span></div>
          <div className="rounded-md border p-3">Lifetime community access after first purchase.</div>
          <div className="rounded-md border p-3">Everything is simple and visible for members.</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What’s included</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
          {features.map((feature) => (
            <div key={feature} className="rounded-md border p-3">{feature}</div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
