"use client";

import { AsteriskIcon, TerminalIcon } from "@phosphor-icons/react";

export default function Logo() {
  return (
    <div className="min-h-screen bg-background0 flex items-center justify-center p-8">
      <div className="relative">
        <div className="w-[600px] h-[600px] ascii-border bg-background1 p-16 flex items-center justify-center">
          <div className="absolute w-[600px] h-[600px] bg-gradient-to-br from-primary/20 via-primary/10 to-transparent blur-3xl" />

          <div className="relative z-10 flex items-center justify-center w-full h-full">
            <TerminalIcon
              className="h-80 w-80 text-primary drop-shadow-[0_0_40px_rgba(var(--primary-rgb),0.6)]"
              weight="duotone"
            />
            <AsteriskIcon
              className="h-40 w-40 text-primary absolute -top-4 -right-4 drop-shadow-[0_0_30px_rgba(var(--primary-rgb),0.8)]"
              weight="bold"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
