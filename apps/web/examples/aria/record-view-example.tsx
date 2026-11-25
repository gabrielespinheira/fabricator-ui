"use client"

import * as React from "react"

import { Button } from "@/styles/aria-fabricator/ui/button"
import {
  RecordView,
  RecordViewSection,
  type RecordViewMode,
} from "@/styles/aria-fabricator/ui/record-view"

import { PropertiesExample } from "./properties-example"

const accounts = ["Northwind Traders", "Contoso", "Fabrikam"]

export function RecordViewExample() {
  const [titles, setTitles] = React.useState(accounts)
  const [index, setIndex] = React.useState(0)
  const [isOpen, setIsOpen] = React.useState(false)
  const [mode, setMode] = React.useState<RecordViewMode>("side")

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {titles.map((title, place) => (
          <Button
            key={accounts[place]}
            variant="outline"
            onClick={() => {
              setIndex(place)
              setIsOpen(true)
            }}
          >
            {title}
          </Button>
        ))}
      </div>
      <RecordView
        open={isOpen}
        onOpenChange={setIsOpen}
        mode={mode}
        onModeChange={setMode}
        context="Accounts"
        title={titles[index]}
        onTitleChange={(title) =>
          setTitles((list) =>
            list.map((entry, place) => (place === index ? title : entry))
          )
        }
        aside={<PropertiesExample key={index} />}
      >
        <RecordViewSection title="Last call">
          <p className="text-muted-foreground">
            They want a security review before the trial ends, and a price for
            60 seats.
          </p>
        </RecordViewSection>
      </RecordView>
    </>
  )
}
