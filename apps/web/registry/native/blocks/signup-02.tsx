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

function Signup02({
  onSubmit = noop,
  onLogoPress = noop,
  onGithubPress = noop,
  onSignInPress = noop,
}: {
  onSubmit?: (values: {
    name: string
    email: string
    password: string
    confirmPassword: string
  }) => void
  onLogoPress?: () => void
  onGithubPress?: () => void
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
                    Create your account
                  </Text>
                  <Text className="text-center text-(length:--density-text-14) text-muted-foreground">
                    Fill in the form below to create your account
                  </Text>
                </View>
                <Field data-invalid={isSubmitted && !name}>
                  <FieldLabel>Full Name</FieldLabel>
                  <Input
                    accessibilityLabel="Full Name"
                    placeholder="John Doe"
                    className="bg-background"
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
                    className="bg-background"
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
                    className="bg-background"
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
                    className="bg-background"
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
                <Field>
                  <Button onPress={submit}>Create Account</Button>
                </Field>
                <FieldSeparator>Or continue with</FieldSeparator>
                <Field>
                  <Button variant="outline" onPress={onGithubPress}>
                    <GithubIcon />
                    Sign up with GitHub
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
            </View>
          </View>
        </View>
        <View className="hidden bg-muted sm:flex sm:flex-1" />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

export { Signup02 }
