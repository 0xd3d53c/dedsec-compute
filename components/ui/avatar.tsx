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
  const [isLoading, setIsLoading] = React.useState(true)

  const handleError = React.useCallback((event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setHasError(true)
    setIsLoading(false)
    onError?.(event)
  }, [onError])

  const handleLoad = React.useCallback((event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setIsLoading(false)
    onLoad?.(event)
  }, [onLoad])

  // Reset states when src changes
  React.useEffect(() => {
    setHasError(false)
    setIsLoading(true)
  }, [props.src])

  // Show loading state if enabled and image is loading
  if (showLoadingState && isLoading && !hasError) {
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
