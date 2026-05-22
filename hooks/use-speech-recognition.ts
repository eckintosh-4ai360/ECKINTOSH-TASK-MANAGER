"use client"

import { useState, useEffect, useRef, useCallback } from "react"

interface UseSpeechRecognitionOptions {
  onResult?: (text: string, isFinal: boolean) => void
  onError?: (error: string) => void
  onEnd?: () => void
}

export function useSpeechRecognition({
  onResult,
  onError,
  onEnd,
}: UseSpeechRecognitionOptions = {}) {
  const [isListening, setIsListening] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSupported, setIsSupported] = useState(false)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        setIsSupported(true)
        const rec = new SpeechRecognition()
        rec.continuous = true
        rec.interimResults = true
        rec.lang = navigator.language || "en-US"
        recognitionRef.current = rec
      }
    }
  }, [])

  const start = useCallback(() => {
    if (!recognitionRef.current) return
    setError(null)
    setInterimTranscript("")
    
    const rec = recognitionRef.current

    rec.onstart = () => {
      setIsListening(true)
    }

    rec.onresult = (event: any) => {
      let interim = ""
      let final = ""

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i]
        if (result.isFinal) {
          final += result[0].transcript
        } else {
          interim += result[0].transcript
        }
      }

      setInterimTranscript(interim)
      if (final && onResult) {
        onResult(final, true)
      } else if (interim && onResult) {
        onResult(interim, false)
      }
    }

    rec.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error)
      setError(event.error)
      if (onError) onError(event.error)
      setIsListening(false)
    }

    rec.onend = () => {
      setIsListening(false)
      setInterimTranscript("")
      if (onEnd) onEnd()
    }

    try {
      rec.start()
    } catch (err) {
      console.error("Failed to start speech recognition:", err)
    }
  }, [onResult, onError, onEnd])

  const stop = useCallback(() => {
    if (!recognitionRef.current) return
    try {
      recognitionRef.current.stop()
    } catch (err) {
      console.error("Failed to stop speech recognition:", err)
    }
  }, [])

  return {
    isListening,
    interimTranscript,
    error,
    isSupported,
    start,
    stop,
  }
}
