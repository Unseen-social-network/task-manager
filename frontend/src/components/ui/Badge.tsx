import { ReactNode } from 'react'
import { cn } from '@/utils/helpers'

interface BadgeProps {
  children: ReactNode
  className?: string
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
}

export const Badge = ({ children, className, variant = 'default' }: BadgeProps) => {
  const variants = {
    default: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
    primary: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
    success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
    warning: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100',
    danger: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
