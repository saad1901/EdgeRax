"use client"

import { useEffect, useState } from "react"
import { MessageSquare, Trash2, Users, MessageCircle, BookOpen, Search, AlertCircle } from "lucide-react"
import { AdminShell } from "@/components/admin-shell"
import { adminCommunityApi, type CommunityPost, type CommunityChatMessage, type CommunityAnnouncement } from "@/lib/api"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function AdminCommunityPage() {
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [messages, setMessages] = useState<CommunityChatMessage[]>([])
  const [announcements, setAnnouncements] = useState<CommunityAnnouncement[]>([])
  const [loading, setLoading] = useState(true)
  const [searchPostsQuery, setSearchPostsQuery] = useState("")
  const [searchMessagesQuery, setSearchMessagesQuery] = useState("")
  const [activeTab, setActiveTab] = useState<"posts" | "messages" | "announcements">("posts")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; type: "post" | "message" | "announcement" } | null>(null)

  async function loadCommunityData() {
    setLoading(true)
    try {
      const [postsData, messagesData, announcementsData] = await Promise.all([
        adminCommunityApi.listAllPosts(),
        adminCommunityApi.listAllMessages(),
        adminCommunityApi.listAllAnnouncements(),
      ])
      setPosts(postsData.filter((p) => !p.deleted))
      setMessages(messagesData.filter((m) => !m.deleted))
      setAnnouncements(announcementsData)
    } catch (error) {
      console.error(error)
      toast.error("Failed to load community data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCommunityData()
  }, [])

  async function handleDeletePost(postId: string) {
    setDeletingId(postId)
    try {
      await adminCommunityApi.deletePost(postId)
      setPosts((prev) => prev.filter((p) => p.id !== postId))
      toast.success("Post removed from community")
      setConfirmDelete(null)
    } catch (error) {
      console.error(error)
      toast.error("Failed to delete post")
    } finally {
      setDeletingId(null)
    }
  }

  async function handleDeleteMessage(messageId: string) {
    setDeletingId(messageId)
    try {
      await adminCommunityApi.deleteMessage(messageId)
      setMessages((prev) => prev.filter((m) => m.id !== messageId))
      toast.success("Message removed from community")
      setConfirmDelete(null)
    } catch (error) {
      console.error(error)
      toast.error("Failed to delete message")
    } finally {
      setDeletingId(null)
    }
  }

  async function handleDeleteAnnouncement(announcementId: string) {
    setDeletingId(announcementId)
    try {
      await adminCommunityApi.deleteAnnouncement(announcementId)
      setAnnouncements((prev) => prev.filter((a) => a.id !== announcementId))
      toast.success("Announcement removed")
      setConfirmDelete(null)
    } catch (error) {
      console.error(error)
      toast.error("Failed to delete announcement")
    } finally {
      setDeletingId(null)
    }
  }

  const filteredPosts = posts.filter(
    (p) =>
      p.title.toLowerCase().includes(searchPostsQuery.toLowerCase()) ||
      p.body.toLowerCase().includes(searchPostsQuery.toLowerCase()),
  )

  const filteredMessages = messages.filter(
    (m) => m.message.toLowerCase().includes(searchMessagesQuery.toLowerCase()),
  )

  const stats = [
    { label: "Total Posts", value: posts.length, icon: BookOpen },
    { label: "Total Messages", value: messages.length, icon: MessageCircle },
    { label: "Total Announcements", value: announcements.length, icon: AlertCircle },
  ]

  return (
    <AdminShell>
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <MessageSquare className="size-8 text-primary" /> Community Management
          </h1>
          <p className="mt-2 text-muted-foreground">
            Moderate community content, manage posts, messages, and announcements.
          </p>
        </div>

        {/* Stats */}
        {!loading && (
          <div className="grid gap-4 md:grid-cols-3">
            {stats.map(({ label, value, icon: Icon }) => (
              <Card key={label}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardDescription className="text-xs">{label}</CardDescription>
                  <Icon className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{value}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Tabs Navigation */}
        <div className="flex gap-2 border-b">
          {["posts", "messages", "announcements"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as typeof activeTab)}
              className={`px-4 py-2 font-medium transition ${
                activeTab === tab
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner className="size-8" />
          </div>
        ) : activeTab === "posts" ? (
          /* Posts Tab */
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Community Posts</CardTitle>
              <CardDescription>All posts shared by community members. Delete inappropriate content.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search posts…"
                  value={searchPostsQuery}
                  onChange={(e) => setSearchPostsQuery(e.target.value)}
                />
              </div>

              {filteredPosts.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
                  <BookOpen className="size-8 opacity-40" />
                  <p className="font-medium">{searchPostsQuery ? "No posts match your search" : "No posts in the community yet"}</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredPosts.map((post) => (
                    <div key={post.id} className="rounded-lg border p-4 flex items-start justify-between gap-3 bg-card hover:bg-muted/50 transition">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{post.title || "Untitled"}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{post.body}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <span>By: {post.userId.slice(0, 8)}</span>
                          <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmDelete({ id: post.id, type: "post" })}
                        disabled={deletingId === post.id}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : activeTab === "messages" ? (
          /* Messages Tab */
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Chat Messages</CardTitle>
              <CardDescription>All community group chat messages. Remove spam or inappropriate content.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search messages…"
                  value={searchMessagesQuery}
                  onChange={(e) => setSearchMessagesQuery(e.target.value)}
                />
              </div>

              {filteredMessages.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
                  <MessageCircle className="size-8 opacity-40" />
                  <p className="font-medium">{searchMessagesQuery ? "No messages match your search" : "No messages in the group chat yet"}</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredMessages.map((message) => (
                    <div key={message.id} className="rounded-lg border p-4 flex items-start justify-between gap-3 bg-card hover:bg-muted/50 transition">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-relaxed">{message.message}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <span>By: {message.userId.slice(0, 8)}</span>
                          <span>{new Date(message.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmDelete({ id: message.id, type: "message" })}
                        disabled={deletingId === message.id}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          /* Announcements Tab */
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Announcements</CardTitle>
              <CardDescription>Admin announcements displayed to all community members.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {announcements.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
                  <AlertCircle className="size-8 opacity-40" />
                  <p className="font-medium">No announcements posted yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {announcements.map((announcement) => (
                    <div key={announcement.id} className="rounded-lg border p-4 flex items-start justify-between gap-3 bg-amber-50 border-amber-200">
                      <div className="flex-1 min-w-0">
                        <Badge className="mb-2 bg-amber-600">Admin</Badge>
                        <p className="text-sm leading-relaxed">{announcement.body}</p>
                        <p className="mt-2 text-xs text-muted-foreground">{new Date(announcement.createdAt).toLocaleDateString()}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmDelete({ id: announcement.id, type: "announcement" })}
                        disabled={deletingId === announcement.id}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={confirmDelete !== null} onOpenChange={() => setConfirmDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {confirmDelete?.type}</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The {confirmDelete?.type} will be permanently removed from the community.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex justify-end gap-2">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (!confirmDelete) return
                  if (confirmDelete?.type === "post") {
                    handleDeletePost(confirmDelete.id)
                  } else if (confirmDelete?.type === "message") {
                    handleDeleteMessage(confirmDelete.id)
                  } else {
                    handleDeleteAnnouncement(confirmDelete.id)
                  }
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminShell>
  )
}
