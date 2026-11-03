"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Mail, Lock } from "lucide-react"

import { TransitMark } from "@/components/brand"
import { IconInput, PasswordInput } from "@/components/form-fields"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

export default function Signup() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const controllerRef = useRef<AbortController | null>(null);

    useEffect(() => () => {
        controllerRef.current?.abort();
        setIsLoading(false);
    }, []);

    const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);

        const form = new FormData(e.currentTarget);
        const email = String(form.get("email") ?? "").trim();
        const password = String(form.get("password") ?? "");
        const confirm = String(form.get("confirm") ?? "");

        if (!email.toLowerCase().endsWith("@umass.edu")) {
            setError("UMass email only.");
            return;
        }
        if (password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }
        if (password !== confirm) {
            setError("Passwords do not match.");
            return;
        }

        const controller = new AbortController();
        controllerRef.current = controller;

        setIsLoading(true);

        try {
            const res = await fetch("/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json"},
                body: JSON.stringify({ email, password }),
                signal: controller.signal
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setError(data.error ?? "Something went wrong. Please try again.");
                setIsLoading(false);
                return;
            }
            router.push('/onboarding');
            router.refresh();
        } catch (err){
            if (err instanceof DOMException && err.name === "AbortError") return;
            setError("Network Error. Please try again.")
            setIsLoading(false);
        }
    }

    return (
        <main className='flex min-h-svh flex-col items-center justify-center bg-background px-6 py-10'>
            <div className='w-full max-w-sm'>
                <div className='mb-9 flex flex-col items-center gap-4'>
                    <TransitMark className='size-24' />
                    <div className='flex flex-col items-center gap-1'>
                        <h1 className='text-3xl font-bold tracking-tight'>Create account</h1>
                        <p className='text-sm text-muted-foreground'>Get started with UPath</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} noValidate className='flex flex-col gap-4'>
                    <div className='flex flex-col gap-2'>
                        <Label htmlFor='email' className='text-base font-semibold'>Email</Label>
                        <IconInput
                            id='email'
                            name='email'
                            type='email'
                            icon={Mail}
                            autoComplete='email'
                            inputMode='email'
                            placeholder='student@umass.edu'
                            aria-invalid={!!error}
                        />
                    </div>

                    <div className='flex flex-col gap-2'>
                        <Label htmlFor='password' className='text-base font-semibold'>Password</Label>
                        <PasswordInput
                            id='password'
                            name='password'
                            autoComplete='new-password'
                            placeholder='At least 8 characters'
                            aria-invalid={!!error}
                        />
                    </div>

                    <div className='flex flex-col gap-2'>
                        <Label htmlFor='confirm' className='text-base font-semibold'>Confirm password</Label>
                        <IconInput
                            id='confirm'
                            name='confirm'
                            type='password'
                            icon={Lock}
                            autoComplete='new-password'
                            placeholder='Re-enter password'
                            aria-invalid={!!error}
                        />
                    </div>

                    {error && (
                        <p role='alert' className='text-sm font-semibold text-destructive'>
                            {error}
                        </p>
                    )}

                    <Button
                        type='submit'
                        disabled={isLoading}
                        className='mt-2 h-12 w-full rounded-xl bg-primary text-lg font-semibold text-primary-foreground hover:bg-primary/90'>
                        {isLoading ? "Creating account…" : "Sign up"}
                    </Button>

                    <p className='text-center text-sm text-muted-foreground'>UMass email only.</p>

                    <p className='text-center text-sm text-muted-foreground'>
                        Already have an account?{" "}
                        <Link href='/auth/login' className='font-semibold text-primary hover:underline'>
                            Log in
                        </Link>
                    </p>
                </form>
            </div>
        </main>
    );
}
