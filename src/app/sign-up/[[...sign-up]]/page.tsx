import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
      <SignUp
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
