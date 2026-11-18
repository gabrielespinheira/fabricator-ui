import SwiftUI

private enum FabricatorIcons {
    static let geometries = Dictionary(uniqueKeysWithValues: FabricatorContract.shared.icons.map { ($0.name, $0) })
}

/// Uses the same vendored Fabricator Icons geometry as the web and React Native renderers.
public struct FabricatorIcon: View {
    public var name: String
    public var size: CGFloat
    public var strokeWidth: CGFloat
    public var isFilled: Bool
    public var strokeColor: Color?
    public init(_ name: String, size: CGFloat = 16, strokeWidth: CGFloat = 1.5, isFilled: Bool = false, strokeColor: Color? = nil) { self.name = name; self.size = size; self.strokeWidth = strokeWidth; self.isFilled = isFilled; self.strokeColor = strokeColor }
    public var body: some View {
        Canvas { context, canvas in
            guard let geometry = FabricatorIcons.geometries[name] else { return }
            context.scaleBy(x: canvas.width / 24, y: canvas.height / 24)
            for node in geometry.node {
                let attributes = node.attributes
                let path = makeIconPath(tag: node.tag, attributes: attributes)
                if isFilled || attributes["fill"].map({ $0 != "none" }) == true {
                    context.fill(path, with: .foreground, style: FillStyle(eoFill: attributes["fill-rule"] == "evenodd"))
                }
                if attributes["stroke"] != "none" {
                    context.stroke(path, with: strokeColor.map(GraphicsContext.Shading.color) ?? .foreground, style: StrokeStyle(lineWidth: Double(attributes["stroke-width"] ?? "") ?? strokeWidth, lineCap: .round, lineJoin: .round))
                }
            }
        }.frame(width: size, height: size).accessibilityHidden(true)
    }
}

private func makeIconPath(tag: String, attributes: [String: String]) -> Path {
    func number(_ key: String) -> CGFloat { CGFloat(Double(attributes[key, default: "0"]) ?? 0) }
    switch tag {
    case "path": return SVGPath(attributes["d", default: ""]).path
    case "circle": return Path(ellipseIn: CGRect(x: number("cx") - number("r"), y: number("cy") - number("r"), width: number("r") * 2, height: number("r") * 2))
    case "ellipse": return Path(ellipseIn: CGRect(x: number("cx") - number("rx"), y: number("cy") - number("ry"), width: number("rx") * 2, height: number("ry") * 2))
    case "rect": return Path(roundedRect: CGRect(x: number("x"), y: number("y"), width: number("width"), height: number("height")), cornerRadius: number("rx"))
    case "line": return Path { $0.move(to: CGPoint(x: number("x1"), y: number("y1"))); $0.addLine(to: CGPoint(x: number("x2"), y: number("y2"))) }
    case "polyline", "polygon":
        let values = attributes["points", default: ""].split(whereSeparator: { $0 == "," || $0.isWhitespace }).compactMap { Double($0) }
        return Path { path in
            for index in stride(from: 0, to: max(0, values.count - 1), by: 2) {
                let point = CGPoint(x: values[index], y: values[index + 1])
                if index == 0 { path.move(to: point) } else { path.addLine(to: point) }
            }
            if tag == "polygon" { path.closeSubpath() }
        }
    default: return Path()
    }
}

struct SVGPath {
    var path = Path()
    private var cursor = CGPoint.zero
    private var origin = CGPoint.zero
    private var previousControl = CGPoint.zero
    private var previousCommand = ""
    init(_ source: String) {
        let pattern = "[A-Za-z]|[-+]?(?:[0-9]*\\.)?[0-9]+(?:[eE][-+]?[0-9]+)?"
        guard let expression = try? NSRegularExpression(pattern: pattern) else { return }
        let range = NSRange(source.startIndex..., in: source)
        var tokens = expression.matches(in: source, range: range).compactMap { Range($0.range, in: source).map { String(source[$0]) } }
        var index = 0
        var command = "M"
        while index < tokens.count {
            if tokens[index].first?.isLetter == true { command = tokens[index]; index += 1 }
            let relative = command == command.lowercased()
            let upper = command.uppercased()
            let count = ["M": 2, "L": 2, "H": 1, "V": 1, "C": 6, "S": 4, "Q": 4, "T": 2, "A": 7, "Z": 0][upper] ?? 0
            if upper == "Z" { path.closeSubpath(); cursor = origin; previousCommand = upper; command = "M"; continue }
            if upper == "A" {
                // SVG arc flags are single digits; separators after them are optional.
                for offset in [3, 4] where index + offset < tokens.count {
                    let token = tokens[index + offset]
                    if token.count > 1, let flag = token.first, flag == "0" || flag == "1" {
                        tokens[index + offset] = String(flag)
                        tokens.insert(String(token.dropFirst()), at: index + offset + 1)
                    }
                }
            }
            guard count > 0, index + count <= tokens.count else { break }
            let values = tokens[index..<(index + count)].compactMap(Double.init)
            guard values.count == count else { break }
            index += count
            func point(_ x: Int, _ y: Int) -> CGPoint { CGPoint(x: values[x] + (relative ? cursor.x : 0), y: values[y] + (relative ? cursor.y : 0)) }
            switch upper {
            case "M": cursor = point(0, 1); origin = cursor; path.move(to: cursor); command = relative ? "l" : "L"
            case "L": cursor = point(0, 1); path.addLine(to: cursor)
            case "H": cursor.x = values[0] + (relative ? cursor.x : 0); path.addLine(to: cursor)
            case "V": cursor.y = values[0] + (relative ? cursor.y : 0); path.addLine(to: cursor)
            case "C":
                let first = point(0, 1), second = point(2, 3), end = point(4, 5)
                path.addCurve(to: end, control1: first, control2: second); cursor = end; previousControl = second
            case "S":
                let first = ["C", "S"].contains(previousCommand) ? CGPoint(x: 2 * cursor.x - previousControl.x, y: 2 * cursor.y - previousControl.y) : cursor
                let second = point(0, 1), end = point(2, 3)
                path.addCurve(to: end, control1: first, control2: second); cursor = end; previousControl = second
            case "Q":
                let control = point(0, 1), end = point(2, 3)
                path.addQuadCurve(to: end, control: control); cursor = end; previousControl = control
            case "T":
                let control = ["Q", "T"].contains(previousCommand) ? CGPoint(x: 2 * cursor.x - previousControl.x, y: 2 * cursor.y - previousControl.y) : cursor
                let end = point(0, 1); path.addQuadCurve(to: end, control: control); cursor = end; previousControl = control
            case "A":
                let end = point(5, 6)
                addArc(radiusX: values[0], radiusY: values[1], rotation: values[2], large: values[3] != 0, sweep: values[4] != 0, end: end)
                cursor = end
            default: break
            }
            previousCommand = upper
        }
    }

    private mutating func addArc(radiusX: Double, radiusY: Double, rotation: Double, large: Bool, sweep: Bool, end: CGPoint) {
        var rx = abs(radiusX), ry = abs(radiusY)
        guard rx > 0, ry > 0, cursor != end else { path.addLine(to: end); return }
        let angle = rotation * .pi / 180, cosine = cos(angle), sine = sin(angle)
        let dx = (cursor.x - end.x) / 2, dy = (cursor.y - end.y) / 2
        let px = cosine * dx + sine * dy, py = -sine * dx + cosine * dy
        let scale = px * px / (rx * rx) + py * py / (ry * ry)
        if scale > 1 { rx *= sqrt(scale); ry *= sqrt(scale) }
        let numerator = max(0, rx * rx * ry * ry - rx * rx * py * py - ry * ry * px * px)
        let denominator = rx * rx * py * py + ry * ry * px * px
        let factor = (large == sweep ? -1.0 : 1.0) * sqrt(numerator / max(denominator, .leastNonzeroMagnitude))
        let centerX = factor * rx * py / ry, centerY = -factor * ry * px / rx
        let cx = cosine * centerX - sine * centerY + (cursor.x + end.x) / 2
        let cy = sine * centerX + cosine * centerY + (cursor.y + end.y) / 2
        let ux = (px - centerX) / rx, uy = (py - centerY) / ry
        let vx = (-px - centerX) / rx, vy = (-py - centerY) / ry
        let start = atan2(uy, ux)
        var delta = atan2(ux * vy - uy * vx, ux * vx + uy * vy)
        if !sweep && delta > 0 { delta -= 2 * .pi }
        if sweep && delta < 0 { delta += 2 * .pi }
        let segments = max(1, Int(ceil(abs(delta) / (.pi / 2))))
        let step = delta / Double(segments)
        func transform(_ x: Double, _ y: Double) -> CGPoint { CGPoint(x: cx + rx * cosine * x - ry * sine * y, y: cy + rx * sine * x + ry * cosine * y) }
        for segment in 0..<segments {
            let first = start + Double(segment) * step, last = first + step, control = 4 / 3 * tan(step / 4)
            path.addCurve(to: transform(cos(last), sin(last)), control1: transform(cos(first) - control * sin(first), sin(first) + control * cos(first)), control2: transform(cos(last) + control * sin(last), sin(last) - control * cos(last)))
        }
    }
}
