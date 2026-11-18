import SwiftUI
import UniformTypeIdentifiers

public struct FabricatorField<Content: View>: View {
    @Environment(\.fabricatorTheme) private var theme
    public var label: String
    public var description: String?
    public var error: String?
    private var content: Content
    public init(_ label: String, description: String? = nil, error: String? = nil, @ViewBuilder content: () -> Content) { self.label = label; self.description = description; self.error = error; self.content = content() }
    public var body: some View {
        VStack(alignment: .leading, spacing: theme.space(6)) {
            Text(label).modifier(FabricatorTextMetrics(size: theme.text(), weight: .medium, lineHeight: 1.375))
            content
            if let error { Text(error).foregroundStyle(theme.color("destructive-text")).font(theme.font(theme.text(12))).accessibilityLabel("Error: \(error)") }
            else if let description { Text(description).font(theme.font(theme.text(12))).foregroundStyle(theme.color("muted-foreground")) }
        }.accessibilityElement(children: .contain)
    }
}

public struct FabricatorFieldGroup<Content: View>: View {
    @Environment(\.fabricatorTheme) private var theme
    private var content: Content
    public init(@ViewBuilder content: () -> Content) { self.content = content() }
    public var body: some View { VStack(alignment: .leading, spacing: theme.space(20)) { content } }
}

public struct FabricatorForm<Content: View>: View {
    public var submitLabel: String
    public var validate: () -> Bool
    public var onSubmit: () -> Void
    private var content: Content
    public init(submitLabel: String = "Save changes", validate: @escaping () -> Bool = { true }, onSubmit: @escaping () -> Void, @ViewBuilder content: () -> Content) {
        self.submitLabel = submitLabel; self.validate = validate; self.onSubmit = onSubmit; self.content = content()
    }
    public var body: some View {
        FabricatorFieldGroup {
            content
            FabricatorButton(submitLabel) { if validate() { onSubmit() } }.keyboardShortcut(.defaultAction)
        }.onSubmit { if validate() { onSubmit() } }
    }
}

public struct FabricatorInputGroup<Leading: View, Trailing: View>: View {
    @Environment(\.fabricatorTheme) private var theme
    @Binding public var text: String
    public var placeholder: String
    private var leading: Leading
    private var trailing: Trailing
    public init(_ placeholder: String, text: Binding<String>, @ViewBuilder leading: () -> Leading, @ViewBuilder trailing: () -> Trailing) { self.placeholder = placeholder; _text = text; self.leading = leading(); self.trailing = trailing() }
    public var body: some View {
        HStack(spacing: theme.space(8)) { leading.foregroundStyle(theme.color("muted-foreground")); TextField(placeholder, text: $text, prompt: Text(placeholder).foregroundStyle(theme.color("muted-foreground"))).textFieldStyle(.plain); trailing }
            .modifier(FabricatorInputFrame(isFocused: false, isInvalid: false))
    }
}

public struct FabricatorButtonGroup<Content: View>: View {
    @Environment(\.fabricatorTheme) private var theme
    private var content: Content
    public init(@ViewBuilder content: () -> Content) { self.content = content() }
    public var body: some View { HStack(spacing: 1) { content }.padding(1).background(theme.color("border"), in: RoundedRectangle(cornerRadius: theme.radius())) }
}

struct FabricatorHuggingScroll<Content: View>: View {
    var maxHeight: CGFloat
    var content: Content
    @State private var contentHeight: CGFloat = 0
    init(maxHeight: CGFloat, @ViewBuilder content: () -> Content) { self.maxHeight = maxHeight; self.content = content() }
    var body: some View {
        ScrollView {
            content.background {
                GeometryReader { proxy in
                    Color.clear.onAppear { contentHeight = proxy.size.height }.onChange(of: proxy.size.height) { _, height in contentHeight = height }
                }
            }
        }.frame(height: min(maxHeight, contentHeight)).scrollBounceBehavior(.basedOnSize)
    }
}

public struct FabricatorSelect: View {
    @Environment(\.fabricatorTheme) private var theme
    @State private var isPresented = false
    @State private var query = ""
    public var placeholder: String
    public var options: [String]
    public var isSearchable: Bool
    public var groupLabel: String?
    public var disabledOptions: Set<String>
    var labelWeight = Font.Weight.regular
    var triggerDensity: FabricatorDensity?
    var minimumPopupWidth: CGFloat?
    var maximumPopupHeight: CGFloat = 260
    @Binding public var selection: String
    public init(_ placeholder: String, options: [String], selection: Binding<String>, isSearchable: Bool = false, groupLabel: String? = nil, disabledOptions: Set<String> = []) { self.placeholder = placeholder; self.options = options; _selection = selection; self.isSearchable = isSearchable; self.groupLabel = groupLabel; self.disabledOptions = disabledOptions }
    private var filteredOptions: [String] { options.filter { query.isEmpty || $0.localizedCaseInsensitiveContains(query) } }
    private var popupWidth: CGFloat { minimumPopupWidth ?? (isSearchable ? 220 : 144) }
    private var triggerTheme: FabricatorTheme { var copy = theme; if let triggerDensity { copy.density = triggerDensity }; return copy }
    public var body: some View {
        Button { isPresented.toggle() } label: {
            FabricatorSelectLabel(text: selection.isEmpty ? placeholder : selection, isPlaceholder: selection.isEmpty, weight: labelWeight, isPresented: isPresented).environment(\.fabricatorTheme, triggerTheme)
        }.buttonStyle(.plain).accessibilityLabel(placeholder).accessibilityValue(selection)
            .fabricatorPopup(isPresented: $isPresented, minimumWidth: popupWidth) {
                VStack(spacing: theme.space(4)) {
                    if isSearchable { FabricatorInput("Search options…", text: $query, icon: "search") }
                    if let groupLabel { Text(groupLabel).font(theme.font(theme.text(12))).foregroundStyle(theme.color("muted-foreground")).padding(.horizontal, theme.space(8)).padding(.vertical, theme.space(6)).frame(maxWidth: .infinity, alignment: .leading) }
                    if filteredOptions.isEmpty { Text("No options found.").font(theme.bodyFont).foregroundStyle(theme.color("muted-foreground")).padding(theme.space(16)) }
                    ScrollViewReader { proxy in
                    FabricatorHuggingScroll(maxHeight: maximumPopupHeight) {
                        VStack(spacing: 0) {
                            ForEach(filteredOptions, id: \.self) { option in
                                let isSelected = selection == option
                                Button { selection = option; isPresented = false; query = "" } label: {
                                    HStack(spacing: theme.space(8)) {
                                        Text(option).font(theme.font(theme.text(), weight: isSelected ? .semibold : .regular)).lineLimit(1)
                                        Spacer(minLength: 0)
                                        if isSelected { FabricatorIcon("check", size: theme.icon()).foregroundStyle(theme.color("foreground")) }
                                    }.foregroundStyle(theme.color(isSelected ? "foreground" : "muted-foreground")).padding(.leading, theme.space(8)).padding(.trailing, theme.space(8)).frame(maxWidth: .infinity, minHeight: theme.controlHeight, alignment: .leading).background(isSelected ? theme.color("active") : .clear, in: RoundedRectangle(cornerRadius: theme.radius())).contentShape(Rectangle())
                                }.buttonStyle(.plain).disabled(disabledOptions.contains(option)).opacity(disabledOptions.contains(option) ? 0.5 : 1).accessibilityAddTraits(isSelected ? .isSelected : []).id(option)
                            }
                        }
                    }.accessibilityIdentifier("fabricator-select-options").task { if filteredOptions.contains(selection) { await Task.yield(); proxy.scrollTo(selection, anchor: .center) } }
                    }
                }.padding(theme.space(4)).frame(minWidth: popupWidth).fabricatorSurface(radius: "xl", elevation: "surface-3", fill: theme.color("surface-3"))
            }.onChange(of: isPresented) { _, presented in if !presented { query = "" } }
    }
}

private struct FabricatorSelectLabel: View {
    @Environment(\.fabricatorTheme) private var theme
    var text: String
    var isPlaceholder: Bool
    var weight: Font.Weight
    var isPresented: Bool
    var body: some View {
        HStack(spacing: theme.space(8)) {
            Text(text).font(theme.font(theme.text(), weight: weight)).foregroundStyle(theme.color(isPlaceholder ? "muted-foreground" : "foreground")).lineLimit(1)
            Spacer(minLength: 0)
            FabricatorIcon("chevron-down", size: theme.icon()).foregroundStyle(theme.color("muted-foreground"))
        }.modifier(FabricatorInputFrame(isFocused: isPresented, isInvalid: false))
    }
}

public struct FabricatorCombobox: View {
    public var options: [String]
    @Binding public var selection: String
    public var placeholder: String
    public init(_ placeholder: String = "Select an option…", options: [String], selection: Binding<String>) { self.placeholder = placeholder; self.options = options; _selection = selection }
    public var body: some View { FabricatorSelect(placeholder, options: options, selection: $selection, isSearchable: true) }
}

public struct FabricatorSearch: View {
    @Binding public var query: String
    public var placeholder: String
    public init(_ placeholder: String = "Search…", query: Binding<String>) { self.placeholder = placeholder; _query = query }
    public var body: some View {
        FabricatorInputGroup(placeholder, text: $query) { FabricatorIcon("search") } trailing: {
            if !query.isEmpty { FabricatorButton("Clear search", icon: "x", variant: .ghost, size: .iconXs) { query = "" } }
        }
    }
}

public struct FabricatorMultiSelect: View {
    @Environment(\.fabricatorTheme) private var theme
    @State private var isPresented = false
    @State private var query = ""
    public var options: [String]
    @Binding public var selection: FabricatorSelection
    public var placeholder: String
    public init(_ placeholder: String = "Select options…", options: [String], selection: Binding<FabricatorSelection>) { self.placeholder = placeholder; self.options = options; _selection = selection }
    public var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Button { isPresented.toggle() } label: {
                HStack(spacing: theme.space(8)) { Text(selection.values.isEmpty ? placeholder : selection.values.joined(separator: ", ")).foregroundStyle(theme.color(selection.values.isEmpty ? "muted-foreground" : "foreground")).lineLimit(1); Spacer(minLength: 0); FabricatorIcon("chevron-down", size: theme.icon()).foregroundStyle(theme.color("muted-foreground")) }.modifier(FabricatorInputFrame(isFocused: isPresented, isInvalid: false))
            }.buttonStyle(.plain).accessibilityLabel(placeholder).accessibilityValue(selection.values.joined(separator: ", "))
            if !selection.values.isEmpty {
                FabricatorFlowLayout(spacing: 6) { ForEach(selection.values, id: \.self) { value in Button { selection.toggle(value) } label: { FabricatorBadge(value, icon: "x") }.buttonStyle(.plain).accessibilityLabel("Remove \(value)") } }
            }
        }.fabricatorPopup(isPresented: $isPresented) {
            VStack(alignment: .leading, spacing: theme.space(4)) {
                FabricatorSearch(query: $query)
                ForEach(options.filter { query.isEmpty || $0.localizedCaseInsensitiveContains(query) }, id: \.self) { option in
                    FabricatorCheckbox(option, isOn: Binding(get: { selection.values.contains(option) }, set: { _ in selection.toggle(option) }))
                        .disabled(!selection.values.contains(option) && selection.maximum.map { selection.values.count >= $0 } == true)
                }
            }.padding(theme.space(8)).frame(minWidth: 240).fabricatorSurface(radius: "xl", elevation: "surface-3", fill: theme.color("surface-3"))
        }
    }
}

public struct FabricatorNumberField: View {
    @Binding public var value: Double
    public var range: ClosedRange<Double>
    public var step: Double
    public var label: String
    public init(_ label: String, value: Binding<Double>, in range: ClosedRange<Double> = 0...100, step: Double = 1) { self.label = label; _value = value; self.range = range; self.step = step }
    public var body: some View {
        HStack(spacing: 0) {
            FabricatorButton("Decrease \(label)", icon: "minus", variant: .ghost, size: .icon) { value = max(range.lowerBound, value - step) }.disabled(value <= range.lowerBound)
            TextField(label, value: $value, format: .number).textFieldStyle(.plain).multilineTextAlignment(.center).onChange(of: value) { _, next in value = min(range.upperBound, max(range.lowerBound, next)) }
            FabricatorButton("Increase \(label)", icon: "plus", variant: .ghost, size: .icon) { value = min(range.upperBound, value + step) }.disabled(value >= range.upperBound)
        }.modifier(FabricatorInputFrame(isFocused: false, isInvalid: false)).accessibilityElement(children: .contain).accessibilityLabel(label)
    }
}

public struct FabricatorInputOTP: View {
    @Environment(\.fabricatorTheme) private var theme
    @FocusState private var isFocused: Bool
    @Binding public var code: String
    public var length: Int
    public var onComplete: (String) -> Void
    public init(code: Binding<String>, length: Int = 6, onComplete: @escaping (String) -> Void = { _ in }) { _code = code; self.length = length; self.onComplete = onComplete }
    public var body: some View {
        ZStack {
            HStack(spacing: 6) {
                ForEach(0..<max(1, length), id: \.self) { index in
                    Text(index < code.count ? String(Array(code)[index]) : "").font(theme.font(theme.text(16), weight: .medium)).frame(maxWidth: .infinity).frame(height: theme.controlHeight + 4)
                        .overlay { RoundedRectangle(cornerRadius: theme.radius()).strokeBorder(theme.color(isFocused && index == code.count ? "ring" : "border"), lineWidth: 1) }
                }
            }.contentShape(Rectangle()).onTapGesture { isFocused = true }.accessibilityHidden(true)
            TextField("", text: $code).textFieldStyle(.plain).textContentType(.oneTimeCode).foregroundStyle(.clear).tint(.clear).focused($isFocused).accessibilityLabel("Verification code")
                .onChange(of: code) { _, next in
                    code = String(next.filter(\.isNumber).prefix(length))
                    if code.count == length { onComplete(code) }
                }.accessibilityValue(code)
        }
    }
}

public struct FabricatorColorPicker: View {
    @Environment(\.fabricatorTheme) private var theme
    @Binding public var selection: Color
    public var label: String
    public init(_ label: String, selection: Binding<Color>) { self.label = label; _selection = selection }
    public var body: some View {
        HStack {
            Text(label).font(theme.bodyFont)
            Spacer()
            ColorPicker(label, selection: $selection, supportsOpacity: true).labelsHidden().frame(width: theme.controlHeight, height: theme.controlHeight)
                .overlay {
                    ZStack { RoundedRectangle(cornerRadius: theme.radius()).fill(theme.color("card")); RoundedRectangle(cornerRadius: theme.radius()).strokeBorder(theme.color("border"), lineWidth: 1); RoundedRectangle(cornerRadius: 4).fill(selection).frame(width: 22, height: 22).overlay { RoundedRectangle(cornerRadius: 4).strokeBorder(theme.color("border"), lineWidth: 0.5) } }.allowsHitTesting(false).accessibilityHidden(true)
                }.accessibilityLabel(label)
        }
    }
}

public struct FabricatorFileUpload: View {
    @Environment(\.fabricatorTheme) private var theme
    @State private var isImporting = false
    @State private var error: String?
    @Binding public var files: [URL]
    public var allowedTypes: [UTType]
    public var allowsMultipleSelection: Bool
    public init(files: Binding<[URL]>, allowedTypes: [UTType] = [.data], allowsMultipleSelection: Bool = true) { _files = files; self.allowedTypes = allowedTypes; self.allowsMultipleSelection = allowsMultipleSelection }
    public var body: some View {
        VStack(spacing: 10) {
            FabricatorIcon("upload", size: 24).foregroundStyle(theme.color("muted-foreground"))
            Text("Choose files to upload").font(theme.font(theme.text(), weight: .medium))
            Text("Files stay on your device until you submit.").font(theme.font(theme.text(12))).foregroundStyle(theme.color("muted-foreground"))
            FabricatorButton("Browse files", variant: .outline) { isImporting = true }
            ForEach(files, id: \.self) { file in
                HStack { FabricatorIcon("file"); Text(file.lastPathComponent).lineLimit(1); Spacer(); FabricatorButton("Remove \(file.lastPathComponent)", icon: "x", variant: .ghost, size: .iconSm) { files.removeAll { $0 == file } } }
            }
            if let error { Text(error).foregroundStyle(theme.color("destructive-text")) }
        }.frame(maxWidth: .infinity).padding(20).overlay { RoundedRectangle(cornerRadius: theme.radius()).strokeBorder(theme.color("border"), style: StrokeStyle(lineWidth: 1, dash: [4, 4])) }
            .fileImporter(isPresented: $isImporting, allowedContentTypes: allowedTypes, allowsMultipleSelection: allowsMultipleSelection) { result in
                switch result { case .success(let selected): files = selected; error = nil; case .failure(let failure): error = failure.localizedDescription }
            }
    }
}

public struct FabricatorFlowLayout: Layout {
    public var spacing: CGFloat
    public init(spacing: CGFloat = 8) { self.spacing = spacing }
    public func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize { arrange(proposal: proposal, subviews: subviews).size }
    public func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let layout = arrange(proposal: proposal, subviews: subviews)
        for (index, point) in layout.points.enumerated() { subviews[index].place(at: CGPoint(x: bounds.minX + point.x, y: bounds.minY + point.y), proposal: .unspecified) }
    }
    private func arrange(proposal: ProposedViewSize, subviews: Subviews) -> (size: CGSize, points: [CGPoint]) {
        let width = proposal.width ?? .infinity
        var points: [CGPoint] = [], x: CGFloat = 0, y: CGFloat = 0, rowHeight: CGFloat = 0, totalWidth: CGFloat = 0
        for view in subviews {
            let size = view.sizeThatFits(.unspecified)
            if x > 0 && x + size.width > width { x = 0; y += rowHeight + spacing; rowHeight = 0 }
            points.append(CGPoint(x: x, y: y)); x += size.width + spacing; rowHeight = max(rowHeight, size.height); totalWidth = max(totalWidth, x - spacing)
        }
        return (CGSize(width: proposal.width ?? totalWidth, height: y + rowHeight), points)
    }
}
