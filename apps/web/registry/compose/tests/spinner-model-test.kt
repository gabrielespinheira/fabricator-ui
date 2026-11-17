package dev.fabricator.ui

import kotlin.test.Test
import kotlin.test.assertEquals

class SpinnerModelTest {
    @Test fun keyframesInterpolateAllMotionChannels() {
        val frames = listOf(FabricatorSpinnerFrame(0f, .2f, .8f, .6f, 0f, 1f, 0f), FabricatorSpinnerFrame(.5f, 1f, 1.2f, 1.4f, 2f, -1f, 180f), FabricatorSpinnerFrame(1f, .2f, .8f, .6f, 0f, 1f, 360f))
        val middle = sampleFabricatorSpinner(frames, .25f)
        assertEquals(.6f, middle.opacity)
        assertEquals(1f, middle.scaleX)
        assertEquals(1f, middle.scaleY)
        assertEquals(1f, middle.translateX)
        assertEquals(0f, middle.translateY)
        assertEquals(90f, middle.rotation)
        assertEquals(270f, sampleFabricatorSpinner(frames, .75f).rotation)
    }
}
