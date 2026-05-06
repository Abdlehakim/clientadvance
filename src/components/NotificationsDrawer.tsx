import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getNotifications, formatDateTimeFR } from "@/lib/data";
import { Mail, MessageCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export function NotificationsDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const items = getNotifications();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[440px] sm:max-w-[440px]">
        <SheetHeader>
          <SheetTitle>File de notifications</SheetTitle>
        </SheetHeader>
        <ScrollArea className="mt-4 h-[calc(100vh-100px)] pr-3">
          {items.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Aucune notification simulée pour le moment.</div>
          ) : (
            <div className="space-y-3">
              {items.map((n) => {
                const dt = formatDateTimeFR(n.created_at);
                return (
                  <div key={n.id} className="rounded-lg border bg-card p-3 shadow-card">
                    <div className="mb-1 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-medium">
                        {n.type === "email" ? <Mail className="h-3.5 w-3.5 text-info" /> : <MessageCircle className="h-3.5 w-3.5 text-success" />}
                        <span className="uppercase tracking-wide">{n.type}</span>
                        <span className="text-muted-foreground">→ {n.recipient}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{dt.date} {dt.time}</span>
                    </div>
                    <div className="mb-1 text-sm font-medium">{n.subject}</div>
                    <pre className="whitespace-pre-wrap font-sans text-xs text-muted-foreground">{n.body}</pre>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
