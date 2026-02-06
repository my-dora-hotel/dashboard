"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { LedgerDraftEntry } from "@/types/database"
import { format } from "date-fns"

interface UseDraftAutoSaveOptions {
  entryRows: LedgerDraftEntry[]
  createDate: Date | undefined
  isOpen: boolean
}

interface UseDraftAutoSaveReturn {
  draftId: string | null
  setDraftId: (id: string | null) => void
  deleteDraft: () => Promise<void>
  /** Immediately save current data (INSERT or UPDATE). Call BEFORE resetForm. Returns a promise. */
  flushSave: () => Promise<void>
}

const DEBOUNCE_MS = 1500

/**
 * Hook that auto-saves ledger entry drafts to Supabase.
 *
 * - Debounced upsert on every change (1.5s)
 * - Only saves when at least 1 row has an account_id set
 * - flushSave() for immediate save before form reset
 * - Deletes draft on successful creation
 */
export function useDraftAutoSave({
  entryRows,
  createDate,
  isOpen,
}: UseDraftAutoSaveOptions): UseDraftAutoSaveReturn {
  const [draftId, setDraftId] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const supabaseRef = useRef(createClient())

  // Keep refs so flushSave always reads the latest values
  const entryRowsRef = useRef(entryRows)
  const createDateRef = useRef(createDate)
  const draftIdRef = useRef(draftId)
  entryRowsRef.current = entryRows
  createDateRef.current = createDate
  draftIdRef.current = draftId

  const hasData = entryRows.some((row) => row.account_id !== "")
  const hasDataRef = useRef(hasData)
  hasDataRef.current = hasData

  // Debounced auto-save
  useEffect(() => {
    if (!isOpen || !hasData) return

    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    timerRef.current = setTimeout(async () => {
      const supabase = supabaseRef.current
      const dateStr = createDate ? format(createDate, "yyyy-MM-dd") : null

      if (draftId) {
        await supabase
          .from("ledger_drafts")
          .update({
            date: dateStr,
            entries: JSON.parse(JSON.stringify(entryRows)),
          })
          .eq("id", draftId)
      } else {
        const { data } = await supabase
          .from("ledger_drafts")
          .insert({
            date: dateStr,
            entries: JSON.parse(JSON.stringify(entryRows)),
          })
          .select("id")
          .single()

        if (data) {
          setDraftId(data.id)
        }
      }
    }, DEBOUNCE_MS)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [entryRows, createDate, isOpen, hasData, draftId])

  // Reset draftId when dialog closes
  useEffect(() => {
    if (!isOpen) {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      setDraftId(null)
    }
  }, [isOpen])

  /**
   * Immediately save the current draft data to Supabase (INSERT or UPDATE).
   * Call this BEFORE resetForm() so it captures the real data via refs.
   * Returns a promise that resolves when the save is complete.
   */
  const flushSave = useCallback(async () => {
    // Cancel pending debounced save
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    const currentDraftId = draftIdRef.current
    const currentHasData = hasDataRef.current
    const currentEntryRows = entryRowsRef.current
    const currentCreateDate = createDateRef.current

    if (!currentHasData) return

    const supabase = supabaseRef.current
    const dateStr = currentCreateDate
      ? format(currentCreateDate, "yyyy-MM-dd")
      : null
    const entriesJson = JSON.parse(JSON.stringify(currentEntryRows))

    if (currentDraftId) {
      // UPDATE existing draft
      await supabase
        .from("ledger_drafts")
        .update({ date: dateStr, entries: entriesJson })
        .eq("id", currentDraftId)
    } else {
      // INSERT new draft (first save)
      await supabase
        .from("ledger_drafts")
        .insert({ date: dateStr, entries: entriesJson })
    }
  }, [])

  const deleteDraft = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    const id = draftIdRef.current
    if (!id) return
    const supabase = supabaseRef.current
    await supabase.from("ledger_drafts").delete().eq("id", id)
    setDraftId(null)
  }, [])

  return { draftId, setDraftId, deleteDraft, flushSave }
}
