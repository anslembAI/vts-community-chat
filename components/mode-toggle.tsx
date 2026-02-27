
"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ModeToggle() {
    const { setTheme, theme } = useTheme()

    return (
        <Button
            variant="ghost"
            size="icon"
            className="relative rounded-full w-9 h-9 border border-[#E0D6C8] bg-[#F3E8DC] transition-all duration-300 hover:shadow-md hover:scale-105 hover:bg-[#EADFD2]"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title="Toggle theme"
        >
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-[#7A7A7A]" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-[#5C5C5C]" />
            <span className="sr-only">Toggle theme</span>
        </Button>
    )
}
