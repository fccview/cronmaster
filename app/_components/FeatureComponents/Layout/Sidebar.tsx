import { cn } from "@/app/_utils/global-utils";
import { HTMLAttributes, forwardRef, useState, useEffect } from "react";
import React from "react";
import {
  CaretLeftIcon,
  CaretRightIcon,
  HardDrivesIcon,
  ListIcon,
  XIcon,
  CpuIcon,
  HardDriveIcon,
  WifiHighIcon,
} from "@phosphor-icons/react";
import { useTranslations } from "next-intl";

export interface SidebarProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  defaultCollapsed?: boolean;
  quickStats?: {
    cpu: number;
    memory: number;
    network: string;
  };
}

export const Sidebar = forwardRef<HTMLDivElement, SidebarProps>(
  (
    {
      className,
      children,
      defaultCollapsed = false,
      quickStats,
      ...props
    },
    ref
  ) => {
    const t = useTranslations();
    const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    useEffect(() => {
      if (isCollapsed) {
        document.body.classList.add("sidebar-collapsed");
      } else {
        document.body.classList.remove("sidebar-collapsed");
      }

      return () => {
        document.body.classList.remove("sidebar-collapsed");
      };
    }, [isCollapsed]);

    return (
      <>
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="fixed bottom-4 right-4 z-50 lg:hidden p-2 bg-background0 ascii-border transition-colors terminal-font"
        >
          {isMobileOpen ? (
            <XIcon className="h-5 w-5" />
          ) : (
            <ListIcon className="h-5 w-5" />
          )}
        </button>

        <div
          className={cn(
            "fixed inset-0 bg-background0 z-20 lg:hidden transition-opacity duration-300",
            isMobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          onClick={() => setIsMobileOpen(false)}
        />

        <div
          ref={ref}
          className={cn(
            "bg-background0 ascii-border transition-all duration-300 ease-in-out terminal-font",
            isMobileOpen
              ? "fixed left-0 top-0 h-full w-80 z-30 translate-x-0"
              : "fixed left-0 top-0 h-full w-80 z-30 -translate-x-full lg:translate-x-0",
            "lg:fixed lg:left-0 lg:pt-[90px] lg:bottom-0 lg:z-10",
            isCollapsed ? "lg:w-16" : "lg:w-80",
            className
          )}
          data-collapsed={isCollapsed}
          style={
            {
              "--sidebar-width": isCollapsed ? "64px" : "320px",
            } as React.CSSProperties
          }
          {...props}
        >
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3 top-[21.5vh] w-6 h-6 bg-background0 ascii-border items-center justify-center transition-colors z-40 hidden lg:flex"
          >
            {isCollapsed ? (
              <CaretRightIcon className="h-3 w-3" />
            ) : (
              <CaretLeftIcon className="h-3 w-3" />
            )}
          </button>

          <div
            className={cn(
              "overflow-y-auto tui-scrollbar",
              isCollapsed ? "lg:p-2" : "p-4",
              "h-full lg:h-[calc(100vh-88px)]"
            )}
          >
            {isCollapsed ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center space-y-4">
                  {quickStats ? (
                    <>
                      <div className="w-12 h-12 bg-background0 ascii-border flex flex-col items-center justify-center p-1">
                        <CpuIcon className="h-3 w-3 mb-1" />
                        <span className="text-xs font-bold text-foreground">
                          {quickStats.cpu}%
                        </span>
                      </div>

                      <div className="w-12 h-12 bg-background0 ascii-border flex flex-col items-center justify-center p-1">
                        <HardDriveIcon className="h-3 w-3 mb-1" />
                        <span className="text-xs font-bold text-foreground">
                          {quickStats.memory}%
                        </span>
                      </div>

                      <div className="w-12 h-12 bg-background0 ascii-border flex flex-col items-center justify-center p-1">
                        <WifiHighIcon className="h-3 w-3 mb-1" />
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-bold text-foreground leading-none">
                            {quickStats.network}
                          </span>
                          <span className="text-[10px] text-muted-foreground leading-none">
                            ms
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    React.Children.map(children, (child, index) => {
                      if (React.isValidElement(child) && child.type === "div") {
                        return (
                          <div
                            key={index}
                            className="w-8 h-8 bg-background2 ascii-border flex items-center justify-center"
                          >
                            <HardDrivesIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                        );
                      }
                      return null;
                    })
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">{children}</div>
            )}
          </div>
        </div>
      </>
    );
  }
);

Sidebar.displayName = "Sidebar";
