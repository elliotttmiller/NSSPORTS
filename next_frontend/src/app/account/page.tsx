import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AccountPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 md:px-8 lg:px-12 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-bold">Account</h1>
            <Button asChild variant="outline" size="sm">
              <Link href="/">Back to Home</Link>
            </Button>
          </div>
          
          <div className="bg-card/50 border border-border rounded-lg p-6">
            <p className="text-muted-foreground">
              Account page - Component migration in progress
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
