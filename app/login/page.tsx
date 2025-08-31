'use server';

import { LoginForm } from "../_components/features/LoginForm/LoginForm";

export default async function LoginPage() {
    return (
        <div className="min-h-screen relative">
            <div className="hero-gradient absolute inset-0 -z-10"></div>
            <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
                <LoginForm />
            </div>
        </div>
    );
}
