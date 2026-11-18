import { Suspense } from "react";
import { LabPage } from "@/components/lab/LabPage";

export const metadata = { title: "Chemistry Lab" };

export default function Page() {
  return (
    <Suspense>
      <LabPage lab="chemistry" />
    </Suspense>
  );
}
