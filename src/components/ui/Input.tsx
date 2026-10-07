import type { ReactNode } from 'react'

export interface FieldWrapProps {
  label?: string
  error?: string
  hint?: ReactNode
  children: ReactNode
  htmlFor?: string
}

export function FieldWrap({ label, error, hint, children, htmlFor }: FieldWrapProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={htmlFor} className="text-sm font-medium text-stone-700">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-stone-500">{hint}</p>
      ) : null}
    </div>
  )
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export function Input({ label, error, hint, id, className = '', ...rest }: InputProps) {
  const inputId = id ?? rest.name
  return (
    <FieldWrap label={label} error={error} hint={hint} htmlFor={inputId}>
      <input
        id={inputId}
        aria-invalid={Boolean(error)}
        className={`h-11 w-full rounded-xl border-0 bg-white px-3.5 text-[15px] text-stone-900 shadow-sm ring-1 ring-inset transition placeholder:text-stone-400 focus:ring-2 focus:ring-brand-600 focus:outline-none ${error ? 'ring-red-300 focus:ring-red-500' : 'ring-stone-200'} ${className}`}
        {...rest}
      />
    </FieldWrap>
  )
}

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export function Textarea({ label, error, hint, id, className = '', ...rest }: TextareaProps) {
  const inputId = id ?? rest.name
  return (
    <FieldWrap label={label} error={error} hint={hint} htmlFor={inputId}>
      <textarea
        id={inputId}
        aria-invalid={Boolean(error)}
        className={`min-h-24 w-full rounded-xl border-0 bg-white px-3.5 py-2.5 text-[15px] text-stone-900 shadow-sm ring-1 ring-inset transition placeholder:text-stone-400 focus:ring-2 focus:ring-brand-600 focus:outline-none ${error ? 'ring-red-300 focus:ring-red-500' : 'ring-stone-200'} ${className}`}
        {...rest}
      />
    </FieldWrap>
  )
}