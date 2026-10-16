"use client"
import { useState } from "react"
import { useRouter } from 'next/navigation'
import { cn } from "cn"

import { CalendarImport, Preferences } from "./components"

enum Steps {
    CALENDAR,
    PREFERENCES
}

const STEP_COUNT = Object.keys(Steps).length / 2

export default function Onboarding() {
    const router = useRouter();
    const [step, setStep] = useState<Steps>(Steps.CALENDAR);
    const [, setCalendarName] = useState("");

    return (
        <main className='flex min-h-svh flex-col bg-background px-5 py-8 sm:px-6'>
            <div className='mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6'>
                {/* Progress */}
                <div
                    role='progressbar'
                    aria-valuemin={1}
                    aria-valuemax={STEP_COUNT}
                    aria-valuenow={step + 1}
                    aria-label='Onboarding progress'
                    className='flex gap-2'
                >
                    {Array.from({ length: STEP_COUNT }, (_, i) => (
                        <span
                            key={i}
                            className={cn(
                                "h-1.5 flex-1 rounded-full transition-colors",
                                i <= step ? "bg-primary" : "bg-muted"
                            )}
                        />
                    ))}
                </div>

                {step === Steps.CALENDAR && (
                    <CalendarImport
                        onSubmit={(name) => {
                            setCalendarName(name);
                            setStep(Steps.PREFERENCES);
                        }}
                    />
                )}

                {step === Steps.PREFERENCES && (
                    <Preferences onContinue={() => router.push('/home')} />
                )}
            </div>
        </main>
    )
}
