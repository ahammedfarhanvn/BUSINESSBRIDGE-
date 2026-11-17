import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h2 className="text-3xl font-bold tracking-tight text-foreground">
        404 - Page Not Found
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        The requested resource could not be found.
      </p>
      <Button asChild className="mt-6">
        <Link href="/" className="inline-flex items-center gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          <span>Return Home</span>
        </Link>
      </Button>
    </div>
  );
}
