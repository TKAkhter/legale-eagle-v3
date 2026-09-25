/**
 * Reusable voice-note recorder — MediaRecorder start/stop + local preview.
 * Upload is left to the caller (e.g. hearingsApi.addNote).
 */
import { useCallback, useEffect, useRef, useState } from "react"
import { Box, Button, CircularProgress, Typography } from "@mui/material"
import MicIcon from "@mui/icons-material/Mic"
import StopIcon from "@mui/icons-material/Stop"
import ReplayIcon from "@mui/icons-material/Replay"

export type VoiceRecorderStatus = "idle" | "recording" | "stopped" | "unsupported" | "error"

export type VoiceRecorderProps = {
  /** Called when a recording is finalized (blob ready for upload). */
  onReady: (blob: Blob) => void
  /** Called when the user clears / re-records. */
  onClear?: () => void
  disabled?: boolean
}

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return ""
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ]
  return candidates.find(t => MediaRecorder.isTypeSupported(t)) ?? ""
}

function formatTimer(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

function extForMime(mime: string): string {
  if (mime.includes("ogg")) return "ogg"
  if (mime.includes("mp4") || mime.includes("m4a")) return "m4a"
  if (mime.includes("wav")) return "wav"
  return "webm"
}

export function VoiceRecorder({ onReady, onClear, disabled }: VoiceRecorderProps) {
  const [status, setStatus] = useState<VoiceRecorderStatus>(() =>
    typeof MediaRecorder === "undefined" || typeof navigator === "undefined" || !navigator.mediaDevices
      ? "unsupported"
      : "idle",
  )
  const [elapsed, setElapsed] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mimeRef = useRef("")

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }, [])

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const revokePreview = useCallback(() => {
    setPreviewUrl(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }, [])

  const reset = useCallback(() => {
    clearTimer()
    stopTracks()
    mediaRecorderRef.current = null
    chunksRef.current = []
    setElapsed(0)
    revokePreview()
    setErrorMsg(null)
    setStatus(
      typeof MediaRecorder === "undefined" || !navigator.mediaDevices ? "unsupported" : "idle",
    )
    onClear?.()
  }, [clearTimer, stopTracks, revokePreview, onClear])

  useEffect(() => () => {
    clearTimer()
    stopTracks()
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [clearTimer, stopTracks, previewUrl])

  async function startRecording() {
    if (disabled || status === "recording") return
    setErrorMsg(null)
    revokePreview()
    chunksRef.current = []

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      })
      streamRef.current = stream
      const mime = pickMimeType()
      mimeRef.current = mime
      const recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream)
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onerror = () => {
        setErrorMsg("Recording failed")
        setStatus("error")
        clearTimer()
        stopTracks()
      }
      recorder.onstop = () => {
        clearTimer()
        stopTracks()
        const type = mimeRef.current || "audio/webm"
        const blob = new Blob(chunksRef.current, { type })
        chunksRef.current = []
        if (!blob.size) {
          setErrorMsg("No audio captured")
          setStatus("error")
          return
        }
        const url = URL.createObjectURL(blob)
        setPreviewUrl(url)
        setStatus("stopped")
        onReady(blob)
      }

      recorder.start(250)
      setElapsed(0)
      setStatus("recording")
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
    } catch {
      setErrorMsg("Microphone access denied or unavailable")
      setStatus("error")
      stopTracks()
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current
    if (!recorder || recorder.state === "inactive") return
    recorder.stop()
  }

  if (status === "unsupported") {
    return (
      <Typography variant="body2" color="text.secondary">
        Voice recording is not supported in this browser.
      </Typography>
    )
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 1.5,
        py: 1,
        width: "100%",
      }}
    >
      <Typography
        variant="h5"
        sx={{
          fontVariantNumeric: "tabular-nums",
          fontWeight: 600,
          letterSpacing: "0.04em",
          color: status === "recording" ? "error.main" : "text.primary",
        }}
      >
        {formatTimer(elapsed)}
      </Typography>

      <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
        {status === "recording" ? (
          <Button
            variant="contained"
            color="error"
            startIcon={<StopIcon />}
            onClick={stopRecording}
            disabled={disabled}
          >
            Stop
          </Button>
        ) : status === "stopped" ? (
          <Button
            variant="outlined"
            startIcon={<ReplayIcon />}
            onClick={reset}
            disabled={disabled}
          >
            Re-record
          </Button>
        ) : (
          <Button
            variant="outlined"
            startIcon={<MicIcon />}
            onClick={() => { void startRecording() }}
            disabled={disabled}
          >
            {status === "error" ? "Try again" : "Start recording"}
          </Button>
        )}
        {status === "recording" && (
          <CircularProgress size={20} color="error" thickness={5} />
        )}
      </Box>

      {errorMsg && (
        <Typography variant="caption" color="error">{errorMsg}</Typography>
      )}

      {previewUrl && status === "stopped" && (
        <Box sx={{ width: "100%", mt: 0.5 }}>
          <audio src={previewUrl} controls style={{ width: "100%" }} />
        </Box>
      )}
    </Box>
  )
}

/** Build a File suitable for `/util/fileUpload` from a MediaRecorder blob. */
export function voiceBlobToFile(blob: Blob, basename = "voice-note"): File {
  const mime = blob.type || "audio/webm"
  return new File([blob], `${basename}.${extForMime(mime)}`, { type: mime })
}
