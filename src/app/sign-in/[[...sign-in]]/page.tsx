import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
          },
          variables: {
            colorPrimary: "#f97316",
            colorBackground: "#18181b",
            colorInputBackground: "#27272a",
            colorInputText: "#f4f4f5",
          },
        }}
      />
    </div>
  );
}
