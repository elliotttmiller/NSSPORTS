"use client";

import * as React from "react";
import { Check } from "@phosphor-icons/react";

export interface CheckboxProps {
  id?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function Checkbox({
  id,
  checked = false,
  onCheckedChange,
  disabled = false,
  className = "",
}: CheckboxProps) {
  return (
    <button
      id={id}
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={`
        h-4 w-4 rounded border border-border
        flex items-center justify-center
        transition-colors
        ${checked ? "bg-accent border-accent" : "bg-background"}
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-accent/50"}
        ${className}
      `}
    >
      {checked && <Check size={12} weight="bold" className="text-accent-foreground" />}
    </button>
  );
}
