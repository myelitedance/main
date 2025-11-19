"use client";

import * as RadixCheckbox from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";

interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  label?: string;
}

export default function Checkbox({ checked, onCheckedChange, label }: CheckboxProps) {
  return (
    <div className="flex items-start space-x-3">
      <RadixCheckbox.Root
        checked={checked}
        onCheckedChange={(val) => onCheckedChange(!!val)}
        className="
          h-5 w-5 rounded-md border border-gray-300 
          flex items-center justify-center 
          data-[state=checked]:bg-dance-purple 
          data-[state=checked]:border-dance-purple
          transition-colors
        "
      >
        <RadixCheckbox.Indicator>
          <Check className="h-4 w-4 text-white" />
        </RadixCheckbox.Indicator>
      </RadixCheckbox.Root>

      {label && (
        <label className="text-sm text-gray-700 leading-5 select-none cursor-pointer">
          {label}
        </label>
      )}
    </div>
  );
}
