import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { Troubleshooting } from "@/components/Troubleshooting";

export const metadata: Metadata = {
  title: "Something went wrong? Cake troubleshooting",
  description: "Why cakes sink, crack, turn dry, dense or gummy — and how to fix ganache, buttercream and whipped cream problems.",
};

export default function TroubleshootingPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        eyebrow="Troubleshooting"
        title="Something went wrong?"
        subtitle="Find the likely cause, rescue what you can, and fix it for next time. Tap a problem to expand it."
      />
      <Troubleshooting />
    </div>
  );
}
