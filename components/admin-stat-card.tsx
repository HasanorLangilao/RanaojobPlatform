import { cn } from "@/lib/utils"
import Link from "next/link"
import type React from "react"

interface AdminStatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  description?: string
  trend?: {
    value: string | number | undefined
    isPositive: boolean
  }
  href?: string
  className?: string
}

export function AdminStatCard({ title, value, icon, description, trend, href, className }: AdminStatCardProps) {
  const CardContent = () => (
    <div className={cn("rounded-lg border bg-white p-6 shadow-sm transition-all hover:shadow-md", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <div className="rounded-full bg-gray-100 p-2">{icon}</div>
      </div>
      <div className="mt-3">
        <p className="text-3xl font-bold">{value}</p>
        {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      </div>
      {trend && (
        <div className="mt-3">
          <p className={cn("text-sm", trend.isPositive ? "text-green-600" : "text-red-600")}>
            {trend.isPositive ? "↑" : "↓"} {trend.value}
          </p>
        </div>
      )}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="block">
        <CardContent />
      </Link>
    )
  }

  return <CardContent />
}
