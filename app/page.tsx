"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useChat } from "@ai-sdk/react";
import { ArrowUp, Loader2, Plus, Square } from "lucide-react";
import { MessageWall } from "@/components/messages/message-wall";
import { ChatHeader } from "@/app/parts/chat-header";
import { ChatHeaderBlock } from "@/app/parts/chat-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UIMessage } from "ai";
import { useEffect, useState, useRef } from "react";
import { AI_NAME, CLEAR_CHAT_TEXT, OWNER_NAME, WELCOME_MESSAGE } from "@/config";
import Image from "next/image";
import Link from "next/link";

const formSchema = z.object({
  message: z
    .string()
    .min(1, "Message cannot be empty.")
    .max(2000, "Message must be at most 2000 characters."),
});

const STORAGE_KEY = 'chat-messages';

type StorageData = {
  messages: UIMessage[];
  durations: Record<string, number>;
};

const loadMessagesFromStorage = (): { messages: UIMessage[]; durations: Record<string, number> } => {
  if (typeof window === 'undefined') return { messages: [], durations: {} };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { messages: [], durations: {} };

    const parsed = JSON.parse(stored);
    return {
      messages: parsed.messages || [],
      durations: parsed.durations || {},
    };
  } catch (error) {
    console.error('Failed to load messages from localStorage:', error);
    return { messages: [], durations: {} };
  }
};

const saveMessagesToStorage = (messages: UIMessage[], durations: Record<string, number>) => {
  if (typeof window === 'undefined') return;
  try {
    const data: StorageData = { messages, durations };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save messages to localStorage:', error);
  }
};

export default function Chat() {
  const [isClient, setIsClient] = useState(false);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const welcomeMessageShownRef = useRef<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const stored = typeof window !== 'undefined' ? loadMessagesFromStorage() : { messages: [], durations: {} };
  const [initialMessages] = useState<UIMessage[]>(stored.messages);

  const { messages, sendMessage, status, stop, setMessages } = useChat({
    messages: initialMessages,
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    setIsClient(true);
    setDurations(stored.durations);
    setMessages(stored.messages);
  }, []);

  useEffect(() => {
    if (isClient) {
      saveMessagesToStorage(messages, durations);
    }
  }, [durations, messages, isClient]);

  const handleDurationChange = (key: string, duration: number) => {
    setDurations((prevDurations) => {
      const newDurations = { ...prevDurations };
      newDurations[key] = duration;
      return newDurations;
    });
  };

  useEffect(() => {
    if (isClient && initialMessages.length === 0 && !welcomeMessageShownRef.current) {
      const welcomeMessage: UIMessage = {
        id: `welcome-${Date.now()}`,
        role: "assistant",
        parts: [
          {
            type: "text",
            text: WELCOME_MESSAGE,
          },
        ],
      };
      setMessages([welcomeMessage]);
      saveMessagesToStorage([welcomeMessage], {});
      welcomeMessageShownRef.current = true;
    }
  }, [isClient, initialMessages.length, setMessages]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: "",
    },
  });

  function onSubmit(data: z.infer<typeof formSchema>) {
    sendMessage({ text: data.message });
    form.reset();
    // Focus back on input after sending
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function clearChat() {
    const newMessages: UIMessage[] = [];
    const newDurations = {};
    setMessages(newMessages);
    setDurations(newDurations);
    saveMessagesToStorage(newMessages, newDurations);
    welcomeMessageShownRef.current = false;
    toast.success("Chat cleared");
  }

  const isInputEmpty = !form.watch("message")?.trim();

  return (
    /* COLOR CHANGE: Background changed to gradient from gray to orange tint */
    <div className="flex h-screen items-center justify-center font-sans bg-gradient-to-br from-gray-50 via-orange-50/30 to-gray-100 dark:bg-gradient-to-br dark:from-gray-950 dark:via-orange-950/20 dark:to-black">
      <main className="w-full h-screen relative flex flex-col">
        {/* Header with improved backdrop blur */}
        <div className="sticky top-0 z-50 bg-background/80 dark:bg-black/80 backdrop-blur-xl border-b border-border/40">
          <ChatHeader>
            <ChatHeaderBlock />
            <ChatHeaderBlock className="justify-center items-center">
              {/* COLOR CHANGE: Avatar ring color changed to orange */}
              <Avatar className="size-8 ring-2 ring-orange-500/30 shadow-sm shadow-orange-500/20">
                <AvatarImage src="/logo.png" alt={AI_NAME} />
                <AvatarFallback>
                  <Image src="/logo.png" alt="Logo" width={36} height={36} />
                </AvatarFallback>
              </Avatar>
              <p className="tracking-tight font-medium">Chat with {AI_NAME}</p>
            </ChatHeaderBlock>
            <ChatHeaderBlock className="justify-end">
              {/* COLOR CHANGE: Button hover changed to orange tint */}
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer hover:bg-orange-500/10 hover:border-orange-500/50 transition-colors"
                onClick={clearChat}
              >
                <Plus className="size-4" />
                <span className="hidden sm:inline ml-2">{CLEAR_CHAT_TEXT}</span>
              </Button>
            </ChatHeaderBlock>
          </ChatHeader>
        </div>

        {/* Messages area with improved scrolling */}
        /* COLOR CHANGE: Message area background with subtle pattern */
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 scroll-smooth bg-gradient-to-b from-transparent via-white/40 to-transparent dark:via-gray-900/40">
          <div className="flex flex-col items-center justify-end min-h-full">
            <div className="w-full max-w-3xl space-y-4">
              {isClient ? (
                <>
                  <MessageWall 
                    messages={messages} 
                    status={status} 
                    durations={durations} 
                    onDurationChange={handleDurationChange} 
                  />
                  {status === "submitted" && (
                    <div className="flex justify-start">
                      {/* COLOR CHANGE: Loading indicator changed to orange */}
                      <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 px-4 py-2 rounded-lg bg-orange-500/10">
                        <Loader2 className="size-4 animate-spin" />
                        <span className="text-sm">Thinking...</span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex justify-center">
                  {/* COLOR CHANGE: Initial loading spinner changed to orange */}
                  <Loader2 className="size-6 animate-spin text-orange-500" />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* Input area with improved styling */}
        <div className="sticky bottom-0 z-50 bg-gradient-to-t from-background via-background to-transparent dark:from-black dark:via-black border-t border-border/40 backdrop-blur-xl">
          <div className="w-full px-4 md:px-6 pt-4 pb-2 flex justify-center">
            <div className="max-w-3xl w-full">
              <form id="chat-form" onSubmit={form.handleSubmit(onSubmit)}>
                <FieldGroup>
                  <Controller
                    name="message"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="chat-form-message" className="sr-only">
                          Message
                        </FieldLabel>
                        <div className="relative">
                          {/* COLOR CHANGE: Thick orange border - background kept as default */}
                          <Input
                            {...field}
                            ref={inputRef}
                            id="chat-form-message"
                            className="h-14 pr-14 pl-5 rounded-2xl border-[3px] border-orange-500 dark:border-orange-600 focus:border-orange-600 dark:focus:border-orange-500 focus:ring-4 focus:ring-orange-500/30 transition-all shadow-lg shadow-orange-500/20 resize-none"
                            placeholder="Type your message here..."
                            disabled={status === "streaming"}
                            aria-invalid={fieldState.invalid}
                            autoComplete="off"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                if (!isInputEmpty) {
                                  form.handleSubmit(onSubmit)();
                                }
                              }
                            }}
                          />
                          {(status === "ready" || status === "error") && (
                            /* COLOR CHANGE: Send button changed to orange gradient */
                            <Button
                              className="absolute right-2 top-2 rounded-full shadow-md hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                              type="submit"
                              disabled={isInputEmpty}
                              size="icon"
                            >
                              <ArrowUp className="size-4" />
                              <span className="sr-only">Send message</span>
                            </Button>
                          )}
                          {(status === "streaming" || status === "submitted") && (
                            /* COLOR CHANGE: Stop button changed to red */
                            <Button
                              className="absolute right-2 top-2 rounded-full shadow-md hover:scale-105 transition-transform bg-red-500 hover:bg-red-600"
                              size="icon"
                              onClick={() => {
                                stop();
                              }}
                            >
                              <Square className="size-4" />
                              <span className="sr-only">Stop generation</span>
                            </Button>
                          )}
                        </div>
                        {fieldState.error && (
                          /* COLOR CHANGE: Error text changed to red */
                          <p className="text-sm text-red-500 mt-1 ml-1">
                            {fieldState.error.message}
                          </p>
                        )}
                      </Field>
                    )}
                  />
                </FieldGroup>
              </form>
            </div>
          </div>
          
          {/* Footer with improved spacing */}
          <div className="w-full px-4 md:px-6 py-3 flex justify-center text-xs text-muted-foreground/80">
            <div className="flex flex-wrap items-center justify-center gap-x-1 gap-y-1">
              <span>© {new Date().getFullYear()} {OWNER_NAME}</span>
              <span>•</span>
              {/* COLOR CHANGE: Links hover to orange */}
              <Link href="/terms" className="underline hover:text-orange-500 transition-colors">
                Terms of Use
              </Link>
              <span>•</span>
              <span>Powered by</span>
              <Link 
                href="https://ringel.ai/" 
                className="underline hover:text-orange-500 transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                Ringel.AI
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
