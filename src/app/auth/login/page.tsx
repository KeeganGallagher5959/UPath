"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Mail } from "lucide-react"

import { TransitMark } from "@/components/brand"
import { IconInput, PasswordInput } from "@/components/form-fields"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

export default function Login() {
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

        if (!email.toLowerCase().endsWith("@umass.edu") || password.length === 0) {
            setError("Incorrect email or password");
            return;
        }

        const controller = new AbortController();
        controllerRef.current = controller;

        setIsLoading(true);

        await new Promise((resolve) => { setTimeout(resolve, 1000) });

        if (controller.signal.aborted) {
            return;
        }

        router.push('/home');
    }

    return (
        <main className='flex min-h-svh flex-col items-center justify-center bg-background px-6 py-10'>
            <div className='w-full max-w-sm'>
                <div className='mb-9 flex flex-col items-center gap-4'>
                    <TransitMark className='size-24' />
                    <h1 className='text-3xl font-bold tracking-tight'>UPath</h1>
                </div>

                <form onSubmit={handleSubmit} noValidate className='flex flex-col gap-5'>
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
                            autoComplete='current-password'
                            placeholder='••••••••••'
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
                        className='mt-1 h-12 w-full rounded-xl bg-primary text-lg font-semibold text-primary-foreground hover:bg-primary/90'>
                        {isLoading ? "Logging in…" : "Log in"}
                    </Button>

                    <p className='text-center text-sm text-muted-foreground'>
                        UMass email only.
                    </p>

                    <p className='text-center text-sm text-muted-foreground'>
                        Don&apos;t have an account?{" "}
                        <Link href='/auth/signup' className='font-semibold text-primary hover:underline'>
                            Sign up
                        </Link>
                    </p>
                </form>
            </div>
        </main>
    );
}
