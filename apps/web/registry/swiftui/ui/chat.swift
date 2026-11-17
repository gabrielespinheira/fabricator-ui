import SwiftUI
import UniformTypeIdentifiers

public struct FabricatorAttachment: View {
    @Environment(\.fabricatorTheme) private var theme
    public var name: String
    public var detail: String?
    public var onRemove: (() -> Void)?
    public init(_ name: String, detail: String? = nil, onRemove: (() -> Void)? = nil) { self.name = name; self.detail = detail; self.onRemove = onRemove }
    public var body: some View {
        HStack(spacing: 10) { FabricatorIcon("file-text", size: 20).foregroundStyle(theme.color("muted-foreground")); VStack(alignment: .leading, spacing: 2) { Text(name).font(theme.font(theme.text(12), weight: .medium)).lineLimit(1); if let detail { Text(detail).font(theme.font(10)).foregroundStyle(theme.color("muted-foreground")) } }; if let onRemove { FabricatorButton("Remove \(name)", icon: "x", variant: .ghost, size: .iconXs, action: onRemove) } }.padding(10).background(theme.color("wash"), in: RoundedRectangle(cornerRadius: theme.radius())).overlay { RoundedRectangle(cornerRadius: theme.radius()).strokeBorder(theme.color("border"), lineWidth: 0.5) }
    }
}
public struct FabricatorBubble<Content: View>: View {
    @Environment(\.fabricatorTheme) private var theme
    public var isOutgoing: Bool
    private var content: Content
    public init(isOutgoing: Bool = false, @ViewBuilder content: () -> Content) { self.isOutgoing = isOutgoing; self.content = content() }
    public var body: some View { content.padding(12).foregroundStyle(theme.color("foreground")).background(isOutgoing ? theme.color("hover") : .clear, in: RoundedRectangle(cornerRadius: theme.radius("xl"))) }
}
public struct FabricatorChatMessage: Identifiable, Sendable, Equatable {
    public var id: String
    public var author: String
    public var content: String
    public var isOutgoing: Bool
    public var date: Date
    public init(id: String = UUID().uuidString, author: String, content: String, isOutgoing: Bool = false, date: Date = .now) { self.id = id; self.author = author; self.content = content; self.isOutgoing = isOutgoing; self.date = date }
}
public struct FabricatorMessage: View {
    @Environment(\.fabricatorTheme) private var theme
    public var message: FabricatorChatMessage
    public init(_ message: FabricatorChatMessage) { self.message = message }
    public var body: some View {
        HStack(alignment: .top, spacing: 10) {
            if !message.isOutgoing { FabricatorBotFace(size: 28) }
            VStack(alignment: message.isOutgoing ? .trailing : .leading, spacing: 4) {
                HStack(spacing: 6) { Text(message.author).font(theme.font(11, weight: .medium)); Text(message.date.formatted(date: .omitted, time: .shortened)).font(theme.font(10)).foregroundStyle(theme.color("muted-foreground")) }
                FabricatorBubble(isOutgoing: message.isOutgoing) { FabricatorMarkdown(message.content) }
            }
            if message.isOutgoing { FabricatorAvatar(message.author, size: 28) }
        }.frame(maxWidth: .infinity, alignment: message.isOutgoing ? .trailing : .leading).padding(.vertical, 8)
    }
}
public struct FabricatorMessageScroller: View {
    public var messages: [FabricatorChatMessage]
    public init(_ messages: [FabricatorChatMessage]) { self.messages = messages }
    public var body: some View { ScrollViewReader { reader in ScrollView { LazyVStack(spacing: 8) { ForEach(messages) { message in FabricatorMessage(message).id(message.id) } }.padding(16) }.defaultScrollAnchor(.bottom).onChange(of: messages.count) { _, _ in if let id = messages.last?.id { reader.scrollTo(id, anchor: .bottom) } } } }
}
public struct FabricatorChatInput: View {
    @Environment(\.fabricatorTheme) private var theme
    @Binding public var text: String
    @Binding public var attachments: [URL]
    public var isGenerating: Bool
    public var onSend: () -> Void
    public var onStop: () -> Void
    @State private var isImporting = false
    public init(text: Binding<String>, attachments: Binding<[URL]>, isGenerating: Bool = false, onSend: @escaping () -> Void, onStop: @escaping () -> Void = {}) { _text = text; _attachments = attachments; self.isGenerating = isGenerating; self.onSend = onSend; self.onStop = onStop }
    public var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            if !attachments.isEmpty { FabricatorFlowLayout { ForEach(attachments, id: \.self) { file in FabricatorAttachment(file.lastPathComponent) { attachments.removeAll { $0 == file } } } } }
            TextField("Ask anything…", text: $text, axis: .vertical).textFieldStyle(.plain).lineLimit(2...6).onSubmit(send)
            HStack { FabricatorButton("Attach a file", icon: "paperclip", variant: .ghost, size: .iconSm) { isImporting = true }; Spacer(); Text(isGenerating ? "Generating…" : "Return to send").font(theme.font(10)).foregroundStyle(theme.color("muted-foreground")); FabricatorButton(isGenerating ? "Stop generating" : "Send message", icon: isGenerating ? "square" : "arrow-up", size: .iconSm, action: isGenerating ? onStop : send).disabled(!isGenerating && text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && attachments.isEmpty) }
        }.padding(12).fabricatorSurface().overlay { RoundedRectangle(cornerRadius: theme.radius("xl")).strokeBorder(theme.color("border"), lineWidth: 0.5) }.fileImporter(isPresented: $isImporting, allowedContentTypes: [.data], allowsMultipleSelection: true) { result in if case .success(let files) = result { attachments.append(contentsOf: files) } }
    }
    private func send() { if !isGenerating && (!text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || !attachments.isEmpty) { onSend() } }
}
public struct FabricatorModelPicker: View {
    public var models: [String]
    @Binding public var selection: String
    public init(_ models: [String], selection: Binding<String>) { self.models = models; _selection = selection }
    public var body: some View { FabricatorSelect("Choose a model", options: models, selection: $selection) }
}
public struct FabricatorMarker: View {
    @Environment(\.fabricatorTheme) private var theme
    public var title: String
    public init(_ title: String) { self.title = title }
    public var body: some View { HStack(spacing: 12) { FabricatorSeparator(); Text(title).font(theme.font(10)).foregroundStyle(theme.color("muted-foreground")).fixedSize(); FabricatorSeparator() }.padding(.vertical, 12) }
}
public struct FabricatorQuestionnaire: View {
    @Environment(\.fabricatorTheme) private var theme
    public var questions: [FabricatorQuestion]
    @Binding public var state: FabricatorQuestionnaireState
    public var onComplete: ([String: String]) -> Void
    public init(_ questions: [FabricatorQuestion], state: Binding<FabricatorQuestionnaireState>, onComplete: @escaping ([String: String]) -> Void = { _ in }) { self.questions = questions; _state = state; self.onComplete = onComplete }
    public var body: some View {
        if state.isComplete { FabricatorAlert("Thanks for your answers", message: "Your preferences are ready.", variant: .success, icon: "circle-check") }
        else if questions.indices.contains(state.index) {
            let question = questions[state.index]
            VStack(alignment: .leading, spacing: 16) {
                HStack { Text("Question \(state.index + 1) of \(questions.count)").font(theme.font(11)).foregroundStyle(theme.color("muted-foreground")); Spacer(); FabricatorBadge(question.isRequired ? "Required" : "Optional", variant: .outline) }
                Text(question.title).font(theme.font(16, weight: .medium))
                FabricatorRadioGroup(question.options, selection: Binding(get: { state.answers[question.id, default: ""] }, set: { state.answers[question.id] = $0 }))
                FabricatorProgress(value: Double(state.index) / Double(max(1, questions.count)))
                HStack { FabricatorButton("Back", variant: .outline) { state.back() }.disabled(state.index == 0); Spacer(); FabricatorButton(state.index == questions.count - 1 ? "Complete" : "Continue", icon: "arrow-right") { if state.advance(questions: questions), state.isComplete { onComplete(state.answers) } }.disabled(question.isRequired && state.answers[question.id, default: ""].isEmpty) }
            }
        }
    }
}

public enum FabricatorBotFaceState: String, CaseIterable, Sendable { case idle, listening, thinking, working, speaking, happy, sad, questioning, awaitingPermission = "awaiting-permission", error }
public enum FabricatorBotFaceShape: String, CaseIterable, Sendable { case circle, blob, square, star, clover, heart, flower, droplet, pill, triangle, pentagon, burst, hexagon, squircle }
public enum FabricatorBotFaceEyes: String, CaseIterable, Sendable { case slant, dots, square }
struct FabricatorBotFaceFrame: Decodable, Sendable {
    var left: [[Double]]; var right: [[Double]]; var tilt: Double; var pitch: Double; var yaw: Double; var gazeX: Double; var gazeY: Double
    func interpolate(to next: Self, progress: Double) -> Self {
        func blend(_ first: Double, _ last: Double) -> Double { first + (last - first) * progress }
        return Self(left: zip(left, next.left).map { interpolateEyeContour($0, $1, progress: progress) }, right: zip(right, next.right).map { interpolateEyeContour($0, $1, progress: progress) }, tilt: blend(tilt, next.tilt), pitch: blend(pitch, next.pitch), yaw: blend(yaw, next.yaw), gazeX: blend(gazeX, next.gazeX), gazeY: blend(gazeY, next.gazeY))
    }
}
private func interpolateEyeContour(_ first: [Double], _ last: [Double], progress: Double) -> [Double] {
    if first.count == last.count { return zip(first, last).map { $0 + ($1 - $0) * progress } }
    func sample(_ contour: [Double]) -> [CGPoint] {
        guard contour.count >= 8 else { return Array(repeating: .zero, count: 48) }
        var points = [CGPoint(x: contour[0], y: contour[1])], distances = [0.0], current = points[0], length = 0.0
        for index in stride(from: 2, through: contour.count - 6, by: 6) {
            let first = CGPoint(x: contour[index], y: contour[index + 1]), second = CGPoint(x: contour[index + 2], y: contour[index + 3]), end = CGPoint(x: contour[index + 4], y: contour[index + 5])
            for step in 1...8 {
                let time = Double(step) / 8, inverse = 1 - time
                let a = pow(inverse, 3), b = 3 * inverse * inverse * time, c = 3 * inverse * time * time, d = time * time * time
                let point = CGPoint(x: current.x * a + first.x * b + second.x * c + end.x * d, y: current.y * a + first.y * b + second.y * c + end.y * d)
                let previous = points[points.count - 1]; length += hypot(point.x - previous.x, point.y - previous.y); points.append(point); distances.append(length)
            }
            current = end
        }
        var cursor = 1
        return (0..<48).map { index in
            guard length > 0.000001 else { return points[0] }
            let distance = Double(index) * length / 48
            while cursor < distances.count - 1 && distances[cursor] < distance { cursor += 1 }
            let span = distances[cursor] - distances[cursor - 1], fraction = span > 0 ? (distance - distances[cursor - 1]) / span : 0
            return CGPoint(x: points[cursor - 1].x + (points[cursor].x - points[cursor - 1].x) * fraction, y: points[cursor - 1].y + (points[cursor].y - points[cursor - 1].y) * fraction)
        }
    }
    let from = sample(first), to = sample(last)
    let points = zip(from, to).map { CGPoint(x: $0.x + ($1.x - $0.x) * progress, y: $0.y + ($1.y - $0.y) * progress) }
    var contour = [points[0].x, points[0].y]
    for index in points.indices {
        let previous = points[(index + 47) % 48], current = points[index], next = points[(index + 1) % 48], after = points[(index + 2) % 48]
        contour.append(contentsOf: [current.x + (next.x - previous.x) / 6, current.y + (next.y - previous.y) / 6, next.x - (after.x - current.x) / 6, next.y - (after.y - current.y) / 6, next.x, next.y])
    }
    return contour.map(Double.init)
}
struct FabricatorBotFaceContract: Decodable, Sendable {
    var shapes: [String: String]
    var frames: [String: [String: [FabricatorBotFaceFrame]]]
    var framesPerSecond: Double
    static let shared: Self = {
        #if SWIFT_PACKAGE
        let bundle = Bundle.module
        #else
        let bundle = Bundle.main
        #endif
        guard let url = bundle.url(forResource: "bot-face", withExtension: "json") else { preconditionFailure("Fabricator Bot Face geometry is missing") }
        do { return try JSONDecoder().decode(Self.self, from: Data(contentsOf: url)) } catch { preconditionFailure("Invalid Bot Face geometry: \(error)") }
    }()
    func frame(state: FabricatorBotFaceState, eyes: FabricatorBotFaceEyes, elapsed: Double) -> FabricatorBotFaceFrame? {
        guard let frames = frames[state.rawValue]?[eyes.rawValue], !frames.isEmpty else { return nil }
        let position = max(0, elapsed) * framesPerSecond, index = Int(position) % frames.count
        return frames[index].interpolate(to: frames[(index + 1) % frames.count], progress: position - floor(position))
    }
}
public struct FabricatorBotFace: View {
    @Environment(\.fabricatorTheme) private var theme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.scenePhase) private var scenePhase
    @State private var start = Date.now
    @State private var pointerGaze: CGPoint?
    @State private var transitionOrigin: FabricatorBotFaceFrame?
    public var state: FabricatorBotFaceState
    public var shape: FabricatorBotFaceShape
    public var eyes: FabricatorBotFaceEyes
    public var color: String
    public var size: CGFloat
    public var animated: Bool
    public var blink: Bool
    public var followPointer: Bool
    public var gaze: CGPoint?
    public init(state: FabricatorBotFaceState = .idle, shape: FabricatorBotFaceShape = .squircle, eyes: FabricatorBotFaceEyes = .slant, color: String = "primary", size: CGFloat = 80, animated: Bool = true, blink: Bool = true, followPointer: Bool = true, gaze: CGPoint? = nil) { self.state = state; self.shape = shape; self.eyes = eyes; self.color = color; self.size = size; self.animated = animated; self.blink = blink; self.followPointer = followPointer; self.gaze = gaze }
    private var isMoving: Bool { animated && !reduceMotion && theme.hasContinuousMotion && scenePhase == .active }
    public var body: some View {
        TimelineView(.animation(minimumInterval: 1 / 60, paused: !isMoving)) { timeline in
            let contract = FabricatorBotFaceContract.shared
            let elapsed = isMoving ? max(0, timeline.date.timeIntervalSince(start)) : 0
            let target = contract.frame(state: state, eyes: eyes, elapsed: elapsed)
            let frame = target.map { next in transitionOrigin.map { $0.interpolate(to: next, progress: theme.motionProgress("move", elapsed: elapsed)) } ?? next }
            Canvas { context, canvas in
                context.scaleBy(x: canvas.width / 100, y: canvas.height / 100)
                let fill = color.hasPrefix("#") ? Color(fabricatorLiteral: color) : theme.color("bot-face-\(color)-fill")
                context.fill(SVGPath(contract.shapes[shape.rawValue, default: ""]).path, with: .color(fill))
                context.translateBy(x: 50, y: 50); context.rotate(by: .degrees(frame?.tilt ?? 0)); context.scaleBy(x: cos((frame?.yaw ?? 0) * .pi / 180), y: cos((frame?.pitch ?? 0) * .pi / 180)); context.translateBy(x: -50, y: -50)
                let eyeColor = color.hasPrefix("#") ? Color(fabricatorLiteral: contrastInk(for: color)) : theme.color("bot-face-\(color)-eyes")
                let attention = gaze ?? (followPointer ? pointerGaze : nil) ?? CGPoint(x: frame?.gazeX ?? 0, y: frame?.gazeY ?? 0)
                let length = max(1, hypot(attention.x, attention.y))
                context.translateBy(x: attention.x / length * 6, y: attention.y / length * 6)
                let phase = (elapsed * 1000).truncatingRemainder(dividingBy: 4700)
                let opening = !isMoving || !blink || phase < 3200 || phase > 3380 || state == .speaking || state == .error ? 1 : max(0.08, abs(phase - 3280) / (phase < 3280 ? 80 : 100))
                context.translateBy(x: 0, y: 50); context.scaleBy(x: 1, y: opening); context.translateBy(x: 0, y: -50)
                for contour in (frame?.left ?? []) + (frame?.right ?? []) {
                    guard contour.count >= 8 else { continue }
                    var path = Path(); path.move(to: CGPoint(x: contour[0], y: contour[1]))
                    for index in stride(from: 2, through: contour.count - 6, by: 6) { path.addCurve(to: CGPoint(x: contour[index + 4], y: contour[index + 5]), control1: CGPoint(x: contour[index], y: contour[index + 1]), control2: CGPoint(x: contour[index + 2], y: contour[index + 3])) }; path.closeSubpath(); context.fill(path, with: .color(eyeColor))
                }
            }
        }.frame(width: size, height: size).onChange(of: state) { old, _ in
            let elapsed = Date.now.timeIntervalSince(start)
            let target = FabricatorBotFaceContract.shared.frame(state: old, eyes: eyes, elapsed: elapsed)
            transitionOrigin = isMoving ? target.map { next in transitionOrigin.map { $0.interpolate(to: next, progress: theme.motionProgress("move", elapsed: elapsed)) } ?? next } : nil
            start = .now
        }.onContinuousHover { phase in
            guard isMoving, followPointer else { pointerGaze = nil; return }
            if case .active(let point) = phase { pointerGaze = CGPoint(x: (point.x - size / 2) / (size * 1.5), y: (point.y - size / 2) / (size * 1.5)) } else { pointerGaze = nil }
        }.gesture(DragGesture(minimumDistance: 0).onChanged { value in
            guard isMoving, followPointer else { return }
            pointerGaze = CGPoint(x: (value.location.x - size / 2) / (size * 1.5), y: (value.location.y - size / 2) / (size * 1.5))
        }.onEnded { _ in pointerGaze = nil }).accessibilityLabel("Assistant \(state.rawValue)")
    }
}
private func contrastInk(for hex: String) -> String {
    var text = String(hex.dropFirst())
    if text.count == 3 || text.count == 4 { text = text.map { "\($0)\($0)" }.joined() }
    guard let value = UInt64(text.prefix(6), radix: 16) else { return "#000000" }
    let shifts = [16, 8, 0]
    let srgb = shifts.map { shift in Double((value >> shift) & 0xff) / 255.0 }
    let channels = srgb.map { channel -> Double in
        if channel <= 0.04045 { return channel / 12.92 }
        return pow((channel + 0.055) / 1.055, 2.4)
    }
    let luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
    return (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05) ? "#000000" : "#ffffff"
}
