import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-6">
      <div className="panel relative w-full max-w-md overflow-hidden p-2">
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-indigo-200/70 blur-3xl" />
      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
          },
          variables: {
            colorPrimary: "#4f46e5",
            colorBackground: "#ffffff",
            colorInputBackground: "#ffffff",
            colorInputText: "#0f172a",
          },
        }}
      />
      </div>
    </div>
  );
}
