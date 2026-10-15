"use client"

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function Login() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const controllerRef = useRef<AbortController | null>(null);

    useEffect(() => () => {
        controllerRef.current?.abort();
        setIsLoading(false);
    }, []);

    const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();

        const controller = new AbortController();
        controllerRef.current = controller;

        setIsLoading(true);

        await new Promise((resolve) => { setTimeout(resolve, 1000)});

        if (controller.signal.aborted) {
            return;
        }

        router.push('/home');
    }

    return (
        <main className='flex min-h-svh flex-col items-center justify-center bg-background px-6 py-10'>
            <div className='w-full max-w-sm'>
                <div className='mb-10 flex flex-col items-center gap-4'>
                    <div className='flex size-24 items-center justify-center rounded-full bg-primary text-5xl font-bold text-primary-foreground'>
                        U
                    </div>
                    <h1 className='text-3xl font-bold tracking-tight'>UPath</h1>
                </div>
                <form onSubmit={handleSubmit} noValidate className='px-4'>
                
                    <Button
                        type='submit'
                        disabled={isLoading}
                        className='mt-8 h-12 w-full rounded-xl bg-primary text-lg font-semibold text-primary-foreground hover:bg-primary/90'>
                            Log in
                    </Button>
                </form>
            </div>
        </main>
    )
}
