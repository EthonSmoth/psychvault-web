"use client";

import { FormEvent, useState } from"react";
import { useRouter } from"next/navigation";

export function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get("name") ||""),
      email: String(formData.get("email") ||""),
      password: String(formData.get("password") ||"")
    };

    const response = await fetch("/api/register", {
      method:"POST",
      headers: {"Content-Type":"application/json" },
      body: JSON.stringify(payload)
    });

    setLoading(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ||"Could not create account.");
      return;
    }

    router.push("/login");
  }

  return (
    <form onSubmit={handleSubmit} className="stack">
      <div className="field">
        <label htmlFor="name">Name</label>
        <input id="name" name="name" required />
      </div>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required minLength={8} />
      </div>
      {error ? <p style={{ color:"crimson", margin: 0 }}>{error}</p> : null}
      <button className="btn btn-primary" disabled={loading}>{loading ?"Creating account..." :"Create account"}</button>
    </form>
  );
}
