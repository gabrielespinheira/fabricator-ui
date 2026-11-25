"use client"

import { useState } from "react"

import { Button } from "@/styles/base-fabricator/ui/button"
import {
  RecordView,
  RecordViewSection,
} from "@/styles/base-fabricator/ui/record-view"

import { PropertiesExample } from "./properties-example"

export function RecordViewExample() {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open issue</Button>
      <RecordView
        mode="side"
        title="Update onboarding"
        open={isOpen}
        onOpenChange={setIsOpen}
      >
        <RecordViewSection>
          <PropertiesExample />
        </RecordViewSection>
      </RecordView>
    </>
  )
}
