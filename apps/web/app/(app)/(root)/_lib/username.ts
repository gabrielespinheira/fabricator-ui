// The homepage Input card's username check.

const TAKEN_USERNAMES = new Set(["ana", "admin"])

const MINIMUM_LENGTH = 3

export function getUsernameError(value: string) {
  const username = value.trim().toLowerCase()
  if (!username) return "Enter a username."
  if (username.length < MINIMUM_LENGTH) {
    return `Use at least ${MINIMUM_LENGTH} characters.`
  }
  if (TAKEN_USERNAMES.has(username)) {
    return "That username is taken. Add a number."
  }
  return undefined
}
