"use client"

import * as React from "react"
import ReactCalendar from "react-calendar"
import "react-calendar/dist/Calendar.css"
import { ptBR } from "date-fns/locale"
import { format } from "date-fns"

import { cn } from "@/lib/utils"

export type CalendarProps = {
  mode?: "single" | "range" | "multiple"
  selected?: Date | undefined
  onSelect?: (date: Date | undefined) => void
  className?: string
  initialFocus?: boolean
  locale?: any
  variant?: "income" | "expense"
}

function Calendar({
  className,
  mode = "single",
  selected,
  onSelect,
  variant = "income",
  ...props
}: CalendarProps) {

  const handleChange = (value: any) => {
    if (onSelect) {
      if (value instanceof Date) {
        onSelect(value)
      } else if (Array.isArray(value) && value.length > 0) {
        onSelect(value[0])
      } else {
        onSelect(undefined)
      }
    }
  }

  // Capitalize first letter helper
  const capitalizefirst = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

  return (
    <div className={cn("p-1 font-sans", className)}>
      <style jsx global>{`
          .react-calendar {
            width: 300px !important;
            max-width: 100%;
            background: transparent !important;
            border: none !important;
            font-family: inherit !important;
            line-height: 1.125em;
          }
          
          /* Header */
          .react-calendar__navigation {
             display: flex;
             height: 44px;
             margin-bottom: 0.5rem;
          }
          .react-calendar__navigation button {
            min-width: 44px;
            background: none;
            font-size: 16px;
            font-weight: 600; 
            /* Removed text-transform maximize control via JS */
          }
          .react-calendar__navigation button:disabled {
            background-color: transparent;
            color: black;
          }
          .dark .react-calendar__navigation button:disabled {
            color: white;
          }
          
          .react-calendar__navigation button:enabled:hover,
          .react-calendar__navigation button:enabled:focus {
            background-color: #f3f4f6; 
            border-radius: 8px;
          }
          .dark .react-calendar__navigation button:enabled:hover,
          .dark .react-calendar__navigation button:enabled:focus {
            background-color: #27272a; 
          }

          /* Weekdays */
          .react-calendar__month-view__weekdays {
            text-align: center;
            /* No uppercase/lowercase forced here, fully controlled by formatter */
            font-weight: 500;
            font-size: 0.75rem; 
            color: #a1a1aa; 
            text-decoration: none;
            margin-bottom: 0.5rem;
          }
          .react-calendar__month-view__weekdays__weekday {
             padding: 0.25rem;
          }
          .react-calendar__month-view__weekdays__weekday abbr {
             text-decoration: none !important;
             cursor: default;
          }

          /* Days */
          .react-calendar__tile {
            max-width: 100%;
            height: 40px; 
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            background: none;
            border-radius: 6px;
            font-size: 0.875rem; 
            transition: 0.1s;
          }
          .react-calendar__month-view__days__day--neighboringMonth {
            color: #d4d4d8; 
          }
          .dark .react-calendar__month-view__days__day--neighboringMonth {
            color: #52525b; 
          }

          .react-calendar__tile:enabled:hover,
          .react-calendar__tile:enabled:focus {
             background-color: #f3f4f6;
             color: black;
          }
          .dark .react-calendar__tile:enabled:hover,
          .dark .react-calendar__tile:enabled:focus {
             background-color: #27272a;
             color: white;
          }

          .react-calendar__tile--now {
            background: transparent;
            color: #10b981; 
            font-weight: bold;
          }
          .react-calendar__tile--now:enabled:hover,
          .react-calendar__tile--now:enabled:focus {
            background: #f3f4f6;
            color: #10b981;
          }

          .react-calendar__tile--active,
          .react-calendar__tile--active:enabled:hover,
          .react-calendar__tile--active:enabled:focus {
            background: ${variant === 'expense' ? '#dc2626' : '#10b981'} !important; 
            color: white !important;
            font-weight: bold;
          }
       `}</style>
      <ReactCalendar
        onChange={handleChange}
        value={selected}
        locale="pt-BR"
        className="dark:text-white"
        calendarType="gregory"
        prev2Label={null}
        next2Label={null}
        // Custom Formatting for "dom, seg, ter..."
        formatShortWeekday={(locale, date) => {
          const day = format(date, "EEE", { locale: ptBR }).replace('.', '').toLowerCase();
          return day.substring(0, 3); // force 3 chars just in case
        }}
        // Custom Navigation Label: "Dezembro de 2025"
        navigationLabel={({ date, label, locale, view }) => {
          if (view === 'month') {
            const month = capitalizefirst(format(date, 'MMMM', { locale: ptBR }));
            const year = format(date, 'yyyy', { locale: ptBR });
            return `${month} de ${year}`;
          }
          return label;
        }}
        {...props}
      />
    </div>
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
