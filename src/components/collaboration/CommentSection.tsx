"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Send,
  Reply,
  MoreHorizontal,
  Pencil,
  Trash2,
  User as UserIcon,
  Clock,
  AtSign,
} from "lucide-react";

export interface CommentUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

export interface Comment {
  id: string;
  content: string;
  mentions: string[];
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  author: CommentUser;
  replies?: Comment[];
  _count?: {
    replies: number;
  };
}

interface CommentSectionProps {
  comments: Comment[];
  currentUserId?: string;
  onAddComment: (content: string, parentId?: string) => Promise<void>;
  onEditComment: (commentId: string, content: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  isLoading?: boolean;
  mentionableUsers?: CommentUser[];
}

export default function CommentSection({
  comments,
  currentUserId,
  onAddComment,
  onEditComment,
  onDeleteComment,
  isLoading = false,
  mentionableUsers = [],
}: CommentSectionProps) {
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onAddComment(newComment, replyingTo || undefined);
      setNewComment("");
      setReplyingTo(null);
    } catch (error) {
      console.error("Failed to add comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-white/70" />
        <h3 className="font-medium text-white">Comments ({comments.length})</h3>
      </div>

      {/* Comment form */}
      <div className="p-4 border-b border-white/10">
        <form onSubmit={handleSubmit}>
          {replyingTo && (
            <div className="mb-2 flex items-center gap-2 text-xs text-white/50">
              <Reply className="w-3 h-3" />
              <span>Replying to comment</span>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="text-emerald-400 hover:text-emerald-300"
              >
                Cancel
              </button>
            </div>
          )}
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
              <UserIcon className="w-4 h-4 text-white/50" />
            </div>
            <div className="flex-1">
              <CommentInput
                value={newComment}
                onChange={setNewComment}
                mentionableUsers={mentionableUsers}
                placeholder={
                  replyingTo ? "Write a reply..." : "Write a comment..."
                }
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-white/40">
                  Use @name to mention someone
                </span>
                <button
                  type="submit"
                  disabled={!newComment.trim() || isSubmitting}
                  className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-white/10 disabled:text-white/30 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {isSubmitting ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {replyingTo ? "Reply" : "Comment"}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Comments list */}
      <div className="divide-y divide-white/5">
        {isLoading && comments.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
          </div>
        ) : comments.length === 0 ? (
          <div className="p-8 text-center text-white/40">
            <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No comments yet</p>
            <p className="text-xs mt-1">Be the first to comment</p>
          </div>
        ) : (
          <AnimatePresence>
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                currentUserId={currentUserId}
                onReply={() => setReplyingTo(comment.id)}
                onEdit={onEditComment}
                onDelete={onDeleteComment}
                mentionableUsers={mentionableUsers}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

// Comment input with mention support
interface CommentInputProps {
  value: string;
  onChange: (value: string) => void;
  mentionableUsers: CommentUser[];
  placeholder?: string;
}

function CommentInput({
  value,
  onChange,
  mentionableUsers,
  placeholder,
}: CommentInputProps) {
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "@") {
      setShowMentions(true);
      setMentionSearch("");
    } else if (showMentions && e.key === "Escape") {
      setShowMentions(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Check if we're in a mention context
    const lastAtIndex = newValue.lastIndexOf("@");
    if (lastAtIndex !== -1) {
      const afterAt = newValue.slice(lastAtIndex + 1);
      if (!afterAt.includes(" ") && !afterAt.includes("]")) {
        setShowMentions(true);
        setMentionSearch(afterAt.toLowerCase());
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (user: CommentUser) => {
    const lastAtIndex = value.lastIndexOf("@");
    const beforeAt = value.slice(0, lastAtIndex);
    const displayName = user.name || user.email?.split("@")[0] || "Unknown";
    const newValue = `${beforeAt}@[${displayName}](${user.id}) `;
    onChange(newValue);
    setShowMentions(false);
  };

  const filteredUsers = mentionableUsers.filter(
    (user) =>
      user.name?.toLowerCase().includes(mentionSearch) ||
      user.email?.toLowerCase().includes(mentionSearch),
  );

  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={2}
        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
      />

      {/* Mention dropdown */}
      <AnimatePresence>
        {showMentions && filteredUsers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute z-20 bottom-full left-0 mb-1 w-64 max-h-48 overflow-y-auto bg-[#0F1629] border border-white/10 rounded-lg shadow-xl"
          >
            <div className="p-1">
              {filteredUsers.slice(0, 5).map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => insertMention(user)}
                  className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 text-left"
                >
                  {user.image ? (
                    <img
                      src={user.image}
                      alt=""
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                      <UserIcon className="w-3 h-3 text-white/50" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-white block truncate">
                      {user.name || user.email?.split("@")[0]}
                    </span>
                    {user.name && user.email && (
                      <span className="text-xs text-white/40 block truncate">
                        {user.email}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Individual comment item
interface CommentItemProps {
  comment: Comment;
  currentUserId?: string;
  onReply: () => void;
  onEdit: (commentId: string, content: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  mentionableUsers: CommentUser[];
  depth?: number;
}

function CommentItem({
  comment,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  mentionableUsers,
  depth = 0,
}: CommentItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isOwner = currentUserId === comment.author.id;
  const timeAgo = formatTimeAgo(new Date(comment.createdAt));

  const handleSaveEdit = async () => {
    if (!editContent.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onEdit(comment.id, editContent);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to edit comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this comment?")) return;
    try {
      await onDelete(comment.id);
    } catch (error) {
      console.error("Failed to delete comment:", error);
    }
  };

  // Format content with mentions highlighted
  const formattedContent = comment.content.replace(
    /@\[([^\]]+)\]\(([^)]+)\)/g,
    (_, name) => `<span class="text-emerald-400">@${name}</span>`,
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`p-4 ${depth > 0 ? "pl-12 bg-white/[0.01]" : ""}`}
    >
      <div className="flex gap-3">
        {/* Avatar */}
        {comment.author.image ? (
          <img
            src={comment.author.image}
            alt=""
            className="w-8 h-8 rounded-full flex-shrink-0"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
            <UserIcon className="w-4 h-4 text-white/50" />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-white">
              {comment.author.name || comment.author.email?.split("@")[0]}
            </span>
            <span className="text-xs text-white/40 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {timeAgo}
            </span>
            {comment.isEdited && (
              <span className="text-xs text-white/30">(edited)</span>
            )}
          </div>

          {isEditing ? (
            <div className="mt-2">
              <CommentInput
                value={editContent}
                onChange={setEditContent}
                mentionableUsers={mentionableUsers}
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleSaveEdit}
                  disabled={isSubmitting}
                  className="px-3 py-1 bg-emerald-500 text-white rounded text-xs"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(comment.content);
                  }}
                  className="px-3 py-1 bg-white/10 text-white/70 rounded text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p
              className="text-sm text-white/70 mt-1"
              dangerouslySetInnerHTML={{ __html: formattedContent }}
            />
          )}

          {/* Actions */}
          {!isEditing && (
            <div className="flex items-center gap-4 mt-2">
              {depth === 0 && (
                <button
                  onClick={onReply}
                  className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70"
                >
                  <Reply className="w-3 h-3" />
                  Reply
                </button>
              )}

              {isOwner && (
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70"
                  >
                    <MoreHorizontal className="w-3 h-3" />
                  </button>

                  {showMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowMenu(false)}
                      />
                      <div className="absolute z-20 left-0 top-full mt-1 bg-[#0F1629] border border-white/10 rounded-lg shadow-xl py-1 w-24">
                        <button
                          onClick={() => {
                            setIsEditing(true);
                            setShowMenu(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-white/70 hover:bg-white/5"
                        >
                          <Pencil className="w-3 h-3" />
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            handleDelete();
                            setShowMenu(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-white/5"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 ml-8 space-y-0 border-l border-white/10">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              mentionableUsers={mentionableUsers}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

// Helper function to format time ago
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}
