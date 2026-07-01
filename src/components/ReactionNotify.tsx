"use client";

import { useEffect, useRef } from "react";
import { useMyPin } from "@/lib/hooks";
import { fireReaction } from "@/lib/notify";

// Watches YOUR pin for incoming love and fires a browser notification when a
// count climbs. Rendered at the page root (not inside the collapsible mobile
// sheet) so it stays mounted the whole time you're down — otherwise a closed
// sheet would silence the pings. The actual notification only shows in a
// backgrounded tab (fireReaction gates on focus); a focused tab already gets the
// on-screen celebration via SessionPanel.
export function ReactionNotify({ myPinId }: { myPinId: string | null }) {
  const { data: pin } = useMyPin(myPinId);
  const prev = useRef<{ good4u: number; sympathy: number; handshake: number } | null>(null);

  useEffect(() => {
    if (!pin) return;
    const p = prev.current;
    // Don't ping on resurrection's auto Good4U — that moment has its own ping.
    if (p && !pin.resurrected) {
      if (pin.sympathy > p.sympathy) fireReaction("sympathy");
      if (pin.good4u > p.good4u) fireReaction("good4u");
      if (pin.handshake > p.handshake) fireReaction("handshake");
    }
    prev.current = { good4u: pin.good4u, sympathy: pin.sympathy, handshake: pin.handshake };
  }, [pin]);

  return null;
}
