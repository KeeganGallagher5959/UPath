"use client"
import { useState } from "react"
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function Onboarding() {
    enum Steps {
        CALENDAR,
        PREFERENCES
    }

    const router = useRouter();
    const [step, setStep] = useState(0);

    const handleClick = () => {
        if (step == Steps.PREFERENCES) {
            router.push('/home');
            return;
        }

        setStep(step + 1);
    }

    return (
        <div className='flex min-h-svh flex-col items-center justify-center bg-background px-10 py-10'>
            {step == Steps.CALENDAR &&
                <Button
                    onClick={handleClick}
                    className='h-12 w-full max-w-sm rounded-xl bg-primary text-lg font-semibold text-primary-foreground hover:bg-primary/90'>
                    Submit
                </Button>
            }

            {step == Steps.PREFERENCES &&
                <Button
                    onClick={handleClick}
                    className='h-12 w-full max-w-sm rounded-xl bg-primary text-lg font-semibold text-primary-foreground hover:bg-primary/90'>
                    Continue
                </Button>
            }
        </div>
    )
}
