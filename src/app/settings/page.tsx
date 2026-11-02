"use client"
import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import {
    Accessibility,
    ArrowLeft,
    Bell,
    CalendarArrowUp,
    LogOut,
    Monitor,
    Moon,
    Sun,
    Trash2,
} from "lucide-react"
import { cn } from "cn"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { TRANSPORT, type TransportMode } from "@/lib"

const THEME_OPTIONS = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
] as const

function SettingRow({
    icon: Icon,
    title,
    description,
    control,
}: {
    icon: React.ElementType
    title: string
    description: string
    control: React.ReactNode
}) {
    return (
        <div className='flex items-center gap-3 px-4 py-3.5 sm:px-5'>
            <span className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground'>
                <Icon className='size-5' />
            </span>
            <div className='min-w-0 flex-1'>
                <p className='text-sm font-semibold'>{title}</p>
                <p className='text-xs text-muted-foreground text-pretty'>{description}</p>
            </div>
            <div className='shrink-0'>{control}</div>
        </div>
    )
}

function Skeleton({ className }: { className?: string }) {
    return <div aria-hidden className={cn("animate-pulse rounded-xl bg-muted", className)} />
}

export default function Settings() {
    const router = useRouter();
    const { theme, setTheme } = useTheme();
    const [username, setUsername] = React.useState("");
    const [email, setEmail] = React.useState("");
    const [accountStatus, setAccountStatus] = React.useState<"idle" | "signingOut" | "deleting" | "error">("idle");
    const [deleteOpen, setDeleteOpen] = React.useState(false);
    const [notifications, setNotifications] = React.useState(true);
    const [alerts, setAlerts] = React.useState(true);
    const [transport, setTransport] = React.useState<TransportMode>("foot");
    const [accessibility, setAccessibility] = React.useState(false);
    const [status, setStatus] = React.useState<"loading" | "idle" | "saving" | "saved" | "error">("loading");
    const isLoading = status === "loading";

    const hasLoaded = React.useRef(false);
    React.useEffect(() => {
        if (hasLoaded.current) return;
        hasLoaded.current = true;

        const loadSettings = async () => {
            const response = await fetch('/api/profiles');
            if (response.status === 401) {
                router.replace('/auth/login');
                return;
            }
            if (!response.ok) {
                setStatus("error");
                return;
            }
            const { profile } = await response.json();
            setUsername(profile.username);
            setEmail(profile.email ?? "");
            setTheme(profile.theme);
            setTransport(profile.mode);
            setAccessibility(profile.access);
            setNotifications(profile.push_notifications);
            setAlerts(profile.class_alerts);
            setStatus("idle");
        };

        loadSettings();
    }, [setTheme, router]);

    const onSettingsChange = async () => {
        setStatus("saving");
        const data = {
            theme: theme ?? "system",
            mode: transport,
            access: accessibility,
            push_notifications: notifications,
            class_alerts: alerts,
        };

        const response = await fetch('/api/profiles', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        setStatus(response.ok ? "saved" : "error");
    }

    const onSignOut = async () => {
        setAccountStatus("signingOut");
        const response = await fetch('/api/auth/logout', { method: 'POST' });
        if (!response.ok) {
            setAccountStatus("error");
            return;
        }
        router.replace('/auth/login');
        router.refresh();
    }

    const onDeleteAccount = async () => {
        setAccountStatus("deleting");
        const response = await fetch('/api/auth/account', { method: 'DELETE' });
        if (!response.ok) {
            setAccountStatus("error");
            setDeleteOpen(false);
            return;
        }
        router.replace('/auth/signup');
        router.refresh();
    }

    const initials = username.slice(0, 2).toUpperCase() || "UM";
    const accountBusy = accountStatus === "signingOut" || accountStatus === "deleting";

    return (
        <div className='mx-auto flex min-h-svh w-full max-w-2xl flex-col gap-6 bg-background px-5 py-6 sm:px-8'>
            <header className='flex items-center gap-3'>
                <Button
                    variant='ghost'
                    size='icon'
                    nativeButton={false}
                    aria-label='Back to home'
                    className='rounded-full text-muted-foreground'
                    render={<Link href='/home' />}>
                    <ArrowLeft className='size-5' />
                </Button>
                <h1 className='text-2xl font-bold tracking-tight'>Settings</h1>
            </header>

            {/* Profile */}
            <Card className='p-0'>
                <div className='flex items-center gap-4 px-4 py-5 sm:px-5'>
                    <Avatar className='size-14'>
                        <AvatarFallback className='bg-primary text-lg font-semibold text-primary-foreground'>
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                    <div className='min-w-0 flex-1'>
                        {isLoading ? (
                            <div className='flex flex-col gap-1.5'>
                                <Skeleton className='h-5 w-32 rounded-md' />
                                <Skeleton className='h-4 w-44 rounded-md' />
                            </div>
                        ) : (
                            <>
                                <p className='truncate text-base font-semibold'>{username}</p>
                                <p className='truncate text-sm text-muted-foreground'>{email}</p>
                            </>
                        )}
                    </div>
                    <Button variant='outline' className='shrink-0 rounded-xl'>Edit</Button>
                </div>
            </Card>

            {/* Appearance */}
            <section className='flex flex-col gap-2'>
                <h2 className='px-1 text-sm font-semibold text-muted-foreground'>Appearance</h2>
                <Card className='p-4 sm:p-5'>
                    <div className='grid grid-cols-3 gap-2' aria-busy={isLoading}>
                        {isLoading && THEME_OPTIONS.map(({ value }) => (
                            <Skeleton key={value} className='h-16' />
                        ))}
                        {!isLoading && THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
                            const selected = theme === value;
                            return (
                                <Button
                                    key={value}
                                    type='button'
                                    variant='outline'
                                    aria-pressed={selected}
                                    onClick={() => setTheme(value)}
                                    className={cn(
                                        "h-16 flex-col gap-1.5 rounded-xl text-sm font-semibold",
                                        selected
                                            ? "border-primary text-primary ring-1 ring-primary hover:bg-primary/5 hover:text-primary"
                                            : "text-muted-foreground"
                                    )}>
                                    <Icon className='size-5' />
                                    {label}
                                </Button>
                            );
                        })}
                    </div>
                </Card>
            </section>

            {/* Transport */}
            <section className='flex flex-col gap-2'>
                <h2 className='px-1 text-sm font-semibold text-muted-foreground'>Transport</h2>
                <Card className='p-4 sm:p-5'>
                    <div className='grid grid-cols-2 gap-2' aria-busy={isLoading}>
                        {isLoading && TRANSPORT.map(({ value }) => (
                            <Skeleton key={value} className='h-14' />
                        ))}
                        {!isLoading && TRANSPORT.map(({ value, label, icon: Icon }) => {
                            const selected = transport === value;
                            return (
                                <Button
                                    key={value}
                                    type='button'
                                    variant='outline'
                                    aria-pressed={selected}
                                    onClick={() => setTransport(value)}
                                    className={cn(
                                        "h-auto min-h-14 justify-start gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold whitespace-normal",
                                        selected
                                            ? "border-primary text-primary ring-1 ring-primary hover:bg-primary/5 hover:text-primary"
                                            : "text-muted-foreground"
                                    )}>
                                    <Icon className='size-5 shrink-0' />
                                    <span className='text-pretty'>{label}</span>
                                </Button>
                            );
                        })}
                    </div>
                </Card>
            </section>

            {/* Notifications & accessibility */}
            <section className='flex flex-col gap-2'>
                <h2 className='px-1 text-sm font-semibold text-muted-foreground'>Notifications</h2>
                <Card className='divide-y divide-border p-0'>
                    <SettingRow
                        icon={Bell}
                        title='Push notifications'
                        description='Service changes and route disruptions.'
                        control={
                            isLoading ? (
                                <Skeleton className='h-[18.4px] w-[32px] rounded-full' />
                            ) : (
                                <Switch
                                    aria-label='Push notifications'
                                    checked={notifications}
                                    onCheckedChange={setNotifications}
                                />
                            )
                        }
                    />
                    <SettingRow
                        icon={Bell}
                        title='Leave-for-class alerts'
                        description='Remind me when it is time to leave.'
                        control={
                            isLoading ? (
                                <Skeleton className='h-[18.4px] w-[32px] rounded-full' />
                            ) : (
                                <Switch
                                    aria-label='Leave-for-class alerts'
                                    checked={alerts}
                                    onCheckedChange={setAlerts}
                                />
                            )
                        }
                    />
                    <SettingRow
                        icon={Accessibility}
                        title='Wheelchair-accessible routes'
                        description='Only suggest step-free options.'
                        control={
                            isLoading ? (
                                <Skeleton className='h-[18.4px] w-[32px] rounded-full' />
                            ) : (
                                <Switch
                                    aria-label='Wheelchair-accessible routes'
                                    checked={accessibility}
                                    onCheckedChange={setAccessibility}
                                />
                            )
                        }
                    />
                </Card>
            </section>

            <div className='flex flex-col gap-2'>
                <Button
                    type='button'
                    onClick={onSettingsChange}
                    disabled={status === "loading" || status === "saving"}
                    className='h-12 w-full rounded-xl bg-primary text-lg font-semibold text-primary-foreground hover:bg-primary/90'>
                    {status === "saving" ? "Saving..." : "Save"}
                </Button>
                <p role='status' className='text-center text-sm text-muted-foreground'>
                    {status === "saved" && "Settings saved."}
                    {status === "error" && "Something went wrong. Please try again."}
                </p>
            </div>

            {/* Calendars */}
            <section className='flex flex-col gap-2'>
                <h2 className='px-1 text-sm font-semibold text-muted-foreground'>Calendars</h2>
                <Card className='p-0'>
                    <SettingRow
                        icon={CalendarArrowUp}
                        title='Fall 2026'
                        description='Imported from an .ics file.'
                        control={
                            <Button variant='outline' size='sm' className='rounded-lg'>
                                Replace
                            </Button>
                        }
                    />
                    <Separator />
                    <div className='px-4 py-4 sm:px-5'>
                        <Button
                            variant='outline'
                            className='h-11 w-full gap-2 rounded-xl border-border text-base font-semibold text-primary'>
                            <CalendarArrowUp className='size-5' />
                            Import .ics
                        </Button>
                    </div>
                </Card>
            </section>

            {/* Account */}
            <section className='flex flex-col gap-2'>
                <h2 className='px-1 text-sm font-semibold text-muted-foreground'>Account</h2>
                <Card className='divide-y divide-border p-0'>
                    <SettingRow
                        icon={LogOut}
                        title='Sign out'
                        description='Log out of UPath on this device.'
                        control={
                            <Button
                                variant='outline'
                                className='rounded-xl'
                                onClick={onSignOut}
                                disabled={accountBusy}>
                                {accountStatus === "signingOut" ? "Signing out..." : "Sign out"}
                            </Button>
                        }
                    />
                    <SettingRow
                        icon={Trash2}
                        title='Delete account'
                        description='This action cannot be undone.'
                        control={
                            <Button
                                variant='destructive'
                                className='rounded-xl'
                                onClick={() => setDeleteOpen(true)}
                                disabled={accountBusy}>
                                Delete
                            </Button>
                        }
                    />
                </Card>
                {accountStatus === "error" && (
                    <p role='status' className='px-1 text-sm text-destructive'>
                        Something went wrong. Please try again.
                    </p>
                )}
                <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete your account?</DialogTitle>
                            <DialogDescription>
                                This removes your profile, saved locations, and schedules. It cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant='outline' className='rounded-xl' onClick={() => setDeleteOpen(false)} disabled={accountBusy}>
                                Cancel
                            </Button>
                            <Button variant='destructive' className='rounded-xl' onClick={onDeleteAccount} disabled={accountBusy}>
                                {accountStatus === "deleting" ? "Deleting..." : "Delete account"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </section>
        </div>
    );
}