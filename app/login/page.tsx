export const dynamic = "force-dynamic";

import { LoginForm } from "@/app/_components/FeatureComponents/LoginForm/LoginForm";

export default async function LoginPage() {
    const hasPassword = !!process.env.AUTH_PASSWORD;
    const hasOIDC = process.env.SSO_MODE === "oidc";

    return (
        <div className="min-h-screen relative">
            <div className="hero-gradient absolute inset-0 -z-10"></div>
            <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
                <LoginForm hasPassword={hasPassword} hasOIDC={hasOIDC} />
            </div>
        </div>
    );
}
