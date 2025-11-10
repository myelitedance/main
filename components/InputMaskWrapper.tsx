'use client';

import React from "react";
import InputMask from "react-input-mask";
import { Input } from "@/components/ui/input";

export interface InputMaskWrapperProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  mask: string;
  maskChar?: string;
}

/**
 * Wrapper for react-input-mask that preserves Shadcn Input styling
 * and works with Next.js + TypeScript safely.
 */
export default function InputMaskWrapper({
  mask,
  maskChar = "",
  value,
  onChange,
  ...props
}: InputMaskWrapperProps) {
  return (
    <InputMask
      mask={mask}
      maskChar={maskChar}
      value={value ?? ""}
      onChange={onChange as any} // TS-safe cast for generic change handler
    >
      {(inputProps: any) => (
        <Input
          {...inputProps}
          {...props}
          value={value ?? ""}
          onChange={onChange}
        />
      )}
    </InputMask>
  );
}
