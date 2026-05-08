import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getAdminSettings, getNotifications, formatDateTimeFR } from "@/lib/data";
import { Mail, MessageCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

function statusLabel(status?: string) {
  if (status === "sent") {
    return "Envoyée";
  }

  if (status === "failed") {
    return "Échec";
  }

  return "En attente";
}

function statusClassName(status?: string) {
  if (status === "sent") {
    return "border-success/40 bg-success/10 text-[oklch(0.35_0.1_150)]";
  }

  if (status === "failed") {
    return "border-destructive/40 bg-destructive/10 text-destructive";
  }

  return "border-warning/40 bg-warning/15 text-warning-foreground";
}

export function NotificationsDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const settings = getAdminSettings();
  const isWithoutServerMode = settings.server_mode === "without-server";
  const items = getNotifications().filter(
    (notification) => !isWithoutServerMode || notification.type === "email",
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[440px] sm:max-w-[440px]">
        <SheetHeader>
          <SheetTitle>File de notifications</SheetTitle>
        </SheetHeader>
        <ScrollArea className="mt-4 h-[calc(100vh-100px)] pr-3">
          {items.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              Aucune notification pour le moment.
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((n) => {
                const dt = formatDateTimeFR(n.created_at);
                const isEmail = n.type === "email";

                return (
                  <div key={n.id} className="rounded-lg border bg-card p-3 shadow-card">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs font-medium">
                          {isEmail ? (
                            <Mail className="h-3.5 w-3.5 text-info" />
                          ) : (
                            <MessageCircle className="h-3.5 w-3.5 text-success" />
                          )}
                          <span className="uppercase tracking-wide">{n.type}</span>
                          <span className="truncate text-muted-foreground">-&gt; {n.recipient}</span>
                        </div>
                        <div className="mt-1 text-sm font-medium">{n.subject}</div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-[10px] text-muted-foreground">{dt.date} {dt.time}</div>
                        <div className={`mt-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusClassName(n.status)}`}>
                          {statusLabel(n.status)}
                        </div>
                      </div>
                    </div>
                    <pre className="whitespace-pre-wrap font-sans text-xs text-muted-foreground">{n.body}</pre>
                    {isEmail && n.status === "failed" && n.error_message ? (
                      <p className="mt-2 text-xs text-destructive">{n.error_message}</p>
                    ) : null}
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
