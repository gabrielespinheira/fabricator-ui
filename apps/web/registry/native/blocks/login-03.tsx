import * as React from "react"
import { GalleryVerticalEndIcon } from "@fabricator-ui/icons-react-native"
import { AppleIcon, GoogleIcon } from "@fabricator-ui/icons-react-native/brands"
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
  FieldSeparator,
} from "@/registry/native/ui/field"
import { Input } from "@/registry/native/ui/input"
import { Text, TextStyle } from "@/registry/native/ui/text"

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

function Login03({
  onSubmit = noop,
  onLogoPress = noop,
  onApplePress = noop,
  onGooglePress = noop,
  onForgotPasswordPress = noop,
  onSignUpPress = noop,
  onTermsPress = noop,
  onPrivacyPress = noop,
}: {
  onSubmit?: (values: { email: string; password: string }) => void
  onLogoPress?: () => void
  onApplePress?: () => void
  onGooglePress?: () => void
  onForgotPasswordPress?: () => void
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
        <View className="w-full max-w-sm gap-6">
          <Pressable
            role="link"
            hitSlop={10}
            className="flex-row items-center gap-2 self-center active:opacity-70"
            onPress={onLogoPress}
          >
            <TextStyle className="text-primary-foreground">
              <View className="size-6 items-center justify-center rounded-md bg-primary">
                <GalleryVerticalEndIcon />
              </View>
            </TextStyle>
            <Text className="font-medium">Acme Inc.</Text>
          </Pressable>
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-xl">
                Welcome back
              </CardTitle>
              <CardDescription className="text-center">
                Login with your Apple or Google account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <Button variant="outline" onPress={onApplePress}>
                    <AppleIcon />
                    Login with Apple
                  </Button>
                  <Button variant="outline" onPress={onGooglePress}>
                    <GoogleIcon />
                    Login with Google
                  </Button>
                </Field>
                <FieldSeparator contentClassName="bg-card">
                  Or continue with
                </FieldSeparator>
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

export { Login03 }
