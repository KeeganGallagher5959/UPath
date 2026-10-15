"use client"

import { useSyncExternalStore } from "react"
import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"

const themes = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
]

export default function Settings() {
    const { resolvedTheme, setTheme } = useTheme();
    const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);

    return (
        <div className="min-h-svh bg-background px-6 py-10">
            <div className="mx-auto w-full max-w-sm">
                <h1 className="mb-8 text-3xl font-bold tracking-tight">Settings</h1>
                <section className="flex flex-col gap-3">
                    <h2 className="text-base font-semibold">Appearance</h2>
                    <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
                        {themes.map(({ value, label, icon: Icon }) => {
                            const active = mounted && resolvedTheme === value;

                            return (
                                <Button
                                    key={value}
                                    variant={active ? "default" : "ghost"}
                                    aria-pressed={active}
                                    onClick={() => setTheme(value)}
                                    className={active
                                        ? "h-11 rounded-lg text-base font-semibold"
                                        : "h-11 rounded-lg text-base font-semibold text-muted-foreground"}
                                >
                                    <Icon className="size-5" />
                                    {label}
                                </Button>
                            )
                        })}
                    </div>
                </section>
            </div>
        </div>
    )
}
