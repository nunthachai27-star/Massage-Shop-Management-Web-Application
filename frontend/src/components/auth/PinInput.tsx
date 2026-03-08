"use client";

import { useState } from "react";

export interface PinInputProps {
  length?: number;
  onComplete: (pin: string) => void;
  disabled?: boolean;
}

export function PinInput({ length = 4, onComplete, disabled }: PinInputProps) {
  const [pin, setPin] = useState("");

  const handleDigit = (digit: string) => {
    if (disabled || pin.length >= length) return;
    const newPin = pin + digit;
    setPin(newPin);
    if (newPin.length === length) {
      onComplete(newPin);
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPin("");
  };

  return (
    <div className="flex flex-col items-center gap-8">
      {/* PIN dots */}
      <div className="flex gap-3">
        {Array.from({ length }).map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
              i < pin.length
                ? "bg-accent-gold border-accent-gold scale-110"
                : "border-white/30"
            }`}
          />
        ))}
      </div>

      {/* Number pad */}
      <div className="grid grid-cols-3 gap-3 w-64">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
          <button
            key={digit}
            onClick={() => handleDigit(digit)}
            className="h-14 rounded-xl bg-surface-card border border-white/10 text-white text-xl font-medium hover:bg-primary-light hover:border-accent-gold/30 transition-all cursor-pointer active:scale-95"
          >
            {digit}
          </button>
        ))}
        <button
          onClick={handleClear}
          className="h-14 rounded-xl bg-surface-card border border-white/10 text-white/50 text-sm hover:bg-primary-light transition-all cursor-pointer"
        >
          Clear
        </button>
        <button
          onClick={() => handleDigit("0")}
          className="h-14 rounded-xl bg-surface-card border border-white/10 text-white text-xl font-medium hover:bg-primary-light hover:border-accent-gold/30 transition-all cursor-pointer active:scale-95"
        >
          0
        </button>
        <button
          onClick={handleBackspace}
          className="h-14 rounded-xl bg-surface-card border border-white/10 text-white/50 text-xl hover:bg-primary-light transition-all cursor-pointer"
        >
          &#x232B;
        </button>
      </div>
    </div>
  );
}
