"use client";

import { useId } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface FloatingInputProps {
  id?: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoFocus?: boolean;
  autoComplete?: string;
  showToggle?: boolean;
  toggled?: boolean;
  onToggle?: () => void;
}

export function FloatingInput({
  id: idProp,
  label,
  type = "text",
  value,
  onChange,
  error,
  autoFocus,
  autoComplete,
  showToggle,
  toggled,
  onToggle,
}: FloatingInputProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const hasValue = value.length > 0;

  return (
    <div>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          className={cn(
            "peer w-full px-3 pt-5 pb-2 bg-titan-bg border rounded-lg text-sm text-zinc-100",
            "focus:outline-none focus:border-titan-accent focus:ring-1 focus:ring-titan-accent/30 transition-colors",
            error ? "border-titan-loss" : "border-titan-border",
            showToggle && "pr-10"
          )}
          placeholder=" "
        />
        <label
          htmlFor={id}
          className={cn(
            "absolute left-3 transition-all pointer-events-none text-titan-muted",
            hasValue ? "top-1.5 text-[10px]" : "top-3 text-sm peer-focus:top-1.5 peer-focus:text-[10px]"
          )}
        >
          {label}
        </label>
        {showToggle && (
          <button
            type="button"
            onClick={onToggle}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-titan-muted hover:text-zinc-300"
            aria-label={toggled ? "Wachtwoord verbergen" : "Wachtwoord tonen"}
          >
            {toggled ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-titan-loss">{error}</p>}
    </div>
  );
}
