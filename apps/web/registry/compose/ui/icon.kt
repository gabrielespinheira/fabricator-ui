package dev.fabricator.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathFillType
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Fill
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Dp
import dev.fabricator.ui.generated.FabricatorGenerated

data class FabricatorIconNode(val tag: String, val attributes: Map<String, String>)

@Composable
fun FabricatorIcon(
    name: String, modifier: Modifier = Modifier, description: String? = null,
    color: Color = LocalFabricatorTheme.current.color("foreground"),
    size: Dp = LocalFabricatorTheme.current.icon(), strokeWidth: Float = 1.5f, fillColor: Color? = null,
) {
    val nodes = requireNotNull(FabricatorGenerated.icon(name)) { "Unknown Fabricator icon: $name" }
    Canvas(modifier.size(size).semantics { if (description != null) contentDescription = description }) {
        scale(this.size.width / 24f, this.size.height / 24f, pivot = Offset.Zero) {
            for ((tag, attributes) in nodes) {
                fun number(name: String, default: Float = 0f) = attributes[name]?.toFloat() ?: default
                val tint = color.copy(alpha = color.alpha * number("opacity", 1f))
                val style = if (attributes["fill"] != null && attributes["fill"] != "none") Fill else Stroke(number("stroke-width", strokeWidth), cap = StrokeCap.Round, join = StrokeJoin.Round)
                when (tag) {
                    "path" -> { val path = PathParser().parsePathString(attributes.getValue("d")).toPath().apply { if (attributes["fill-rule"] == "evenodd") fillType = PathFillType.EvenOdd }; if (fillColor != null) drawPath(path, fillColor); drawPath(path, tint, style = style) }
                    "circle" -> drawCircle(tint, number("r"), Offset(number("cx"), number("cy")), style = style)
                    "ellipse" -> drawOval(tint, Offset(number("cx") - number("rx"), number("cy") - number("ry")), Size(number("rx") * 2, number("ry") * 2), style = style)
                    "rect" -> drawRoundRect(tint, Offset(number("x"), number("y")), Size(number("width"), number("height")), CornerRadius(number("rx"), number("ry", number("rx"))), style = style)
                    "line" -> drawLine(tint, Offset(number("x1"), number("y1")), Offset(number("x2"), number("y2")), number("stroke-width", strokeWidth), StrokeCap.Round)
                    "polygon", "polyline" -> {
                        val points = attributes.getValue("points").trim().split(Regex("[\\s,]+")).map(String::toFloat)
                        val path = Path().apply {
                            for (index in points.indices step 2) if (index == 0) moveTo(points[index], points[index + 1]) else lineTo(points[index], points[index + 1])
                            if (tag == "polygon") close()
                        }
                        drawPath(path, tint, style = style)
                    }
                    else -> error("Unsupported Fabricator icon primitive: $tag")
                }
            }
        }
    }
}
