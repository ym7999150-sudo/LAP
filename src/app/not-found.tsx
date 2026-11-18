import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-[70dvh] place-items-center px-4 text-center">
      <div>
        <p className="mono text-6xl font-bold text-accent">404</p>
        <p className="mt-3 text-muted">Page not found · الصفحة غير موجودة</p>
        <Link href="/dashboard" className="btn btn-primary mt-6">
          LabVerse
        </Link>
      </div>
    </div>
  );
}
