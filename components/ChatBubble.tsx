import type { Message } from "@/types"

interface ChatBubbleProps {
  message: Message
}

export default function ChatBubble({ message }: ChatBubbleProps) {
  return (
    <div className="flex justify-end mb-2">
      <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-2.5 text-sm">
        {message.contentType === "text" && (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        )}
        {message.contentType === "image" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`data:image/jpeg;base64,${message.content}`}
            alt="Imagem enviada"
            className="max-h-40 rounded-lg object-cover"
          />
        )}
        {message.contentType === "audio" && (
          <p className="italic opacity-80">🎤 Áudio enviado</p>
        )}
      </div>
    </div>
  )
}
