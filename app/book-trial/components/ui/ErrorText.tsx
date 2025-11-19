"use client";

interface ErrorTextProps {
  children: React.ReactNode;
}

export default function ErrorText({ children }: ErrorTextProps) {
  return (
    <p className="text-sm text-red-600 font-medium mt-2">
      {children}
    </p>
  );
}
