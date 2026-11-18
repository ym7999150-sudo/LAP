import { Suspense } from "react";
import { LabPage } from "@/components/lab/LabPage";

export const metadata = { title: "Physics Lab" };

export default function Page() {
  return (
    <Suspense>
      <LabPage lab="physics" />
    </Suspense>
  );
}
