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
import { Text } from "@/registry/native/ui/text"

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

function Login01({
  onSubmit = noop,
  onForgotPasswordPress = noop,
  onGooglePress = noop,
  onSignUpPress = noop,
}: {
  onSubmit?: (values: { email: string; password: string }) => void
  onForgotPasswordPress?: () => void
  onGooglePress?: () => void
  onSignUpPress?: () => void
}) {
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [isSubmitted, setIsSubmitted] = React.useState(false)
  const passwordRef = React.useRef<React.ComponentRef<typeof Input>>(null)

  const submit = () => {
    setIsSubmitted(true)
    if (email && password) onSubmit({ email, password })
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
              <CardTitle>Login to your account</CardTitle>
              <CardDescription>
                Enter your email below to login to your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field data-invalid={isSubmitted && !email}>
                  <FieldLabel>Email</FieldLabel>
                  <Input
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
                </Field>
                <Field data-invalid={isSubmitted && !password}>
                  <View className="flex-row items-center justify-between">
                    <FieldLabel>Password</FieldLabel>
                    <Pressable
                      role="link"
                      hitSlop={13}
                      className="active:opacity-70"
                      onPress={onForgotPasswordPress}
                    >
                      <Text className="text-(length:--density-text-13)">
                        Forgot your password?
                      </Text>
                    </Pressable>
                  </View>
                  <Input
                    ref={passwordRef}
                    accessibilityLabel="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="current-password"
                    textContentType="password"
                    returnKeyType="go"
                    onSubmitEditing={submit}
                  />
                </Field>
                <Field>
                  <Button onPress={submit}>Login</Button>
                  <Button variant="outline" onPress={onGooglePress}>
                    Login with Google
                  </Button>
                  {/* Clears the button above, so the link's target stays off it. */}
                  <View className="mt-2 flex-row flex-wrap justify-center gap-x-1">
                    <FieldDescription>
                      Don&apos;t have an account?
                    </FieldDescription>
                    <CaptionLink onPress={onSignUpPress}>Sign up</CaptionLink>
                  </View>
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

export { Login01 }
