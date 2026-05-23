import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface PlaceholderSectionProps {
  title: string;
  description: string;
}

/** Раздел-заглушка портала: функциональность появится в следующих этапах. */
export function PlaceholderSection({
  title,
  description,
}: PlaceholderSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          {description}
        </div>
      </CardContent>
    </Card>
  );
}
