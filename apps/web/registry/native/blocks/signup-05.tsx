import * as React from "react"
import { GalleryVerticalEndIcon } from "@fabricator-ui/icons-react-native"
import { AppleIcon, GoogleIcon } from "@fabricator-ui/icons-react-native/brands"
import { KeyboardAvoidingView, Pressable, ScrollView, View } from "react-native"

import { Button } from "@/registry/native/ui/button"
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

function Signup05({
  onSubmit = noop,
  onLogoPress = noop,
  onSignInPress = noop,
  onApplePress = noop,
  onGooglePress = noop,
  onTermsPress = noop,
  onPrivacyPress = noop,
}: {
  onSubmit?: (values: { email: string }) => void
  onLogoPress?: () => void
  onSignInPress?: () => void
  onApplePress?: () => void
  onGooglePress?: () => void
  onTermsPress?: () => void
  onPrivacyPress?: () => void
}) {
  const [email, setEmail] = React.useState("")
  const [isSubmitted, setIsSubmitted] = React.useState(false)

  const submit = () => {
    setIsSubmitted(true)
    if (email) onSubmit({ email })
  }

  return (
    <KeyboardAvoidingView behavior="padding" className="flex-1 bg-background">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="p-safe-offset-6 sm:p-safe-offset-10 grow items-center justify-center"
      >
        <View className="w-full max-w-sm gap-6">
          <FieldGroup>
            <View className="items-center gap-2">
              <Pressable
                role="link"
                accessibilityLabel="Acme Inc."
                hitSlop={6}
                className="active:opacity-70"
                onPress={onLogoPress}
              >
                <TextStyle className="text-foreground">
                  <View className="size-8 items-center justify-center rounded-md">
                    <GalleryVerticalEndIcon size={24} />
                  </View>
                </TextStyle>
              </Pressable>
              <Text role="heading" className="text-center text-xl font-bold">
                Welcome to Acme Inc.
              </Text>
              <View className="flex-row flex-wrap justify-center gap-x-1">
                <FieldDescription>Already have an account?</FieldDescription>
                <CaptionLink onPress={onSignInPress}>Sign in</CaptionLink>
              </View>
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
                returnKeyType="go"
                onSubmitEditing={submit}
              />
            </Field>
            <Field>
              <Button onPress={submit}>Create Account</Button>
            </Field>
            <FieldSeparator>Or</FieldSeparator>
            <Field orientation="responsive" className="gap-4">
              <Button
                variant="outline"
                className="sm:flex-1"
                onPress={onApplePress}
              >
                <AppleIcon />
                Continue with Apple
              </Button>
              <Button
                variant="outline"
                className="sm:flex-1"
                onPress={onGooglePress}
              >
                <GoogleIcon />
                Continue with Google
              </Button>
            </Field>
          </FieldGroup>
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

export { Signup05 }
