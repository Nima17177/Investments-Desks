"use client";

import { Button } from "@/components/ui/button";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col justify-center px-6 py-24">
      <p className="text-[11px] font-medium tracking-[0.22em] text-mark uppercase">
        Morning tape
      </p>
      <h1 className="mt-3 font-serif text-5xl italic">The desk hit a snag.</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        Something on the page failed. The list on this browser is still saved.
      </p>
      <Button className="mt-6 w-fit" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}
