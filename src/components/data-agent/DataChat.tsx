import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, User, Loader2, Palette, Mail, Phone, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { DatasetState } from "@/pages/DataAgent";

interface DataChatProps {
  dataset: DatasetState;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

const CHAT_COLORS = [
  { name: "Default", user: "bg-primary", assistant: "bg-muted/50" },
  { name: "Ocean", user: "bg-blue-600", assistant: "bg-blue-900/30" },
  { name: "Forest", user: "bg-green-600", assistant: "bg-green-900/30" },
  { name: "Sunset", user: "bg-orange-600", assistant: "bg-orange-900/30" },
  { name: "Purple", user: "bg-purple-600", assistant: "bg-purple-900/30" },
  { name: "Rose", user: "bg-pink-600", assistant: "bg-pink-900/30" },
];

const DataChat = ({ dataset }: DataChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedColor, setSelectedColor] = useState(CHAT_COLORS[0]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Detect and handle contact information
  const detectAndHandleContact = (text: string) => {
    const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    const whatsappRegex = /(?:whatsapp|wa)[:\s]*(\+?\d{10,15})/gi;

    const emails = text.match(emailRegex);
    const phones = text.match(phoneRegex);
    const whatsappMatch = whatsappRegex.exec(text);

    if (emails && emails.length > 0) {
      const email = emails[0];
      window.open(`mailto:${email}`, '_blank');
      toast.success(`Opening email to: ${email}`);
    }

    if (whatsappMatch || (phones && phones.length > 0)) {
      const number = whatsappMatch ? whatsappMatch[1] : phones![0].replace(/\D/g, '');
      const cleanNumber = number.startsWith('+') ? number.slice(1) : number;
      window.open(`https://wa.me/${cleanNumber}`, '_blank');
      toast.success(`Opening WhatsApp for: ${number}`);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    // Check for contact info in user input
    detectAndHandleContact(input);

    const userMessage: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const dataToChat = dataset.cleanedData || dataset.rawData;
      const { data, error } = await supabase.functions.invoke('data-agent', {
        body: { 
          action: 'chat', 
          data: dataToChat.slice(0, 200),
          datasetName: dataset.name,
          question: input,
          conversationHistory: messages.slice(-10)
        }
      });

      if (error) throw error;

      const assistantMessage: Message = { 
        role: "assistant", 
        content: data.response 
      };
      setMessages(prev => [...prev, assistantMessage]);
      
      // Check for contact info in AI response
      detectAndHandleContact(data.response);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to get response");
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const suggestedQuestions = [
    "What are the key trends in this data?",
    "Are there any anomalies or outliers?",
    "Summarize the main findings",
    "What correlations exist between columns?"
  ];

  return (
    <div className="flex flex-col h-[600px] bg-card/50 rounded-xl border border-border/50 overflow-hidden">
      {/* Header with Color Picker */}
      <div className="flex items-center justify-between p-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <span className="font-medium text-sm">Data Chat</span>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <Palette className="w-4 h-4" />
              <span className="hidden sm:inline">Theme</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2">
            <p className="text-xs text-muted-foreground mb-2">Chat Colors</p>
            <div className="space-y-1">
              {CHAT_COLORS.map((color) => (
                <button
                  key={color.name}
                  onClick={() => setSelectedColor(color)}
                  className={`w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors ${
                    selectedColor.name === color.name ? 'bg-muted' : ''
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full ${color.user}`} />
                  <span className="text-sm">{color.name}</span>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-cyan-400 flex items-center justify-center">
              <Bot className="w-8 h-8 text-primary-foreground" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Chat with your data</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Ask questions about your dataset. Include email or WhatsApp numbers for quick contact.
              </p>
            </div>
            
            {/* Contact Tips */}
            <div className="flex gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Mail className="w-3 h-3" />
                <span>Email detected</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="w-3 h-3" />
                <span>WhatsApp auto-open</span>
              </div>
            </div>

            {/* Suggested Questions */}
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setInput(q)}
                  className="px-3 py-1.5 text-sm bg-muted/50 hover:bg-muted rounded-full border border-border/50 hover:border-primary/50 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, i) => (
              <div
                key={i}
                className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" && (
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] p-3 rounded-xl ${
                    message.role === "user"
                      ? `${selectedColor.user} text-white`
                      : `${selectedColor.assistant} text-foreground`
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
                {message.role === "user" && (
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-secondary-foreground" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className={`${selectedColor.assistant} p-3 rounded-xl`}>
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-border/50">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your data or enter contact info..."
            disabled={isLoading}
            className="flex-1 bg-background/50 border-border/50 focus:border-primary"
          />
          <Button 
            type="submit" 
            disabled={!input.trim() || isLoading}
            className="bg-gradient-to-r from-primary to-cyan-400 hover:opacity-90"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default DataChat;
