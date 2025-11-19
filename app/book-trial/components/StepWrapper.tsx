"use client";

import { ReactNode } from "react";
import clsx from "clsx";

interface StepWrapperProps {
  children: ReactNode;
  className?: string;
}

export default function StepWrapper({ children, className }: StepWrapperProps) {
  return (
    <div
      className={clsx(
        "animate-fade-slide min-h-[60vh] w-full",
        className
      )}
    >
      {children}
    </div>
  );
}
