import Link from "next/link"
import { Settings } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Home() {

    return (
        <div className="min-h-svh bg-background">
            <header className="flex items-center justify-end px-6 py-4">
                <Button
                    nativeButton={false}
                    render={<Link href="/settings" aria-label="Settings" />}
                    variant="ghost"
                    size="icon"
                    className="size-11 rounded-full text-muted-foreground hover:text-primary"
                >
                    <Settings className="size-6" />
                </Button>
            </header>
        </div>
    )
}
