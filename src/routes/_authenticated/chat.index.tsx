import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";

export const Route = createFileRoute("/_authenticated/chat/")({
  component: ChatEmpty,
});

function ChatEmpty() {
  return (
    <div className="h-full grid place-items-center p-8 text-center">
      <div className="max-w-md space-y-3">
        <MessageSquare className="size-12 text-primary mx-auto" />
        <h2 className="text-xl font-bold">Start a new chat</h2>
        <p className="text-muted-foreground text-sm">
          Click "New chat" on the left to ask questions across your document library. Every answer cites the source.
        </p>
      </div>
    </div>
  );
}