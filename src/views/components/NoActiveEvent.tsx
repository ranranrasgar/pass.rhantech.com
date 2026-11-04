import Link from "next/link";
import { Card, CardContent } from "@/views/components/ui/card";

export function NoActiveEvent({ title }: { title: string }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Belum ada event. Buat event di menu{" "}
          <Link href="/events" className="font-medium text-foreground underline">
            Event
          </Link>{" "}
          lalu pilih di bagian atas.
        </CardContent>
      </Card>
    </div>
  );
}
