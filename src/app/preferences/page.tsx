import type { Metadata } from "next";
import { PreferencesForm } from "@/components/PreferencesForm";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Preferences" };

export default function PreferencesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 sm:px-6">
      <PageHeader
        eyebrow="Make it yours"
        title="Baking preferences"
        subtitle="We'll pre-fill new searches with these. You can always override them per recipe."
      />
      <PreferencesForm />
    </div>
  );
}
