"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

function Avatar({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        "relative flex size-8 shrink-0 overflow-hidden rounded-full",
        className
      )}
      {...props}
    />
  )
}

interface AvatarImageProps extends React.ComponentProps<typeof AvatarPrimitive.Image> {
  onError?: (event: React.SyntheticEvent<HTMLImageElement, Event>) => void
  onLoad?: (event: React.SyntheticEvent<HTMLImageElement, Event>) => void
  showLoadingState?: boolean
}

function AvatarImage({
  className,
  onError,
  onLoad,
  showLoadingState = true,
  ...props
}: AvatarImageProps) {
  const [hasError, setHasError] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false) // Start as false instead of true

  const handleError = React.useCallback((event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setHasError(true)
    setIsLoading(false)
    onError?.(event)
  }, [onError])

  const handleLoad = React.useCallback((event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setIsLoading(false)
    onLoad?.(event)
  }, [onLoad])

  // Only show loading state if we have a valid src and showLoadingState is true
  const shouldShowLoading = showLoadingState && isLoading && !hasError && props.src && props.src.trim() !== ""

  // Reset states when src changes, but only if src is valid
  React.useEffect(() => {
    if (props.src && props.src.trim() !== "") {
      setHasError(false)
      setIsLoading(true)
    } else {
      // If no src, don't show loading state
      setHasError(false)
      setIsLoading(false)
    }
  }, [props.src])

  // Don't render anything if no src or if src is empty
  if (!props.src || props.src.trim() === "") {
    return null
  }

  // Show loading state if enabled and image is loading
  if (shouldShowLoading) {
    return (
      <div className={cn("aspect-square size-full flex items-center justify-center bg-muted", className)}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (hasError) {
    return null // Let fallback show
  }

  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full", className)}
      onError={handleError}
      onLoad={handleLoad}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "bg-muted flex size-full items-center justify-center rounded-full",
        className
      )}
      {...props}
    />
  )
}

export { Avatar, AvatarImage, AvatarFallback }
