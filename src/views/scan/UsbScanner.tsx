"use client";

import { useEffect, useRef } from "react";

type Props = { disabled: boolean; onScan: (text: string) => void };

/** Scanner USB = keyboard: isi masuk ke input yang selalu fokus, kirim saat Enter. */
export function UsbScanner({ disabled, onScan }: Props) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const focus = () => ref.current?.focus();
    focus();
    const id = setInterval(() => {
      // Kembalikan fokus bila petugas tidak sedang mengetik di elemen lain.
      if (document.activeElement === document.body) focus();
    }, 500);
    return () => clearInterval(id);
  }, []);

  return (
    <label className="block rounded-2xl bg-neutral-900 p-5 text-white">
      <span className="mb-2 block text-lg font-semibold">Scanner USB siap — scan gelang sekarang</span>
      <input
        ref={ref}
        autoFocus
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        aria-label="Hasil scanner USB"
        className="w-full rounded-lg border-2 border-neutral-600 bg-black px-4 py-3 font-mono text-lg tracking-wider text-white outline-none focus:border-white"
        placeholder="Menunggu scan…"
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          const value = e.currentTarget.value;
          e.currentTarget.value = "";
          if (value.trim()) onScan(value);
        }}
      />
    </label>
  );
}
