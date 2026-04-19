"use client";

import { FormEvent, useState } from"react";
import { signIn } from"next-auth/react";
import { useRouter } from"next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ||"");
    const password = String(formData.get("password") ||"");

    
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl:"/creator",
    });

    setLoading(false);

    if (!result || result.error || !result.ok) {
      setError("Invalid email or password.");
      return;
    }

    router.push(result.url ??"/creator");
    router.refresh();
  }
  return (
    <form onSubmit={handleSubmit} className="stack">
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required />
      </div>
      {error ? <p style={{ color:"crimson", margin: 0 }}>{error}</p> : null}
      <button className="btn btn-primary" disabled={loading}>{loading ?"Logging in..." :"Log in"}</button>
    </form>
  );
}
