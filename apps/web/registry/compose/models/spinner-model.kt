package dev.fabricator.ui

data class FabricatorSpinnerDot(val x: Float, val y: Float, val phase: Float, val opacity: Float, val width: Float, val height: Float, val shape: String, val travelX: Float, val travelY: Float)
data class FabricatorSpinnerFrame(val at: Float, val opacity: Float, val scaleX: Float, val scaleY: Float, val translateX: Float, val translateY: Float, val rotation: Float)
data class FabricatorSpinnerDefinition(val value: String, val label: String, val description: String, val dots: List<FabricatorSpinnerDot>, val motion: List<FabricatorSpinnerFrame>)
fun sampleFabricatorSpinner(frames: List<FabricatorSpinnerFrame>, phase: Float): FabricatorSpinnerFrame {
    require(frames.size > 1)
    var previous = frames.first()
    for (next in frames.drop(1)) {
        if (phase > next.at) { previous = next; continue }
        val progress = (phase - previous.at) / (next.at - previous.at)
        fun interpolate(left: Float, right: Float) = left + (right - left) * progress
        return FabricatorSpinnerFrame(phase, interpolate(previous.opacity, next.opacity), interpolate(previous.scaleX, next.scaleX), interpolate(previous.scaleY, next.scaleY), interpolate(previous.translateX, next.translateX), interpolate(previous.translateY, next.translateY), interpolate(previous.rotation, next.rotation))
    }
    return previous
}
