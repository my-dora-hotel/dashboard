"use client"

import * as React from "react"
import { IconCopy, IconCheck } from "@tabler/icons-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

interface ShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reportId: string
}

export function ShareDialog({ open, onOpenChange, reportId }: ShareDialogProps) {
  const [copied, setCopied] = React.useState(false)
  const reportUrl = React.useMemo(() => {
    if (typeof window === "undefined") return ""
    return `${window.location.origin}/accounting/reports/${reportId}`
  }, [reportId])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportUrl)
      setCopied(true)
      toast.success("URL kopyalandı")
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error("URL kopyalanırken bir hata oluştu")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Raporu Paylaş</DialogTitle>
          <DialogDescription>
            Raporun URL'sini kopyalayarak paylaşabilirsiniz.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <Input value={reportUrl} readOnly className="flex-1" />
          <Button onClick={handleCopy} variant="outline" size="icon">
            {copied ? (
              <IconCheck className="size-4" />
            ) : (
              <IconCopy className="size-4" />
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
