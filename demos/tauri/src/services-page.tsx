import { useEffect, useState } from "react"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/styles/base-fabricator/ui/alert"
import { Badge } from "@/styles/base-fabricator/ui/badge"
import { Button } from "@/styles/base-fabricator/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/styles/base-fabricator/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/styles/base-fabricator/ui/field"
import { Input } from "@/styles/base-fabricator/ui/input"
import { Textarea } from "@/styles/base-fabricator/ui/textarea"

import {
  describeNativeError,
  hasNativeHost,
  readNativeNote,
  readRuntime,
  writeNativeNote,
} from "./adapters/native"

function ServicesPage() {
  const [runtime, setRuntime] =
    useState<Awaited<ReturnType<typeof readRuntime>>>(null)
  const [note, setNote] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const isNative = hasNativeHost()

  useEffect(() => {
    if (!isNative) return
    let isCurrent = true
    Promise.all([readRuntime(), readNativeNote()])
      .then(([nextRuntime, saved]) => {
        if (!isCurrent) return
        setRuntime(nextRuntime)
        setNote(saved.text)
        setIsReady(true)
      })
      .catch((failure: unknown) => {
        if (isCurrent) setError(describeNativeError(failure))
      })
    return () => {
      isCurrent = false
    }
  }, [isNative])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="secondary">
          {runtime
            ? `${runtime.platform} · ${runtime.architecture}`
            : isNative
              ? "Connecting to Rust"
              : "Browser preview"}
        </Badge>
        <p className="text-muted-foreground">
          The service results below come from the current host.
        </p>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Native request failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>App storage</CardTitle>
          <CardDescription>
            A note stored by Rust in this app’s private data directory. Relaunch
            the app to verify it survives process recreation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="native-note">Saved note</FieldLabel>
              <Textarea
                id="native-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                disabled={!isReady}
                maxLength={16384}
                placeholder={
                  isNative
                    ? "Write a note"
                    : "Launch the Tauri app to use native storage"
                }
              />
              <FieldDescription>
                Up to 16,384 characters. No network request or browser-storage
                fallback.
              </FieldDescription>
            </Field>
            <Button
              disabled={!isReady || isSaving}
              onClick={async () => {
                setIsSaving(true)
                setError("")
                setMessage("")
                try {
                  const saved = await writeNativeNote(note)
                  setMessage(
                    `Saved ${saved.text.length} characters to app storage.`
                  )
                } catch (failure: unknown) {
                  setError(describeNativeError(failure))
                } finally {
                  setIsSaving(false)
                }
              }}
            >
              {isSaving ? "Saving…" : "Save to app storage"}
            </Button>
            {message && <p role="status">{message}</p>}
          </FieldGroup>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>System file picker</CardTitle>
          <CardDescription>
            The WebView’s file input opens the platform picker. File Upload
            examples exercise previews, multiple files and validation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Field>
            <FieldLabel htmlFor="native-file">Select a file</FieldLabel>
            <Input id="native-file" type="file" />
            <FieldDescription>Selection stays on this device.</FieldDescription>
          </Field>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Native integrations</CardTitle>
          <CardDescription>
            Availability is explicit. Separate plugins and platform
            configuration are required for these services.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4">
            <div className="flex items-center justify-between gap-4">
              <dt>Local notifications</dt>
              <dd>
                <Badge variant="outline">Not configured</Badge>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt>Remote push</dt>
              <dd>
                <Badge variant="outline">Not configured</Badge>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt>Haptics / biometrics</dt>
              <dd>
                <Badge variant="outline">Not configured</Badge>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt>Widgets / Live Activities</dt>
              <dd>
                <Badge variant="outline">Separate extension</Badge>
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}

export { ServicesPage }
