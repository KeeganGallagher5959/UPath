"use client"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { CloudUpload, LogOut, Settings } from "lucide-react"

import { BrandLockup } from "@/components/brand"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { CalendarTabs, RouteMap } from "./components"

const DayCalendar = dynamic(
    () => import("./components/day-calendar").then((module) => module.DayCalendar),
    { ssr: false },
)

type Schedule = { id: string; name: string }

export default function Home() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const uploadInFlightRef = useRef(false);
    const [calendars, setCalendars] = useState<Schedule[]>([]);
    const [active, setActive] = useState(0);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [name, setName] = useState("My Calendar");
    const [uploadOpen, setUploadOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadSchedules = async () => {
            const response = await fetch("/api/schedules");
            if (!response.ok) return;
            const result = await response.json();
            setCalendars(result.schedules ?? []);
        };
        void loadSchedules();
    }, []);

    const addCalendar = () => {
        setError(null);
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        if (!file.name.toLowerCase().endsWith(".ics")) {
            setError("Please choose an .ics calendar file.");
            return;
        }
        setSelectedFile(file);
        setName(file.name.replace(/\.ics$/i, "") || "My Calendar");
        setUploadOpen(true);
    };

    const uploadCalendar = async () => {
        if (!selectedFile || uploadInFlightRef.current) return;
        uploadInFlightRef.current = true;
        setIsUploading(true);
        setError(null);
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 30_000);
        try {
            const form = new FormData();
            form.append("file", selectedFile);
            form.append("name", name.trim() || "My Calendar");
            const response = await fetch("/api/schedules/upload", { method: "POST", body: form, signal: controller.signal });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Failed to upload calendar.");
            setCalendars((prev) => {
                const next = [...prev, result.schedule];
                setActive(next.length - 1);
                return next;
            });
            setUploadOpen(false);
            setSelectedFile(null);
        } catch (uploadError) {
            setError(
                uploadError instanceof DOMException && uploadError.name === "AbortError"
                    ? "Upload timed out. Please try again."
                    : uploadError instanceof Error
                        ? uploadError.message
                        : "Failed to upload calendar.",
            );
        } finally {
            window.clearTimeout(timeout);
            uploadInFlightRef.current = false;
            setIsUploading(false);
        }
    };

    const deleteCalendar = async () => {
        const schedule = calendars[active];
        if (!schedule) return;
        const response = await fetch(`/api/schedules/${schedule.id}`, { method: "DELETE" });
        if (!response.ok) return;
        setCalendars((prev) => {
            const next = prev.filter((_, i) => i !== active);
            setActive((current) => Math.min(current, next.length - 1));
            return next;
        });
    };

    const activeName = calendars[active]?.name ?? "Calendar";

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
                <input ref={fileInputRef} type="file" accept=".ics,text/calendar" onChange={handleFileChange} className="hidden" aria-label="Choose an ICS calendar file" />
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
                    <DayCalendar
                        scheduleId={calendars[active]?.id}
                        calendarName={activeName}
                        className="lg:self-start"
                    />
                </div>
            </main>

            <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
                <DialogContent className="gap-5">
                    <DialogHeader><DialogTitle className="text-xl font-bold">Name Your Calendar</DialogTitle></DialogHeader>
                    <Input autoFocus value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void uploadCalendar(); }} aria-label="Calendar name" className="h-12 rounded-xl text-base" />
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <Button type="button" onClick={() => void uploadCalendar()} disabled={isUploading || !selectedFile} className="h-12 w-full rounded-xl">
                        {isUploading ? "Uploading..." : "Upload Calendar"}
                    </Button>
                </DialogContent>
            </Dialog>

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
