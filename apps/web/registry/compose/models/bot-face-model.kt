package dev.fabricator.ui

import kotlin.math.floor

data class FabricatorBotFaceFrame(val left: List<FloatArray>, val right: List<FloatArray>, val tilt: Float, val pitch: Float, val yaw: Float, val gazeX: Float, val gazeY: Float)
data class FabricatorBotFaceData(val framesPerSecond: Float, val shapes: Map<String, String>, val frames: Map<String, Map<String, List<FabricatorBotFaceFrame>>>)

fun decodeFabricatorBotFace(bytes: ByteArray): FabricatorBotFaceData {
    var position = 0
    fun readInt(): Int { require(position + 4 <= bytes.size); var value = 0; repeat(4) { value = value or ((bytes[position++].toInt() and 255) shl (it * 8)) }; return value }
    fun readFloat(): Float = Float.fromBits(readInt())
    fun readString(): String { val length = readInt(); require(length >= 0 && position + length <= bytes.size); val value = bytes.decodeToString(position, position + length); position += length; return value }
    fun readContours(): List<FloatArray> = List(readInt()) { FloatArray(readInt()) { readFloat() } }
    val rate = readFloat()
    val shapes = List(readInt()) { readString() to readString() }.toMap()
    val frames = List(readInt()) {
        val state = readString()
        state to List(readInt()) {
            val eyes = readString()
            eyes to List(readInt()) { val tilt = readFloat(); val pitch = readFloat(); val yaw = readFloat(); val gazeX = readFloat(); val gazeY = readFloat(); FabricatorBotFaceFrame(readContours(), readContours(), tilt, pitch, yaw, gazeX, gazeY) }
        }.toMap()
    }.toMap()
    require(position == bytes.size)
    return FabricatorBotFaceData(rate, shapes, frames)
}

fun interpolateFabricatorBotFace(frames: List<FabricatorBotFaceFrame>, timeSeconds: Double, framesPerSecond: Float): FabricatorBotFaceFrame {
    require(frames.isNotEmpty())
    val offset = timeSeconds * framesPerSecond
    val whole = floor(offset).toLong()
    val start = frames[(whole % frames.size).toInt()]
    val end = frames[((whole + 1) % frames.size).toInt()]
    val fraction = (offset - whole).toFloat()
    fun interpolate(left: Float, right: Float) = left + (right - left) * fraction
    fun contours(left: List<FloatArray>, right: List<FloatArray>) = left.mapIndexed { contour, points -> FloatArray(points.size) { index -> interpolate(points[index], right[contour][index]) } }
    return FabricatorBotFaceFrame(contours(start.left, end.left), contours(start.right, end.right), interpolate(start.tilt, end.tilt), interpolate(start.pitch, end.pitch), interpolate(start.yaw, end.yaw), interpolate(start.gazeX, end.gazeX), interpolate(start.gazeY, end.gazeY))
}
