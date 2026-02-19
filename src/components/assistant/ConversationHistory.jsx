import React from "react";
import { useQuery } from "@tanstack/react-query";
import api from '@/api/firebaseClient';
import { Trash2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export default function ConversationHistory({ selectedPet, onSelectConversation, onRefresh }) {
  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations', selectedPet?.id],
    queryFn: () => selectedPet ? api.entities.ChatConversation.filter({ pet_id: selectedPet.id }, '-last_message_timestamp', 20) : Promise.resolve([]),
    enabled: !!selectedPet
  });

  const handleDelete = async (id) => {
    if (confirm('Delete this conversation?')) {
      await api.entities.ChatConversation.delete(id);
      onRefresh?.();
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-slate-300">Conversation History</p>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {conversations.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">No conversations yet</p>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className="flex items-start justify-between p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors group"
            >
              <button
                onClick={() => onSelectConversation(conv)}
                className="flex-1 text-left"
              >
                <p className="text-sm text-white truncate font-medium">{conv.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {conv.message_count} messages • {format(new Date(conv.last_message_timestamp), 'MMM d')}
                </p>
              </button>
              <button
                onClick={() => handleDelete(conv.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity ml-2"
              >
                <Trash2 className="w-4 h-4 text-red-400 hover:text-red-300" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}