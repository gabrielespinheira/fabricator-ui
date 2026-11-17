package dev.fabricator.ui

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class BlocksAuthTest {
    @Test fun loginAcceptsExistingShortPasswordsWhileSignupRequiresEightCharacters() {
        val values = mapOf("email" to "alex@example.com", "password" to "short", "confirmPassword" to "short", "name" to "Alex")
        assertTrue(validateFabricatorAuthValues(values, "login-01").isEmpty())
        assertEquals(setOf("password"), validateFabricatorAuthValues(values, "signup-01").keys)
    }

    @Test fun signupValidatesOnlyFieldsPresentInItsTemplate() {
        val values = mapOf("email" to "alex@example.com", "password" to "long-password", "confirmPassword" to "long-password")
        assertEquals(setOf("name"), validateFabricatorAuthValues(values, "signup-01").keys)
        assertTrue(validateFabricatorAuthValues(values, "signup-04").isEmpty())
        assertEquals(setOf("email", "name", "password", "confirmPassword"), validateFabricatorAuthValues(mapOf("email" to "bad", "password" to "short", "confirmPassword" to "different"), "signup-02").keys)
    }

    @Test fun emailOnlyTemplatesDoNotRequireHiddenPasswordOrNameFields() {
        val values = mapOf("email" to "alex@example.com")
        assertTrue(validateFabricatorAuthValues(values, "login-05").isEmpty())
        assertTrue(validateFabricatorAuthValues(values, "signup-05").isEmpty())
        assertEquals(setOf("email"), validateFabricatorAuthValues(emptyMap(), "login-05").keys)
    }

    @Test fun surroundingEmailWhitespaceIsIgnoredAndPasswordsRemainLiteral() {
        assertTrue(validateFabricatorAuthValues(mapOf("email" to "  alex@example.com\n", "password" to " "), "login-03").isEmpty())
        assertEquals(setOf("email"), validateFabricatorAuthValues(mapOf("email" to "alex @example.com", "password" to "ok"), "login-03").keys)
    }
}
