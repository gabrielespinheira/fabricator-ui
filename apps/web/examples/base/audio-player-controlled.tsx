"use client"

import * as React from "react"

import { AudioPlayer } from "@/styles/base-fabricator/ui/audio-player"

export function AudioPlayerControlled() {
  const [isPlaying, setIsPlaying] = React.useState(false)
  const [plays, setPlays] = React.useState(0)

  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <AudioPlayer
        src="/media/sintel-trailer.m4a"
        title="Sintel, trailer"
        artist="Blender Foundation"
        playbackRates={[1, 1.5, 2]}
        onPlayingChange={setIsPlaying}
        onEnded={() => setPlays((count) => count + 1)}
        className="w-full"
      />
      <p className="text-sm text-muted-foreground">
        {isPlaying ? "Playing" : "Paused"} · listened to the end {plays}{" "}
        {plays === 1 ? "time" : "times"}
      </p>
    </div>
  )
}
