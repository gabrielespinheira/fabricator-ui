"use client"

import * as React from "react"

import {
  Stepper,
  StepperContent,
  StepperDescription,
  StepperIndicator,
  StepperItem,
  StepperSeparator,
  StepperTitle,
} from "@/styles/base-fabricator/ui/stepper"
import { Button } from "@/styles/base-nova/ui/button"

const STEPS = [
  { title: "Cart", description: "3 items" },
  { title: "Shipping", description: "Address and speed" },
  { title: "Payment", description: "Card or invoice" },
  { title: "Review", description: "Place the order" },
]

export function StepperDemo() {
  const [step, setStep] = React.useState(2)
  return (
    <div className="flex w-full max-w-2xl flex-col gap-6">
      <Stepper value={step}>
        {STEPS.map((item, index) => (
          <StepperItem key={item.title} step={index + 1}>
            <StepperIndicator />
            <StepperContent className="max-sm:hidden">
              <StepperTitle>{item.title}</StepperTitle>
              <StepperDescription>{item.description}</StepperDescription>
            </StepperContent>
            {index < STEPS.length - 1 ? <StepperSeparator /> : null}
          </StepperItem>
        ))}
      </Stepper>
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          disabled={step === 1}
          onClick={() => setStep((value) => value - 1)}
        >
          Back
        </Button>
        <Button
          disabled={step > STEPS.length}
          onClick={() => setStep((value) => value + 1)}
        >
          {step === STEPS.length ? "Place order" : "Next"}
        </Button>
      </div>
    </div>
  )
}
