import type { Metadata } from "next";
import Link from "next/link";

import { SignUpForm } from "@/features/auth/signup-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ROUTES } from "@/lib/constants/routes";

export const metadata: Metadata = {
  title: "Create account",
};

export default function SignUpPage() {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">Create your account</CardTitle>
        <CardDescription>
          Register to access the dashboard, properties and bookings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SignUpForm />
      </CardContent>
      <CardFooter className="flex flex-col gap-2 text-center text-sm text-muted-foreground">
        <p>
          Already have an account?{" "}
          <Link
            href={ROUTES.auth.signIn}
            className="text-foreground underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
        <p>
          <Link
            href={ROUTES.public.home}
            className="text-foreground underline-offset-4 hover:underline"
          >
            Back to home
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
