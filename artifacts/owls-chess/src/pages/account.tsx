import { useState } from "react";
import { useAccount } from "../components/accounts";
import { displayNameSchema } from "../lib/accounts";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";

export function AccountPage() {
  const account = useAccount();
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const redirectTo = new URL(import.meta.env.BASE_URL, window.location.origin)
    .href;
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setMessage("");
    try {
      await action();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setPassword("");
      setBusy(false);
    }
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    void run(async () => {
      const client = account.client;
      if (!client)
        throw new Error("Student accounts are not available on this site yet.");
      if (account.recovery) {
        if (password.length < 12)
          throw new Error("Use a password with at least 12 characters.");
        const { error } = await client.auth.updateUser({ password });
        if (error)
          throw new Error(
            "Your password could not be updated. Please request a new reset link.",
          );
        account.finishRecovery();
        setMessage("Your password has been updated.");
      } else if (mode === "reset") {
        const { error } = await client.auth.resetPasswordForEmail(
          email.trim(),
          { redirectTo },
        );
        if (error)
          throw new Error(
            "The reset request could not be completed. Please try again later.",
          );
        setMessage(
          "If that email has an account, a reset link will arrive shortly.",
        );
      } else if (mode === "signup") {
        const parsedName = displayNameSchema.safeParse(name);
        if (!parsedName.success)
          throw new Error("Choose a display name between 2 and 40 characters.");
        if (password.length < 12)
          throw new Error("Use a password with at least 12 characters.");
        const { error } = await client.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: redirectTo,
            data: { display_name: parsedName.data },
          },
        });
        if (error)
          throw new Error(
            "The account could not be created. Check your details or ask your teacher.",
          );
        setMessage("Check your email to confirm your account, then sign in.");
      } else {
        const { error } = await client.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error)
          throw new Error(
            "Unable to sign in. Check your email and password, then try again.",
          );
      }
    });
  };
  return (
    <main className="min-h-screen bg-background text-foreground flex items-start justify-center p-6 pt-16">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-serif">
            Falcons Chess Club
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {account.loading ? (
            <p role="status">Loading your account…</p>
          ) : !account.client ? (
            <p>
              Student accounts are not available on this site yet. Your teacher
              can help you get started.
            </p>
          ) : !account.session || account.recovery ? (
            <form onSubmit={submit} className="space-y-4">
              <h1 className="text-lg font-semibold">
                {account.recovery
                  ? "Choose a new password"
                  : mode === "signup"
                    ? "Create your account"
                    : mode === "reset"
                      ? "Reset your password"
                      : "Welcome back"}
              </h1>
              {mode === "signup" && !account.recovery && (
                <div className="space-y-2">
                  <Label htmlFor="nickname">Display name</Label>
                  <Input
                    id="nickname"
                    autoComplete="nickname"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    minLength={2}
                    maxLength={40}
                  />
                  <p className="text-sm text-muted-foreground">
                    Use a nickname or first name and last initial.
                  </p>
                </div>
              )}
              {!account.recovery && (
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              )}
              {(account.recovery || mode !== "reset") && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete={
                      account.recovery || mode === "signup"
                        ? "new-password"
                        : "current-password"
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={account.recovery || mode === "signup" ? 12 : 1}
                    maxLength={128}
                  />
                </div>
              )}
              <Button type="submit" disabled={busy} className="w-full">
                {busy
                  ? "Please wait…"
                  : account.recovery
                    ? "Save password"
                    : mode === "signup"
                      ? "Create account"
                      : mode === "reset"
                        ? "Send reset link"
                        : "Sign in"}
              </Button>
              {!account.recovery && (
                <div className="flex flex-wrap gap-2">
                  {(["signin", "signup", "reset"] as const)
                    .filter((item) => item !== mode)
                    .map((item) => (
                      <Button
                        key={item}
                        type="button"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => {
                          setMode(item);
                          setMessage("");
                          setPassword("");
                        }}
                      >
                        {item === "signin"
                          ? "Sign in"
                          : item === "signup"
                            ? "Create an account"
                            : "Forgot password?"}
                      </Button>
                    ))}
                </div>
              )}
            </form>
          ) : (
            <>
              <h1 className="text-xl font-semibold">
                {account.profile
                  ? `Welcome, ${account.profile.display_name}`
                  : "Your account"}
              </h1>
              {account.profile && (
                <form
                  className="space-y-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void run(async () => {
                      const nickname = displayNameSchema.safeParse(name);
                      if (!nickname.success)
                        throw new Error(
                          "Choose a display name between 2 and 40 characters.",
                        );
                      const { error } = await account
                        .client!.from("chess_profiles")
                        .update({ display_name: nickname.data })
                        .eq("user_id", account.session!.user.id);
                      if (error)
                        throw new Error(
                          "Your display name could not be saved.",
                        );
                      account.reload();
                      setMessage("Display name saved.");
                    });
                  }}
                >
                  <Label htmlFor="display-name">Change display name</Label>
                  <Input
                    id="display-name"
                    placeholder={account.profile.display_name}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    minLength={2}
                    maxLength={40}
                    required
                  />
                  <Button type="submit" variant="outline" disabled={busy}>
                    Save display name
                  </Button>
                </form>
              )}
              <section>
                <h2 className="font-semibold mb-2">Your clubs</h2>
                {account.memberships.length ? (
                  <ul className="space-y-2">
                    {account.memberships.map((m) => (
                      <li key={m.club_id}>
                        {m.chess_clubs.name}{" "}
                        <span className="text-muted-foreground">
                          · {m.role}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : account.profile ? (
                  <p className="text-muted-foreground">
                    Your account is ready. Ask your teacher to add you to the
                    club.
                  </p>
                ) : null}
              </section>
              {account.error && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={account.reload}
                >
                  Try loading again
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    const { error } = await account.client!.auth.signOut({
                      scope: "local",
                    });
                    if (error)
                      throw new Error(
                        "Sign out could not finish. Please try again.",
                      );
                    setName("");
                    setEmail("");
                  })
                }
              >
                Sign out
              </Button>
            </>
          )}
          {(message || account.error) && (
            <p role="status" className="text-sm">
              {message || account.error}
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
