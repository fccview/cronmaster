"use client";

import { AsteriskIcon, TerminalIcon } from "@phosphor-icons/react";

interface LogoProps {
    size?: number;
    showGlow?: boolean;
}

export const Logo = ({ size = 48, showGlow = false }: LogoProps) => {
    const iconSize = size * 0.8;
    const asteriskSize = size * 0.4;
    const asteriskOffset = size * 0.08;

    return (
        <div
            className="relative flex items-center justify-center flex-shrink-0"
            style={{ width: size, height: size }}
        >
            {showGlow && (
                <div
                    className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent blur-xl"
                    style={{ width: size, height: size }}
                />
            )}

            <div className="relative z-10 flex items-center justify-center w-full h-full">
                <TerminalIcon
                    className="text-primary drop-shadow-[0_0_10px_rgba(var(--primary-rgb),0.4)]"
                    weight="duotone"
                    style={{ width: iconSize, height: iconSize }}
                />
                <AsteriskIcon
                    className="text-primary absolute drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.6)]"
                    weight="bold"
                    style={{
                        width: asteriskSize,
                        height: asteriskSize,
                        top: -asteriskOffset,
                        right: -asteriskOffset
                    }}
                />
            </div>
        </div>
    );
};
