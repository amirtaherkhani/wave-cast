import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";

import { cn } from "@/lib/utils";

function Drawer({ ...props }: React.ComponentProps<typeof Dialog.Root>) {
  return <Dialog.Root data-slot="drawer" {...props} />;
}

function DrawerTrigger({ ...props }: React.ComponentProps<typeof Dialog.Trigger>) {
  return <Dialog.Trigger data-slot="drawer-trigger" {...props} />;
}

function DrawerPortal({ ...props }: React.ComponentProps<typeof Dialog.Portal>) {
  return <Dialog.Portal data-slot="drawer-portal" {...props} />;
}

function DrawerOverlay({ className, ...props }: React.ComponentProps<typeof Dialog.Overlay>) {
    return (
      <Dialog.Overlay
        data-slot="drawer-overlay"
        className={cn(
          "fixed inset-0 z-50 bg-transparent transition duration-300 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:duration-250 data-[state=closed]:ease-in-out data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:duration-250 data-[state=open]:ease-out",
          className,
        )}
        {...props}
      />
    );
  }

const DrawerContent = React.forwardRef<HTMLDivElement, React.ComponentProps<typeof Dialog.Content>>(
  ({ className, children, ...props }, ref) => (
    <Dialog.Portal>
      <DrawerOverlay />
      <Dialog.Content
        ref={ref}
        data-slot="drawer-content"
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 mx-auto flex w-full max-w-[430px] flex-col rounded-[24px] border border-border bg-card p-4 pb-5 text-foreground shadow-2xl outline-none transition duration-250 ease-in-out data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=closed]:fade-out-0 data-[state=closed]:duration-250 data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=open]:fade-in-0 data-[state=open]:duration-250 data-[state=open]:ease-out data-[state=closed]:motion-reduce:transition-none",
          className,
        )}
        {...props}
      >
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-muted" />
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  ),
);
DrawerContent.displayName = "DrawerContent";

function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-header"
      className={cn("mb-3 flex items-center justify-between", className)}
      {...props}
    />
  );
}

function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn("mt-3 flex items-center justify-end gap-2", className)}
      {...props}
    />
  );
}

function DrawerTitle({ className, ...props }: React.ComponentProps<typeof Dialog.Title>) {
  return (
    <Dialog.Title
      data-slot="drawer-title"
      className={cn("text-base font-extrabold text-foreground", className)}
      {...props}
    />
  );
}

function DrawerDescription({ className, ...props }: React.ComponentProps<typeof Dialog.Description>) {
  return (
    <Dialog.Description
      data-slot="drawer-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
};
