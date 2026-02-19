import React, { useState, useRef, useEffect } from "react";
import api from '@/api/firebaseClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2 } from "lucide-react";
import SuggestedPrompts from "./SuggestedPrompts.jsx";
import SymptomChecker from "./SymptomChecker.jsx";

export default function PetHelperChat({ selectedPet, onConversationCreated }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const handleSelectPrompt = (e) => {
      setInput(e.detail.prompt);
    };
    window.addEventListener('selectPrompt', handleSelectPrompt);
    return () => window.removeEventListener('selectPrompt', handleSelectPrompt);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      // Create conversation on first message if needed
      let convId = currentConversationId;
      if (!convId) {
        const conv = await api.entities.ChatConversation.create({
          pet_id: selectedPet?.id,
          conversation_id: `conv_${Date.now()}`,
          title: userMessage.substring(0, 50),
          messages: [],
          message_count: 0
        });
        convId = conv.id;
        setCurrentConversationId(convId);
        onConversationCreated?.(conv);
      }

      // Build pet context for the AI
      const petContext = selectedPet ? {
        name: selectedPet.name,
        species: selectedPet.species,
        breed: selectedPet.breed,
        age: selectedPet.date_of_birth ? 
          new Date().getFullYear() - new Date(selectedPet.date_of_birth).getFullYear() : 
          null,
        weight: selectedPet.weight,
        allergies: selectedPet.allergies,
        medicalHistory: selectedPet.medical_history,
        spayedNeutered: selectedPet.spayed_neutered,
        conversation_id: convId
      } : null;

      const { data } = await api.functions.invoke('petHelperAI', {
        message: userMessage,
        petContext
      });

      setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);

      // Save to conversation
      const conversation = await api.entities.ChatConversation.get(convId);
      const updatedMessages = [
        ...conversation.messages,
        { role: "user", content: userMessage, timestamp: new Date().toISOString() },
        { role: "assistant", content: data.response, timestamp: new Date().toISOString() }
      ];
      await api.entities.ChatConversation.update(convId, {
        messages: updatedMessages,
        message_count: updatedMessages.length,
        last_message_timestamp: new Date().toISOString()
      });
    } catch (error) {
      setMessages((prev) => [...prev, { 
        role: "assistant", 
        content: "Sorry, I encountered an error. Please try again.",
        isError: true 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-800 p-4">
        <h2 className="font-semibold text-white">
          {selectedPet ? `Chat about ${selectedPet.name}` : "Select a pet to start"}
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Ask about health, behavior, nutrition, and care
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center">
            <div>
              <p className="text-slate-400 text-sm">
                {selectedPet 
                  ? `Ask me anything about ${selectedPet.name}'s health, behavior, or care!`
                  : "Select a pet from the list to get started"}
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs px-4 py-3 rounded-lg ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : msg.isError
                      ? "bg-red-500/20 text-red-200 border border-red-500/30"
                      : "bg-slate-800 text-slate-100"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-800 px-4 py-3 rounded-lg">
                  <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-slate-800 p-4">
        {selectedPet ? (
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Ask a question..."
              disabled={loading}
              className="bg-slate-800 border-slate-700 text-white placeholder-slate-500"
            />
            <Button
              onClick={handleSendMessage}
              disabled={loading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-slate-400 text-center">
            Select a pet to start asking questions
          </p>
        )}
      </div>

      {/* Symptom Checker */}
      {selectedPet && (
        <div className="border-t border-slate-800 p-4 flex-shrink-0">
          <SymptomChecker selectedPet={selectedPet} disabled={false} />
        </div>
      )}

      {/* Suggested Prompts */}
      <div className="border-t border-slate-800 p-4 flex-shrink-0">
        <SuggestedPrompts 
          onSelectPrompt={(prompt) => {
            const event = new CustomEvent('selectPrompt', { detail: { prompt } });
            window.dispatchEvent(event);
          }}
          disabled={false}
        />
      </div>
      </div>
      );
      }