import * as React from "react"
import { GalleryVerticalEndIcon } from "@fabricator-ui/icons-react-native"
import { GithubIcon } from "@fabricator-ui/icons-react-native/brands"
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

function Login02({
  onSubmit = noop,
  onLogoPress = noop,
  onForgotPasswordPress = noop,
  onGithubPress = noop,
  onSignUpPress = noop,
}: {
  onSubmit?: (values: { email: string; password: string }) => void
  onLogoPress?: () => void
  onForgotPasswordPress?: () => void
  onGithubPress?: () => void
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
        contentContainerClassName="grow sm:flex-row"
      >
        <View className="p-safe-offset-6 sm:p-safe-offset-10 flex-1 gap-4">
          <View className="flex-row justify-center gap-2 sm:justify-start">
            <Pressable
              role="link"
              hitSlop={10}
              className="flex-row items-center gap-2 active:opacity-70"
              onPress={onLogoPress}
            >
              <TextStyle className="text-primary-foreground">
                <View className="size-6 items-center justify-center rounded-md bg-primary">
                  <GalleryVerticalEndIcon />
                </View>
              </TextStyle>
              <Text className="font-medium">Acme Inc.</Text>
            </Pressable>
          </View>
          <View className="flex-1 items-center justify-center">
            <View className="w-full max-w-xs">
              <FieldGroup>
                <View className="items-center gap-1">
                  <Text
                    role="heading"
                    className="text-center text-2xl font-bold"
                  >
                    Login to your account
                  </Text>
                  <Text className="text-center text-(length:--density-text-14) text-muted-foreground">
                    Enter your email below to login to your account
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
                <FieldSeparator>Or continue with</FieldSeparator>
                <Field>
                  <Button variant="outline" onPress={onGithubPress}>
                    <GithubIcon />
                    Login with GitHub
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
            </View>
          </View>
        </View>
        <View className="hidden bg-muted sm:flex sm:flex-1" />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

export { Login02 }
