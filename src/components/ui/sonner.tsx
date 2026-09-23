"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

export function Toaster({ ...props }: ToasterProps) {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-card-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-md group-[.toaster]:text-sm",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-md font-medium",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-md",
          success:
            "group-[.toaster]:border-success/30 group-[.toaster]:bg-success/10",
          error:
            "group-[.toaster]:border-destructive/30 group-[.toaster]:bg-destructive/10",
          warning:
            "group-[.toaster]:border-warning/30 group-[.toaster]:bg-warning/10",
          info: "group-[.toaster]:border-info/30 group-[.toaster]:bg-info/10",
        },
      }}
      {...props}
    />
  );
}

export { toast };
