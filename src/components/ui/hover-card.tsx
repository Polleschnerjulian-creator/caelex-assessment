"use client";

/**
 * Sprint UF1 — shadcn-style HoverCard wrapper around Radix
 * @radix-ui/react-hover-card. Caelex's existing UI primitives use the
 * same pattern (see button / dialog wrappers) — keeps the import
 * surface consistent (`@/components/ui/hover-card`) regardless of
 * what's underneath.
 */

import * as React from "react";
import * as HoverCardPrimitive from "@radix-ui/react-hover-card";

const HoverCard = HoverCardPrimitive.Root;
const HoverCardTrigger = HoverCardPrimitive.Trigger;

const HoverCardContent = React.forwardRef<
  React.ElementRef<typeof HoverCardPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <HoverCardPrimitive.Content
    ref={ref}
    align={align}
    sideOffset={sideOffset}
    className={className}
    {...props}
  />
));
HoverCardContent.displayName = HoverCardPrimitive.Content.displayName;

export { HoverCard, HoverCardTrigger, HoverCardContent };
