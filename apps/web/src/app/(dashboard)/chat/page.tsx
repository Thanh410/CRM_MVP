'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { RippleButton } from '@/components/ui/ripple-button';
import { useAuthStore } from '@/store/auth.store';
import { ChatThread } from './_components/chat-thread';
import { ConversationList } from './_components/conversation-list';
import { CreateGroupDialog, GroupSettingsDialog } from './_components/group-dialogs';
import { getConversationTitle } from './chat-meta';
import {
  useChatConversation,
  useChatConversations,
  useChatMessages,
  useChatMutations,
  useChatUsers,
} from './hooks';
import { connectChatRealtime } from './realtime';
import type { ChatKindFilter, ChatMessage } from './types';

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);

  const activeId = searchParams.get('conversationId');
  const [kind, setKind] = useState<ChatKindFilter>('all');
  const [search, setSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [message, setMessage] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groupSettingsOpen, setGroupSettingsOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [addUserIds, setAddUserIds] = useState<string[]>([]);

  const conversationsQuery = useChatConversations(kind, search);
  const activeConversationQuery = useChatConversation(activeId);
  const messagesQuery = useChatMessages(activeId);
  const usersQuery = useChatUsers(userSearch);
  const chat = useChatMutations(activeId, currentUser?.id, currentUser?.fullName);

  const setActiveId = useCallback(
    (conversationId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (conversationId) params.set('conversationId', conversationId);
      else params.delete('conversationId');
      const query = params.toString();
      router.replace(query ? `/chat?${query}` : '/chat', { scroll: false });
    },
    [router, searchParams],
  );

  const activeConversation = useMemo(
    () =>
      conversationsQuery.data?.find((conversation) => conversation.id === activeId) ??
      activeConversationQuery.data ??
      null,
    [activeConversationQuery.data, activeId, conversationsQuery.data],
  );

  const selectableUsers = (usersQuery.data ?? []).filter((user) => user.id !== currentUser?.id);

  useEffect(() => connectChatRealtime(queryClient, accessToken), [accessToken, queryClient]);

  useEffect(() => {
    if (activeId) chat.markRead.mutate(activeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  useEffect(() => {
    if (activeConversation?.kind === 'GROUP') {
      setGroupName(getConversationTitle(activeConversation, currentUser?.id));
    }
  }, [activeConversation, currentUser?.id]);

  const handleStartDirect = (userId: string) => {
    chat.startDirect.mutate(userId, {
      onSuccess: (conversation) => {
        setActiveId(conversation.id);
        setUserSearch('');
      },
    });
  };

  const handleCreateGroup = () => {
    chat.createGroup.mutate(
      { name: groupName.trim(), participantIds: selectedUserIds },
      {
        onSuccess: (conversation) => {
          setActiveId(conversation.id);
          setCreatingGroup(false);
          setGroupName('');
          setSelectedUserIds([]);
          setUserSearch('');
        },
      },
    );
  };

  const handleSend = () => {
    const content = message.trim();
    if (!content || !activeId) return;
    chat.sendMessage.mutate({ content });
    setMessage('');
  };

  const handleRetryMessage = (failedMessage: ChatMessage) => {
    if (!failedMessage.failed) return;
    chat.sendMessage.mutate({ content: failedMessage.content, clientId: failedMessage.id });
  };

  const toggleSelectedUser = (userId: string) => {
    setSelectedUserIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId],
    );
  };

  const handleRenameGroup = () => {
    if (!activeConversation || activeConversation.kind !== 'GROUP') return;
    chat.renameGroup.mutate({ conversationId: activeConversation.id, name: groupName.trim() });
  };

  const handleAddParticipants = () => {
    if (!activeConversation || addUserIds.length === 0) return;
    chat.addParticipants.mutate(
      { conversationId: activeConversation.id, userIds: addUserIds },
      { onSuccess: () => setAddUserIds([]) },
    );
  };

  const handleRemoveParticipant = (userId: string) => {
    if (!activeConversation) return;
    chat.removeParticipant.mutate({ conversationId: activeConversation.id, userId });
  };

  const handleLeaveGroup = () => {
    if (!activeConversation || !currentUser?.id) return;
    chat.removeParticipant.mutate(
      { conversationId: activeConversation.id, userId: currentUser.id },
      {
        onSuccess: () => {
          setGroupSettingsOpen(false);
          setActiveId(null);
        },
      },
    );
  };

  return (
    <div className="flex h-full min-h-[520px] min-w-0 flex-col lg:min-h-0">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold tracking-tight">Chat nội bộ</h1>
          <p className="mt-1 text-sm text-muted-foreground">Trao đổi cá nhân và nhóm trong công ty.</p>
        </div>
        <RippleButton
          onClick={() => {
            setCreatingGroup(true);
            setGroupName('');
            setSelectedUserIds([]);
          }}
          size="md"
          className="shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Tạo nhóm</span>
        </RippleButton>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <ConversationList
          activeId={activeId}
          conversations={conversationsQuery.data}
          currentUserId={currentUser?.id}
          isError={conversationsQuery.isError}
          isLoading={conversationsQuery.isLoading}
          kind={kind}
          search={search}
          userSearch={userSearch}
          users={selectableUsers}
          onKindChange={setKind}
          onSearchChange={setSearch}
          onUserSearchChange={setUserSearch}
          onSelectConversation={setActiveId}
          onStartDirect={handleStartDirect}
        />

        <div className={`${activeId ? 'flex' : 'hidden lg:flex'} min-w-0 flex-1`}>
          <ChatThread
            conversation={activeConversation}
            currentUserId={currentUser?.id}
            messageDraft={message}
            messages={messagesQuery.data}
            messagesLoading={messagesQuery.isLoading}
            sending={chat.sendMessage.isPending}
            onBack={() => setActiveId(null)}
            onDraftChange={setMessage}
            onOpenGroupSettings={() => setGroupSettingsOpen(true)}
            onRetryMessage={handleRetryMessage}
            onSend={handleSend}
          />
        </div>
      </div>

      <CreateGroupDialog
        groupName={groupName}
        open={creatingGroup}
        selectedUserIds={selectedUserIds}
        users={selectableUsers}
        userSearch={userSearch}
        creating={chat.createGroup.isPending}
        onClose={() => setCreatingGroup(false)}
        onCreate={handleCreateGroup}
        onGroupNameChange={setGroupName}
        onToggleUser={toggleSelectedUser}
        onUserSearchChange={setUserSearch}
      />

      <GroupSettingsDialog
        addUserIds={addUserIds}
        conversation={activeConversation}
        currentUserId={currentUser?.id}
        groupName={groupName}
        open={groupSettingsOpen}
        users={selectableUsers}
        userSearch={userSearch}
        saving={
          chat.renameGroup.isPending ||
          chat.addParticipants.isPending ||
          chat.removeParticipant.isPending
        }
        onAddUsersChange={setAddUserIds}
        onClose={() => setGroupSettingsOpen(false)}
        onGroupNameChange={setGroupName}
        onLeave={handleLeaveGroup}
        onRemoveUser={handleRemoveParticipant}
        onRename={handleRenameGroup}
        onSubmitAddUsers={handleAddParticipants}
        onUserSearchChange={setUserSearch}
      />
    </div>
  );
}
