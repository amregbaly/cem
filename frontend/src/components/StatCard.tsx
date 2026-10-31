"use client";

import React from "react";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  badge?: string;
  badgeColor?: string;
  accentColor?: string;
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  badge,
  badgeColor = "emerald",
  accentColor = "var(--color-primary)"
}: StatCardProps) {
  return (
    <div 
      className="p-5 rounded-2xl border transition-all hover:shadow-lg hover:-translate-y-0.5 group"
      style={{
        backgroundColor: "var(--color-surface)",
        borderColor: "var(--color-border)"
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {title}
        </span>
        <div 
          className="p-2.5 rounded-xl transition-transform group-hover:scale-110"
          style={{ backgroundColor: `${accentColor}18`, color: accentColor }}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="flex items-baseline space-x-2">
        <span className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
          {value}
        </span>
        {badge && (
          <span 
            className={`text-xs px-2 py-0.5 rounded-full font-bold bg-${badgeColor}-100 text-${badgeColor}-700 dark:bg-${badgeColor}-950 dark:text-${badgeColor}-300`}
          >
            {badge}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}
