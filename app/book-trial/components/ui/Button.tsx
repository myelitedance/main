"use client";

import clsx from "clsx";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  children: React.ReactNode;
}

export default function Button({
  variant = "primary",
  children,
  className,
  ...props
}: ButtonProps) {
  const baseStyles =
    "px-4 py-3 rounded-xl font-semibold transition-all text-center inline-flex items-center justify-center w-full";

  const variants = {
    primary:
      "bg-dance-purple text-white hover:bg-dance-pink disabled:bg-gray-300 disabled:text-gray-500",
    secondary:
      "bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:bg-gray-200 disabled:text-gray-400",
  };

  return (
    <button
      {...props}
      className={clsx(baseStyles, variants[variant], className)}
    >
      {children}
    </button>
  );
}
