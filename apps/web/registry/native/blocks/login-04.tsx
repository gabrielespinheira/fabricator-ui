import * as React from "react"
import {
  AppleIcon,
  GoogleIcon,
  MetaIcon,
} from "@fabricator-ui/icons-react-native/brands"
import { KeyboardAvoidingView, Pressable, ScrollView, View } from "react-native"

import { Button } from "@/registry/native/ui/button"
import { Card, CardContent } from "@/registry/native/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
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

function Login04({
  onSubmit = noop,
  onForgotPasswordPress = noop,
  onApplePress = noop,
  onGooglePress = noop,
  onMetaPress = noop,
  onSignUpPress = noop,
  onTermsPress = noop,
  onPrivacyPress = noop,
}: {
  onSubmit?: (values: { email: string; password: string }) => void
  onForgotPasswordPress?: () => void
  onApplePress?: () => void
  onGooglePress?: () => void
  onMetaPress?: () => void
  onSignUpPress?: () => void
  onTermsPress?: () => void
  onPrivacyPress?: () => void
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
    <KeyboardAvoidingView behavior="padding" className="flex-1 bg-muted">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="p-safe-offset-6 sm:p-safe-offset-10 grow items-center justify-center"
      >
        <View className="w-full max-w-sm gap-6 sm:max-w-4xl">
          <Card className="overflow-hidden p-0">
            <CardContent className="gap-0 p-0 sm:flex-row">
              <View className="p-6 sm:flex-1 sm:p-8">
                <FieldGroup>
                  <View className="items-center gap-2">
                    <Text
                      role="heading"
                      className="text-center text-2xl font-bold"
                    >
                      Welcome back
                    </Text>
                    <Text className="text-center text-muted-foreground">
                      Login to your Acme Inc account
                    </Text>
                  </View>
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
                        <Text className="text-(length:--density-text-14)">
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
                  </Field>
                  <FieldSeparator contentClassName="bg-card">
                    Or continue with
                  </FieldSeparator>
                  <Field orientation="horizontal" className="gap-4">
                    <Button
                      variant="outline"
                      accessibilityLabel="Login with Apple"
                      className="flex-1"
                      onPress={onApplePress}
                    >
                      <AppleIcon />
                    </Button>
                    <Button
                      variant="outline"
                      accessibilityLabel="Login with Google"
                      className="flex-1"
                      onPress={onGooglePress}
                    >
                      <GoogleIcon />
                    </Button>
                    <Button
                      variant="outline"
                      accessibilityLabel="Login with Meta"
                      className="flex-1"
                      onPress={onMetaPress}
                    >
                      <MetaIcon />
                    </Button>
                  </Field>
                  <View className="flex-row flex-wrap justify-center gap-x-1">
                    <FieldDescription>
                      Don&apos;t have an account?
                    </FieldDescription>
                    <CaptionLink onPress={onSignUpPress}>Sign up</CaptionLink>
                  </View>
                </FieldGroup>
              </View>
              <View className="hidden bg-muted sm:flex sm:flex-1" />
            </CardContent>
          </Card>
          <View className="flex-row flex-wrap justify-center gap-x-1 px-6">
            <FieldDescription className="text-center">
              By clicking continue, you agree to our
            </FieldDescription>
            <CaptionLink onPress={onTermsPress}>Terms of Service</CaptionLink>
            <FieldDescription>and</FieldDescription>
            <View className="flex-row">
              <CaptionLink onPress={onPrivacyPress}>Privacy Policy</CaptionLink>
              <FieldDescription>.</FieldDescription>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

export { Login04 }
