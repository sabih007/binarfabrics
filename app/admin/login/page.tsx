import type { Metadata } from "next";
import { Suspense } from "react";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="adm-login">
      <div className="adm-login__card">
        <h1>BinAr Admin</h1>
        <p className="sub">Sign in to manage products, orders and messages.</p>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
