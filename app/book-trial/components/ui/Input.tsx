"use client";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export default function Input({ label, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col space-y-1 w-full">
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}

      <input
        {...props}
        className={`
          w-full px-4 py-3 rounded-xl border border-gray-300 
          focus:outline-none focus:ring-2 focus:ring-dance-purple 
          transition-all text-gray-800
          ${className || ""}
        `}
      />
    </div>
  );
}
