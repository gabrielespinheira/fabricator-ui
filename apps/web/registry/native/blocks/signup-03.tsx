import * as React from "react"
import { GalleryVerticalEndIcon } from "@fabricator-ui/icons-react-native"
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

function Signup03({
  onSubmit = noop,
  onLogoPress = noop,
  onSignInPress = noop,
  onTermsPress = noop,
  onPrivacyPress = noop,
}: {
  onSubmit?: (values: {
    name: string
    email: string
    password: string
    confirmPassword: string
  }) => void
  onLogoPress?: () => void
  onSignInPress?: () => void
  onTermsPress?: () => void
  onPrivacyPress?: () => void
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
                Create your account
              </CardTitle>
              <CardDescription className="text-center">
                Enter your email below to create your account
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
                </Field>
                <Field>
                  <Field
                    orientation="responsive"
                    className="gap-4 sm:items-start"
                  >
                    <Field
                      data-invalid={isSubmitted && !password}
                      className="sm:flex-1"
                    >
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
                        onSubmitEditing={() =>
                          confirmPasswordRef.current?.focus()
                        }
                      />
                    </Field>
                    <Field
                      data-invalid={isSubmitted && !confirmPassword}
                      className="sm:flex-1"
                    >
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
                    </Field>
                  </Field>
                  <FieldDescription>
                    Must be at least 8 characters long.
                  </FieldDescription>
                </Field>
                <Field>
                  <Button onPress={submit}>Create Account</Button>
                  {/* Clears the button above, so the link's target stays off it. */}
                  <View className="mt-2 flex-row flex-wrap justify-center gap-x-1">
                    <FieldDescription>
                      Already have an account?
                    </FieldDescription>
                    <CaptionLink onPress={onSignInPress}>Sign in</CaptionLink>
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

export { Signup03 }
