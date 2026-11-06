import * as React from "react"
import { KeyboardAvoidingView, Pressable, ScrollView, View } from "react-native"

import { Button } from "@/registry/native/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/registry/native/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/registry/native/ui/field"
import { Input } from "@/registry/native/ui/input"

const noop = () => {}

function CaptionLink({
  onPress,
  children,
}: {
  onPress: () => void
  children: string
}) {
  return (
    <Pressable
      role="link"
      // A caption's line is 18pt tall: this makes it a 44pt target.
      hitSlop={13}
      className="active:opacity-70"
      onPress={onPress}
    >
      <FieldDescription className="underline">{children}</FieldDescription>
    </Pressable>
  )
}

function Signup01({
  onSubmit = noop,
  onGooglePress = noop,
  onSignInPress = noop,
}: {
  onSubmit?: (values: {
    name: string
    email: string
    password: string
    confirmPassword: string
  }) => void
  onGooglePress?: () => void
  onSignInPress?: () => void
}) {
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [isSubmitted, setIsSubmitted] = React.useState(false)
  const emailRef = React.useRef<React.ComponentRef<typeof Input>>(null)
  const passwordRef = React.useRef<React.ComponentRef<typeof Input>>(null)
  const confirmPasswordRef =
    React.useRef<React.ComponentRef<typeof Input>>(null)

  const submit = () => {
    setIsSubmitted(true)
    if (name && email && password && confirmPassword) {
      onSubmit({ name, email, password, confirmPassword })
    }
  }

  return (
    <KeyboardAvoidingView behavior="padding" className="flex-1 bg-background">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="p-safe-offset-6 sm:p-safe-offset-10 grow items-center justify-center"
      >
        <View className="w-full max-w-sm">
          <Card>
            <CardHeader>
              <CardTitle>Create an account</CardTitle>
              <CardDescription>
                Enter your information below to create your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field data-invalid={isSubmitted && !name}>
                  <FieldLabel>Full Name</FieldLabel>
                  <Input
                    accessibilityLabel="Full Name"
                    placeholder="John Doe"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    autoComplete="name"
                    textContentType="name"
                    returnKeyType="next"
                    submitBehavior="submit"
                    onSubmitEditing={() => emailRef.current?.focus()}
                  />
                </Field>
                <Field data-invalid={isSubmitted && !email}>
                  <FieldLabel>Email</FieldLabel>
                  <Input
                    ref={emailRef}
                    accessibilityLabel="Email"
                    placeholder="gabs@fabricator.dev"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    textContentType="emailAddress"
                    returnKeyType="next"
                    submitBehavior="submit"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                  />
                  <FieldDescription>
                    We&apos;ll use this to contact you. We will not share your
                    email with anyone else.
                  </FieldDescription>
                </Field>
                <Field data-invalid={isSubmitted && !password}>
                  <FieldLabel>Password</FieldLabel>
                  <Input
                    ref={passwordRef}
                    accessibilityLabel="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="new-password"
                    textContentType="newPassword"
                    returnKeyType="next"
                    submitBehavior="submit"
                    onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                  />
                  <FieldDescription>
                    Must be at least 8 characters long.
                  </FieldDescription>
                </Field>
                <Field data-invalid={isSubmitted && !confirmPassword}>
                  <FieldLabel>Confirm Password</FieldLabel>
                  <Input
                    ref={confirmPasswordRef}
                    accessibilityLabel="Confirm Password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="new-password"
                    textContentType="newPassword"
                    returnKeyType="go"
                    onSubmitEditing={submit}
                  />
                  <FieldDescription>
                    Please confirm your password.
                  </FieldDescription>
                </Field>
                <FieldGroup>
                  <Field>
                    <Button onPress={submit}>Create Account</Button>
                    <Button variant="outline" onPress={onGooglePress}>
                      Sign up with Google
                    </Button>
                    {/* Clears the button above, so the link's target stays off it. */}
                    <View className="mt-2 flex-row flex-wrap justify-center gap-x-1 px-6">
                      <FieldDescription>
                        Already have an account?
                      </FieldDescription>
                      <CaptionLink onPress={onSignInPress}>Sign in</CaptionLink>
                    </View>
                  </Field>
                </FieldGroup>
              </FieldGroup>
            </CardContent>
          </Card>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

export { Signup01 }
