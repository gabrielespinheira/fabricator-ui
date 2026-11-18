package dev.fabricator.ui

import kotlin.test.Test
import kotlin.test.assertContentEquals
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class BotFaceAndSoundTest {
    @Test fun sampledContoursInterpolateBetweenDisplayFrames() {
        val first = FabricatorBotFaceFrame(listOf(floatArrayOf(0f, 2f)), listOf(floatArrayOf(4f, 6f)), 0f, 0f, 0f, 0f, 0f)
        val second = FabricatorBotFaceFrame(listOf(floatArrayOf(4f, 6f)), listOf(floatArrayOf(8f, 10f)), 8f, 4f, 2f, 1f, .5f)
        val halfway = interpolateFabricatorBotFace(listOf(first, second), .02, 25f)
        assertContentEquals(floatArrayOf(2f, 4f), halfway.left.first())
        assertEquals(4f, halfway.tilt)
        assertEquals(.5f, halfway.gazeX)
        val loop = interpolateFabricatorBotFace(listOf(first, second), .06, 25f)
        assertContentEquals(halfway.left.first(), loop.left.first())
    }

    @Test fun truncatedContourResourceIsRejected() {
        assertFailsWith<IllegalArgumentException> { decodeFabricatorBotFace(byteArrayOf(1, 2, 3)) }
    }

    @Test fun soundOutputIsDeterministicBoundedAndHasAttackAndRelease() {
        val recipe = FabricatorSoundRecipe("test", "Test", listOf(FabricatorSoundPartial("sine", 440f, 100f, .2f, 440f, 0f, 2f, 20000f)))
        val samples = synthesizeFabricatorSound(recipe, .45f)
        assertContentEquals(samples, synthesizeFabricatorSound(recipe, .45f))
        assertEquals(4411, samples.size)
        assertEquals(0, samples.first().toInt())
        assertEquals(0, samples.last().toInt())
        assertTrue(samples.any { it != 0.toShort() })
        assertTrue(samples.all { kotlin.math.abs(it.toInt()) < 7000 })
    }
}
