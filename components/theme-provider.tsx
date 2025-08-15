"use client"
import { createContext, useContext, type ReactNode } from "react"

const ThemeContext = createContext({ theme: "light" })

export function useTheme() {
  return useContext(ThemeContext)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  return <ThemeContext.Provider value={{ theme: "light" }}>{children}</ThemeContext.Provider>
}
