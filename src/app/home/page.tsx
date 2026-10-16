"use client"
import { useState } from "react"
import Link from "next/link"
import { CloudUpload, LogOut, Settings } from "lucide-react"

import { BrandLockup } from "@/components/brand"
import { Button } from "@/components/ui/button"
import { CalendarTabs, RouteMap, ScheduleList } from "./components"

export default function Home() {
    const [calendars, setCalendars] = useState(["Fall 2026", "Calendar 2"]);
    const [active, setActive] = useState(0);

    const addCalendar = () =>
        setCalendars((prev) => [...prev, `Calendar ${prev.length + 1}`]);

    const deleteCalendar = () =>
        setCalendars((prev) => {
            if (prev.length <= 1) return prev;
            const next = prev.filter((_, i) => i !== active);
            setActive((current) => Math.min(current, next.length - 1));
            return next;
        });

    return (
        <div className='flex min-h-svh flex-col bg-background'>
            <header className='flex items-center justify-between gap-3 px-5 pt-5 pb-3 sm:px-8'>
                <BrandLockup markClassName='size-8' textClassName='text-base sm:text-lg' />
                <Button
                    type='button'
                    variant='outline'
                    onClick={addCalendar}
                    className='h-10 gap-2 rounded-xl px-3 text-sm font-semibold text-primary sm:px-4'>
                        <CloudUpload className='size-4' />
                        <span className='hidden sm:inline'>Upload calendar</span>
                        <span className='sr-only sm:hidden'>Upload calendar</span>
                </Button>
            </header>

            <main className='mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-5 pb-4 sm:px-8'>
                <CalendarTabs
                    calendars={calendars}
                    active={active}
                    onChange={setActive}
                    onAdd={addCalendar}
                    onDelete={deleteCalendar}
                />

                <div className='grid flex-1 gap-4 lg:grid-cols-2'>
                    <RouteMap className='aspect-[4/3] w-full lg:aspect-auto lg:h-full lg:min-h-[32rem]' />
                    <ScheduleList calendarName={calendars[active]} className='lg:self-start' />
                </div>
            </main>

            <footer className='mt-auto flex items-center justify-between border-t border-border px-5 py-3 sm:px-8'>
                <Button
                    variant='ghost'
                    nativeButton={false}
                    className='gap-2 text-base font-semibold text-muted-foreground hover:text-foreground'
                    render={<Link href='/settings' />}>
                        <Settings className='size-5' />
                        Settings
                </Button>
                <Button
                    variant='ghost'
                    nativeButton={false}
                    className='gap-2 text-base font-semibold text-muted-foreground hover:text-foreground'
                    render={<Link href='/auth/login' />}>
                        <LogOut className='size-5' />
                        Sign out
                </Button>
            </footer>
        </div>
    );
}
