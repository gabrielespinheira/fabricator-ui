import SwiftUI
import Charts

public enum FabricatorChartKind: String, CaseIterable, Sendable { case line, area, bar, donut, pie, composition, candlestick, radar, radial, funnel, heatCalendar, treemap }
public enum FabricatorChartOrientation: Sendable { case vertical, horizontal }

public struct FabricatorChart: View {
    @Environment(\.fabricatorTheme) private var theme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var selectedLabel: String?
    @State private var selectedAngle: Double?
    @State private var hidden: Set<String> = []
    @State private var isTableExpanded = false
    @FocusState private var isFocused: Bool
    public var kind: FabricatorChartKind
    public var data: [FabricatorChartDatum]
    public var height: CGFloat
    public var label: String
    public var series: [FabricatorChartSeries]
    public var orientation: FabricatorChartOrientation
    public var isStacked: Bool
    public var showsLegend: Bool
    public var showsDataTable: Bool
    private var configuredRows: [FabricatorChartRow]?
    public init(_ kind: FabricatorChartKind = .line, data: [FabricatorChartDatum], height: CGFloat = 200, label: String = "Chart", showsLegend: Bool = false, showsDataTable: Bool = true) {
        self.kind = kind; self.data = data; self.height = height; self.label = label
        self.series = [FabricatorChartSeries(id: "value", title: "Value")]
        if kind == .composition { self.series.append(FabricatorChartSeries(id: "secondary", title: "Secondary")) }
        self.orientation = .vertical; self.isStacked = kind == .composition; self.showsLegend = showsLegend; self.showsDataTable = showsDataTable
    }
    public init(_ kind: FabricatorChartKind = .line, rows: [FabricatorChartRow], series: [FabricatorChartSeries], height: CGFloat = 200, label: String = "Chart", orientation: FabricatorChartOrientation = .vertical, isStacked: Bool = false, showsLegend: Bool = true, showsDataTable: Bool = true) {
        self.kind = kind; self.data = rows.map { FabricatorChartDatum(id: $0.id, label: $0.label, value: $0.values[series.first?.id ?? "value"] ?? 0) }; self.configuredRows = rows
        self.series = series; self.height = height; self.label = label; self.orientation = orientation; self.isStacked = isStacked; self.showsLegend = showsLegend; self.showsDataTable = showsDataTable
    }
    private var rows: [FabricatorChartRow] { configuredRows ?? data.map { datum in
        var values = ["value": datum.value]
        if let secondary = datum.secondary { values["secondary"] = secondary }
        if let low = datum.low { values["low"] = low }
        if let high = datum.high { values["high"] = high }
        return FabricatorChartRow(id: datum.id, label: datum.label, values: values)
    } }
    private var visibleSeries: [FabricatorResolvedChartSeries] { FabricatorChartEngine.series(series, hidden: hidden) }
    private var isPartition: Bool { kind == .pie || kind == .donut || kind == .treemap || kind == .funnel || kind == .radial || kind == .heatCalendar }
    private var parts: [FabricatorChartPart] {
        let key = series.first?.id ?? "value"
        if kind == .pie || kind == .donut { return FabricatorChartEngine.parts(rows, valueKey: key) }
        return rows.enumerated().compactMap { index, row in
            guard let value = row.values[key], value.isFinite else { return nil }
            return FabricatorChartPart(id: row.id, label: row.label, value: value, color: index < 8 ? "chart-series-\(index + 1)" : "muted-foreground", rowIDs: [row.id])
        }
    }
    private var visibleParts: [FabricatorChartPart] { parts.filter { !hidden.contains($0.id) } }
    public var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            if rows.isEmpty || (isPartition ? visibleParts.isEmpty : visibleSeries.isEmpty) {
                Text("No data to display").font(theme.bodyFont).foregroundStyle(theme.color("muted-foreground")).frame(maxWidth: .infinity, minHeight: height)
            } else {
            switch kind {
            case .line, .area, .bar, .candlestick, .composition: cartesian
            case .pie, .donut: circular
            case .radar: radar
            case .radial: radial
            case .funnel: funnel
            case .heatCalendar: heatCalendar
            case .treemap: treemap
            }
            }
            if showsLegend { legend }
            inspector
            if showsDataTable { dataTable }
        }.focusable().focused($isFocused)
            .onKeyPress(.leftArrow) { moveSelection(.backward); return .handled }
            .onKeyPress(.rightArrow) { moveSelection(.forward); return .handled }
            .onKeyPress(.downArrow) { moveSelection(.backward); return .handled }
            .onKeyPress(.upArrow) { moveSelection(.forward); return .handled }
            .onKeyPress(.home) { moveSelection(.start); return .handled }
            .onKeyPress(.end) { moveSelection(.end); return .handled }
            .onKeyPress(.escape) { selectedLabel = nil; return .handled }
            .accessibilityElement(children: .contain).accessibilityLabel(label)
            .accessibilityValue(selectedLabel.flatMap { selection in data.first { $0.label == selection }.map { "\($0.label): \($0.value.formatted())" } } ?? "\(data.count) values")
            .accessibilityAdjustableAction { direction in moveSelection(direction == .increment ? .forward : .backward) }
            .animation(reduceMotion ? nil : theme.animation("move"), value: hidden)
            .animation(reduceMotion ? nil : theme.animation("move"), value: rows)
    }
    private func moveSelection(_ key: FabricatorChartStep) {
        let labels = isPartition ? visibleParts.map(\.label) : rows.map(\.label)
        guard let index = FabricatorChartEngine.step(labels.firstIndex { $0 == selectedLabel }, key: key, count: labels.count) else { return }
        selectedLabel = labels[index]
    }
    private func seriesColor(_ index: Int) -> Color { theme.color(index < 8 ? "chart-series-\(index + 1)" : "muted-foreground") }
    private func paint(_ value: String) -> Color { value.hasPrefix("#") || value.hasPrefix("rgb") ? Color(fabricatorLiteral: value) : theme.color(value) }
    private var legend: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 14) {
                if isPartition { ForEach(parts) { part in legendButton(part.id, title: part.label, color: part.color) } }
                else { ForEach(FabricatorChartEngine.series(series)) { item in legendButton(item.id, title: item.series.title, color: item.color) } }
            }
        }
    }
    private func legendButton(_ id: String, title: String, color: String) -> some View {
        Button {
            if hidden.contains(id) { hidden.remove(id) } else { hidden.insert(id) }
            selectedLabel = nil
        } label: {
            HStack(spacing: 6) { Circle().fill(paint(color)).frame(width: 7, height: 7); Text(title).font(theme.font(theme.text(11))).foregroundStyle(theme.color("muted-foreground")) }.opacity(hidden.contains(id) ? 0.4 : 1).frame(minHeight: theme.minimumHitSize)
        }.buttonStyle(.plain).accessibilityLabel("\(title), \(hidden.contains(id) ? "hidden" : "visible")").accessibilityHint("Toggle chart series")
    }
    @ViewBuilder private var inspector: some View {
        if isPartition, let part = visibleParts.first(where: { $0.label == selectedLabel }) {
            HStack { Text(part.label); Spacer(); Text(FabricatorChartEngine.format(part.value)).monospacedDigit(); Text(FabricatorChartEngine.percent(part.value / max(1, visibleParts.reduce(0) { $0 + $1.value }))).foregroundStyle(theme.color("muted-foreground")) }.font(theme.font(theme.text(12))).accessibilityElement(children: .combine)
        } else if let row = rows.first(where: { $0.label == selectedLabel }) {
            VStack(alignment: .leading, spacing: 5) {
                Text(row.label).font(theme.font(theme.text(12), weight: .medium))
                ForEach(visibleSeries) { item in HStack { Circle().fill(paint(item.color)).frame(width: 6, height: 6); Text(item.series.title).foregroundStyle(theme.color("muted-foreground")); Spacer(); Text(row.values[item.id].map { FabricatorChartEngine.format($0) } ?? "–").monospacedDigit() }.font(theme.font(theme.text(11))) }
            }.padding(10).background(theme.color("muted"), in: RoundedRectangle(cornerRadius: theme.radius("sm"))).accessibilityElement(children: .combine)
        }
    }
    private var dataTable: some View {
        DisclosureGroup("View data", isExpanded: $isTableExpanded) {
            ScrollView(.horizontal) {
                Grid(alignment: .leading, horizontalSpacing: 20, verticalSpacing: 8) {
                    GridRow { Text("Category").fontWeight(.medium); ForEach(series) { Text($0.title).fontWeight(.medium) } }
                    ForEach(rows) { row in GridRow { Text(row.label); ForEach(series) { item in Text(row.values[item.id].map { FabricatorChartEngine.format($0) } ?? "–").monospacedDigit() } }.accessibilityElement(children: .combine) }
                }.padding(.vertical, 8)
            }
        }.font(theme.font(theme.text(11))).foregroundStyle(theme.color("muted-foreground")).tint(theme.color("muted-foreground"))
    }
    private var cartesian: some View {
        Chart {
            ForEach(rows) { datum in
                ForEach(visibleSeries) { item in
                if let value = datum.values[item.id], value.isFinite {
                switch kind {
                case .bar:
                    if orientation == .horizontal {
                        BarMark(x: .value("Value", value), y: .value("Category", datum.label)).foregroundStyle(paint(item.color)).cornerRadius(3).position(by: .value("Series", isStacked ? "all" : item.id))
                    } else { BarMark(x: .value("Category", datum.label), y: .value("Value", value)).foregroundStyle(paint(item.color)).cornerRadius(3).position(by: .value("Series", isStacked ? "all" : item.id)) }
                case .composition:
                    BarMark(x: .value("Category", datum.label), y: .value("Value", value)).foregroundStyle(paint(item.color)).cornerRadius(2)
                case .candlestick:
                    RuleMark(x: .value("Category", datum.label), yStart: .value("Low", datum.values["low"] ?? min(value, datum.values["secondary"] ?? value)), yEnd: .value("High", datum.values["high"] ?? max(value, datum.values["secondary"] ?? value))).foregroundStyle(theme.color(value >= (datum.values["secondary"] ?? 0) ? "success" : "destructive"))
                    BarMark(x: .value("Category", datum.label), yStart: .value("Open", datum.values["open"] ?? datum.values["secondary"] ?? 0), yEnd: .value("Close", value), width: .ratio(0.55)).foregroundStyle(theme.color(value >= (datum.values["open"] ?? datum.values["secondary"] ?? 0) ? "success" : "destructive")).cornerRadius(1)
                case .area:
                    AreaMark(x: .value("Category", datum.label), y: .value("Value", value), series: .value("Series", item.id), stacking: isStacked ? .standard : .unstacked).interpolationMethod(.catmullRom).foregroundStyle(LinearGradient(colors: [paint(item.color).opacity(0.25), paint(item.color).opacity(0.02)], startPoint: .top, endPoint: .bottom))
                    LineMark(x: .value("Category", datum.label), y: .value("Value", value), series: .value("Series", item.id)).interpolationMethod(.catmullRom).foregroundStyle(paint(item.color)).lineStyle(StrokeStyle(lineWidth: 2, dash: item.series.isDashed ? [4, 3] : []))
                default:
                    LineMark(x: .value("Category", datum.label), y: .value("Value", value), series: .value("Series", item.id)).interpolationMethod(.catmullRom).foregroundStyle(paint(item.color)).lineStyle(StrokeStyle(lineWidth: 2, dash: item.series.isDashed ? [4, 3] : []))
                }
                }
                }
                if datum.label == selectedLabel {
                    if kind == .bar && orientation == .horizontal { RuleMark(y: .value("Selection", datum.label)).foregroundStyle(theme.color("border")).lineStyle(StrokeStyle(dash: [3, 3])) }
                    else { RuleMark(x: .value("Selection", datum.label)).foregroundStyle(theme.color("border")).lineStyle(StrokeStyle(dash: [3, 3])) }
                }
            }
        }.chartXSelection(value: orientation == .vertical ? $selectedLabel : .constant(nil)).chartYSelection(value: orientation == .horizontal ? $selectedLabel : .constant(nil)).chartXAxis { AxisMarks { _ in AxisValueLabel().foregroundStyle(theme.color("muted-foreground")) } }
            .chartYAxis { AxisMarks(position: .leading) { _ in AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5, dash: [3, 3])).foregroundStyle(theme.color("border")); AxisValueLabel().foregroundStyle(theme.color("muted-foreground")) } }
            .frame(height: height)
    }
    private var circular: some View {
        Chart(visibleParts) { part in
            SectorMark(angle: .value(part.label, part.value), innerRadius: .ratio(kind == .donut ? 0.62 : 0), angularInset: visibleParts.count > 1 ? 2 : 0).cornerRadius(kind == .donut ? 6 : 4).foregroundStyle(paint(part.color)).opacity(selectedLabel == nil || selectedLabel == part.label ? 1 : 0.4)
        }.chartAngleSelection(value: $selectedAngle).onChange(of: selectedAngle) { _, angle in
            guard let angle else { selectedLabel = nil; return }
            var running = 0.0
            for part in visibleParts { running += part.value; if angle <= running { selectedLabel = part.label; return } }
        }.chartBackground { _ in if kind == .donut { VStack(spacing: 3) { Text(FabricatorChartEngine.format(visibleParts.reduce(0) { $0 + $1.value })).font(theme.font(24, weight: .semibold)); Text("Total").font(theme.font(11)).foregroundStyle(theme.color("muted-foreground")) } } }.frame(height: height)
            .overlay(alignment: .bottomLeading) { EmptyView() }
    }
    private var radar: some View {
        GeometryReader { geometry in
            Canvas { context, size in
                guard rows.count >= 3 else { return }
                let center = CGPoint(x: size.width / 2, y: size.height / 2), radius = min(size.width, size.height) * 0.36
                let maximum = max(1, rows.flatMap { row in visibleSeries.compactMap { row.values[$0.id] } }.filter(\.isFinite).max() ?? 1)
                let count = rows.count
                func point(_ index: Int, _ magnitude: Double) -> CGPoint { let angle = Double(index) / Double(count) * 2 * .pi - .pi / 2; return CGPoint(x: center.x + cos(angle) * radius * magnitude, y: center.y + sin(angle) * radius * magnitude) }
                for ring in 1...4 {
                    var path = Path(); for index in rows.indices { let vertex = point(index, Double(ring) / 4); if index == 0 { path.move(to: vertex) } else { path.addLine(to: vertex) } }; path.closeSubpath()
                    context.stroke(path, with: .color(theme.color("border")), lineWidth: 0.5)
                }
                for item in visibleSeries {
                    var shape = Path()
                    for index in rows.indices { let vertex = point(index, max(0, rows[index].values[item.id] ?? 0) / maximum); if index == 0 { shape.move(to: vertex) } else { shape.addLine(to: vertex) } }
                    shape.closeSubpath(); context.fill(shape, with: .color(paint(item.color).opacity(0.15))); context.stroke(shape, with: .color(paint(item.color)), style: StrokeStyle(lineWidth: 2, dash: item.series.isDashed ? [4, 3] : []))
                }
                for index in rows.indices { context.draw(Text(rows[index].label).font(theme.font(10)).foregroundStyle(theme.color("muted-foreground")), at: point(index, 1.26)) }
            }.contentShape(Rectangle()).onTapGesture { point in
                let angle = atan2(point.y - geometry.size.height / 2, point.x - geometry.size.width / 2) + .pi / 2
                let index = Int((angle / (2 * .pi) * Double(rows.count)).rounded() + Double(rows.count)) % max(1, rows.count)
                if rows.indices.contains(index) { selectedLabel = rows[index].label }
            }
        }.frame(height: height)
    }
    private var radial: some View {
        let maximum = max(1, visibleParts.map(\.value).max() ?? 1)
        return HStack(spacing: 20) {
            ZStack {
                ForEach(Array(visibleParts.enumerated()), id: \.element.id) { index, datum in
                    let spacing = min(15, max(3, (min(height, 200) / 2 - 8) / CGFloat(max(1, visibleParts.count))))
                    Circle().stroke(theme.color("hover"), lineWidth: min(10, spacing * 0.65)).padding(CGFloat(index) * spacing)
                    Circle().trim(from: 0, to: min(1, max(0, datum.value / maximum))).stroke(paint(datum.color), style: StrokeStyle(lineWidth: min(10, spacing * 0.65), lineCap: .round)).rotationEffect(.degrees(-90)).padding(CGFloat(index) * spacing).onTapGesture { selectedLabel = datum.label }
                }
            }.frame(width: min(height, 200), height: min(height, 200))
            VStack(alignment: .leading, spacing: 10) { ForEach(visibleParts) { datum in Button { selectedLabel = datum.label } label: { HStack { Circle().fill(paint(datum.color)).frame(width: 6, height: 6); Text(datum.label); Text(FabricatorChartEngine.format(datum.value)).foregroundStyle(theme.color("muted-foreground")) }.font(theme.font(11)) }.buttonStyle(.plain) } }
        }.frame(height: height)
    }
    private var funnel: some View {
        let maximum = max(1, visibleParts.map(\.value).max() ?? 1)
        return GeometryReader { geometry in
            VStack(spacing: 3) {
                ForEach(Array(visibleParts.enumerated()), id: \.element.id) { index, datum in
                    let next = index + 1 < visibleParts.count ? visibleParts[index + 1].value : datum.value * 0.72
                    Path { path in
                        let top = geometry.size.width * max(0.08, datum.value / maximum), bottom = geometry.size.width * max(0.06, next / maximum)
                        let row = (height - CGFloat(max(0, visibleParts.count - 1)) * 3) / CGFloat(max(1, visibleParts.count))
                        path.move(to: CGPoint(x: (geometry.size.width - top) / 2, y: 0)); path.addLine(to: CGPoint(x: (geometry.size.width + top) / 2, y: 0)); path.addLine(to: CGPoint(x: (geometry.size.width + bottom) / 2, y: row)); path.addLine(to: CGPoint(x: (geometry.size.width - bottom) / 2, y: row)); path.closeSubpath()
                    }.fill(paint(datum.color)).overlay { Text("\(datum.label) · \(FabricatorChartEngine.format(datum.value))").font(theme.font(11, weight: .medium)).foregroundStyle(.white) }.contentShape(Rectangle()).onTapGesture { selectedLabel = datum.label }.accessibilityLabel("\(datum.label): \(datum.value)")
                }
            }
        }.frame(height: height)
    }
    private var heatCalendar: some View {
        let maximum = max(1, visibleParts.map(\.value).max() ?? 1)
        return ScrollView(.horizontal, showsIndicators: false) {
            LazyHGrid(rows: Array(repeating: GridItem(.fixed(12), spacing: 3), count: 7), spacing: 3) {
                ForEach(visibleParts) { datum in
                    RoundedRectangle(cornerRadius: 2).fill(seriesColor(0).opacity(datum.value > 0 ? 0.16 + max(0, datum.value / maximum) * 0.84 : 0.05)).frame(width: 12, height: 12).onTapGesture { selectedLabel = datum.label }.accessibilityLabel("\(datum.label): \(datum.value)")
                }
            }
        }.frame(height: min(height, 105))
    }
    private var treemap: some View {
        GeometryReader { geometry in
            let boxes = FabricatorTreemapLayout.layout(visibleParts.map { max(0, $0.value) }, in: CGRect(origin: .zero, size: geometry.size))
            ForEach(Array(visibleParts.enumerated()), id: \.element.id) { index, datum in
                if boxes.indices.contains(index) {
                    let box = boxes[index]
                    RoundedRectangle(cornerRadius: 5).fill(paint(datum.color).opacity(selectedLabel == nil || selectedLabel == datum.label ? 0.9 : 0.4)).overlay(alignment: .topLeading) { VStack(alignment: .leading, spacing: 3) { Text(datum.label).font(theme.font(11, weight: .medium)); Text(FabricatorChartEngine.format(datum.value)).font(theme.font(10)) }.foregroundStyle(.white).padding(8).clipped() }
                        .frame(width: max(0, box.width - 2), height: max(0, box.height - 2)).position(x: box.midX, y: box.midY).onTapGesture { selectedLabel = datum.label }.accessibilityLabel("\(datum.label): \(datum.value)")
                }
            }
        }.frame(height: height)
    }
}

public struct FabricatorStatusBar: View {
    @Environment(\.fabricatorTheme) private var theme
    @State private var selectedID: String?
    @State private var width = 300.0
    @State private var isTableExpanded = false
    public var periods: [FabricatorStatusPeriod]
    public var statuses: [String: FabricatorStatusStyle]
    public var height: CGFloat
    public init(_ periods: [FabricatorStatusPeriod], statuses: [String: FabricatorStatusStyle] = [:], height: CGFloat = 32) { self.periods = periods; self.statuses = statuses; self.height = height }
    private var model: FabricatorStatusBarLayout { FabricatorStatusBarEngine.layout(periods, width: width, statuses: statuses) }
    private func color(_ style: FabricatorStatusStyle) -> Color { style.color.hasPrefix("#") || style.color.hasPrefix("rgb") ? Color(fabricatorLiteral: style.color) : theme.color(style.color) }
    public var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            GeometryReader { geometry in
                let layout = FabricatorStatusBarEngine.layout(periods, width: geometry.size.width, statuses: statuses)
                ZStack(alignment: .topLeading) {
                    ForEach(layout.pills) { pill in
                        RoundedRectangle(cornerRadius: min(4, pill.width / 2)).fill(color(pill.status).opacity(pill.status.opacity))
                            .overlay { if selectedID == pill.id { RoundedRectangle(cornerRadius: min(4, pill.width / 2)).stroke(theme.color("foreground"), lineWidth: 1) } }
                            .frame(width: pill.width, height: height).offset(x: pill.x)
                            .accessibilityLabel("\(pill.period.label), \(pill.status.title)\(pill.period.note.map { ", " + $0 } ?? "")")
                            .accessibilityAddTraits(.isButton).accessibilityAction { selectedID = pill.id }
                    }
                }.contentShape(Rectangle()).gesture(DragGesture(minimumDistance: 0).onChanged { event in inspect(event.location.x, pills: layout.pills) })
                    .onContinuousHover { phase in if case .active(let point) = phase { inspect(point.x, pills: layout.pills) } }
                    .onAppear { width = geometry.size.width }.onChange(of: geometry.size.width) { _, value in width = value }
            }.frame(height: height)
            HStack {
                Text(model.pills.first?.period.label ?? "")
                Spacer()
                Text(model.uptime.map { FabricatorChartEngine.percent($0) + " uptime" } ?? "No data")
                Spacer()
                Text(model.pills.last?.period.label ?? "")
            }.font(theme.font(theme.text(10))).foregroundStyle(theme.color("muted-foreground"))
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 14) {
                    ForEach(presentStatuses, id: \.title) { status in HStack(spacing: 5) { Circle().fill(color(status).opacity(status.opacity)).frame(width: 6, height: 6); Text(status.title) }.font(theme.font(theme.text(10))).foregroundStyle(theme.color("muted-foreground")) }
                }
            }
            if let pill = model.pills.first(where: { $0.id == selectedID }) {
                VStack(alignment: .leading, spacing: 4) { Text(pill.period.label).fontWeight(.medium); Text(pill.status.title).foregroundStyle(theme.color("muted-foreground")); if let note = pill.period.note { Text(note) } }.font(theme.font(theme.text(11))).accessibilityElement(children: .combine)
            }
            DisclosureGroup("View data", isExpanded: $isTableExpanded) {
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(periods) { period in HStack { Text(period.label); Spacer(); Text((statuses[period.status ?? "none"] ?? FabricatorStatusBarEngine.defaults[period.status ?? "none"])?.title ?? period.status ?? "No data"); if let note = period.note { Text(note) } }.accessibilityElement(children: .combine) }
                }.padding(.top, 8)
            }.font(theme.font(theme.text(11))).tint(theme.color("muted-foreground")).foregroundStyle(theme.color("muted-foreground"))
        }.focusable().onKeyPress(.rightArrow) { step(.forward); return .handled }.onKeyPress(.leftArrow) { step(.backward); return .handled }.onKeyPress(.home) { step(.start); return .handled }.onKeyPress(.end) { step(.end); return .handled }.onKeyPress(.escape) { selectedID = nil; return .handled }
            .accessibilityElement(children: .contain).accessibilityLabel("Service uptime").accessibilityAdjustableAction { direction in step(direction == .increment ? .forward : .backward) }
    }
    private var presentStatuses: [FabricatorStatusStyle] { model.pills.reduce(into: []) { result, pill in if !result.contains(pill.status) { result.append(pill.status) } } }
    private func inspect(_ x: Double, pills: [FabricatorStatusPill]) { selectedID = pills.min { abs($0.x + $0.width / 2 - x) < abs($1.x + $1.width / 2 - x) }?.id }
    private func step(_ key: FabricatorChartStep) { let pills = model.pills; guard let index = FabricatorChartEngine.step(pills.firstIndex { $0.id == selectedID }, key: key, count: pills.count) else { return }; selectedID = pills[index].id }
}

public struct FabricatorBumpSeries: Identifiable, Sendable {
    public var id: String
    public var title: String
    public var ranks: [Double]
    public init(id: String, title: String, ranks: [Double]) { self.id = id; self.title = title; self.ranks = ranks }
}
public struct FabricatorBumpChart: View {
    @Environment(\.fabricatorTheme) private var theme
    @State private var hidden: Set<String> = []
    @State private var selectedIndex: Int?
    @State private var isTableExpanded = false
    public var series: [FabricatorBumpSeries]
    public var labels: [String]
    public init(_ series: [FabricatorBumpSeries], labels: [String]) { self.series = series; self.labels = labels }
    private func color(_ index: Int) -> Color { theme.color(index < 8 ? "chart-series-\(index + 1)" : "muted-foreground") }
    public var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Chart {
                ForEach(Array(series.enumerated()), id: \.element.id) { index, item in
                    if !hidden.contains(item.id) {
                        ForEach(Array(item.ranks.enumerated()), id: \.offset) { point, rank in
                            if rank.isFinite, rank > 0 {
                                LineMark(x: .value("Period", point), y: .value("Rank", rank), series: .value("Series", item.id)).interpolationMethod(.catmullRom).foregroundStyle(color(index)).symbol(.circle)
                            }
                        }
                    }
                }
                if let selectedIndex { RuleMark(x: .value("Selection", selectedIndex)).foregroundStyle(theme.color("border")).lineStyle(StrokeStyle(dash: [3, 3])) }
            }.chartYScale(domain: .automatic(includesZero: false, reversed: true)).chartXSelection(value: $selectedIndex).chartXAxis { AxisMarks(values: Array(labels.indices)) { value in AxisValueLabel { if let index = value.as(Int.self), labels.indices.contains(index) { Text(labels[index]).font(theme.font(10)).foregroundStyle(theme.color("muted-foreground")) } } } }.chartYAxis { AxisMarks { _ in AxisValueLabel().foregroundStyle(theme.color("muted-foreground")); AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5, dash: [3, 3])).foregroundStyle(theme.color("border")) } }.frame(height: 200)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 14) { ForEach(Array(series.enumerated()), id: \.element.id) { index, item in
                    Button { if hidden.contains(item.id) { hidden.remove(item.id) } else { hidden.insert(item.id) } } label: { HStack(spacing: 5) { Circle().fill(color(index)).frame(width: 6, height: 6); Text(item.title) }.font(theme.font(theme.text(11))).foregroundStyle(theme.color("muted-foreground")).opacity(hidden.contains(item.id) ? 0.4 : 1).frame(minHeight: theme.minimumHitSize) }.buttonStyle(.plain).accessibilityLabel("\(item.title), \(hidden.contains(item.id) ? "hidden" : "visible")")
                } }
            }
            if let selectedIndex, labels.indices.contains(selectedIndex) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(labels[selectedIndex]).fontWeight(.medium)
                    ForEach(series.filter { !hidden.contains($0.id) && $0.ranks.indices.contains(selectedIndex) }.sorted { $0.ranks[selectedIndex] < $1.ranks[selectedIndex] }) { item in
                        HStack { Text(item.title); Spacer(); Text(rankLabel(item.ranks[selectedIndex]) + movement(item.ranks, at: selectedIndex)).monospacedDigit() }
                    }
                }.font(theme.font(theme.text(11))).accessibilityElement(children: .combine)
            }
            DisclosureGroup("View data", isExpanded: $isTableExpanded) {
                ScrollView(.horizontal) {
                    Grid(alignment: .leading, horizontalSpacing: 20, verticalSpacing: 8) {
                        GridRow { Text("Period").fontWeight(.medium); ForEach(series) { Text($0.title).fontWeight(.medium) } }
                        ForEach(Array(labels.enumerated()), id: \.offset) { index, label in GridRow { Text(label); ForEach(series) { item in Text(item.ranks.indices.contains(index) ? rankLabel(item.ranks[index]) : "–").monospacedDigit() } }.accessibilityElement(children: .combine) }
                    }.padding(.top, 8)
                }
            }.font(theme.font(theme.text(11))).foregroundStyle(theme.color("muted-foreground")).tint(theme.color("muted-foreground"))
        }.focusable().onKeyPress(.rightArrow) { step(.forward); return .handled }.onKeyPress(.leftArrow) { step(.backward); return .handled }.onKeyPress(.home) { step(.start); return .handled }.onKeyPress(.end) { step(.end); return .handled }.onKeyPress(.escape) { selectedIndex = nil; return .handled }
            .accessibilityLabel("Ranking over time").accessibilityAdjustableAction { direction in step(direction == .increment ? .forward : .backward) }
    }
    private func rankLabel(_ value: Double) -> String { value.isFinite && value > 0 ? "#" + FabricatorChartEngine.format(value) : "–" }
    private func movement(_ ranks: [Double], at index: Int) -> String { guard index > 0, ranks.indices.contains(index), ranks[index].isFinite, ranks[index - 1].isFinite else { return "" }; let difference = ranks[index - 1] - ranks[index]; return difference == 0 ? " –" : " \(difference > 0 ? "↑" : "↓")\(FabricatorChartEngine.format(abs(difference)))" }
    private func step(_ key: FabricatorChartStep) { selectedIndex = FabricatorChartEngine.step(selectedIndex, key: key, count: labels.count) }
}

public struct FabricatorSankeyChart: View {
    @Environment(\.fabricatorTheme) private var theme
    @State private var selectedIndex: Int?
    @State private var isTableExpanded = false
    @State private var hidden: Set<String> = []
    @State private var width = 480.0
    public var nodes: [FabricatorSankeyNode]
    public var links: [FabricatorSankeyLink]
    public var height: CGFloat
    public var label: String
    public var showsLegend: Bool
    public var showsDataTable: Bool
    public init(nodes: [FabricatorSankeyNode], links: [FabricatorSankeyLink], height: CGFloat = 220, label: String = "Flow between categories", showsLegend: Bool = false, showsDataTable: Bool = true) { self.nodes = nodes; self.links = links; self.height = height; self.label = label; self.showsLegend = showsLegend; self.showsDataTable = showsDataTable }
    private var fontSize: CGFloat { theme.text(12) }
    private var layout: Result<FabricatorSankeyLayout, FabricatorSankeyLayoutError> { compute(width: width) }
    public var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            GeometryReader { geometry in
                Group {
                    switch compute(width: geometry.size.width) {
                    case .success(let model):
                        if model.links.isEmpty { Text("No data to display").font(theme.bodyFont).foregroundStyle(theme.color("muted-foreground")).frame(maxWidth: .infinity, maxHeight: .infinity) }
                        else { plot(model) }
                    case .failure(let error): Text(error.localizedDescription).font(theme.bodyFont).foregroundStyle(theme.color("muted-foreground")).frame(maxWidth: .infinity, maxHeight: .infinity)
                    }
                }.onAppear { width = geometry.size.width }.onChange(of: geometry.size.width) { _, value in width = value }
            }.frame(height: height)
            if case .success(let model) = layout {
                if showsLegend { legend(model) }
                inspector(model)
                if showsDataTable { table(model) }
            }
        }.focusable()
            .onKeyPress(.rightArrow) { step(.forward); return .handled }.onKeyPress(.leftArrow) { step(.backward); return .handled }
            .onKeyPress(.downArrow) { step(.forward); return .handled }.onKeyPress(.upArrow) { step(.backward); return .handled }
            .onKeyPress(.home) { step(.start); return .handled }.onKeyPress(.end) { step(.end); return .handled }.onKeyPress(.escape) { selectedIndex = nil; return .handled }
            .onChange(of: nodes) { _, _ in selectedIndex = nil }.onChange(of: links) { _, _ in selectedIndex = nil }
            .accessibilityElement(children: .contain).accessibilityLabel(label)
            .accessibilityAdjustableAction { direction in step(direction == .increment ? .forward : .backward) }
    }
    private func compute(width: Double) -> Result<FabricatorSankeyLayout, FabricatorSankeyLayoutError> {
        do { return .success(try FabricatorSankeyEngine.layout(nodes: nodes, links: links, width: width, height: height, fontSize: fontSize, hidden: hidden)) }
        catch { return .failure(error) }
    }
    private func paint(_ value: String) -> Color { value.hasPrefix("#") || value.hasPrefix("rgb") ? Color(fabricatorLiteral: value) : theme.color(value) }
    private func ribbon(_ link: FabricatorSankeyLayoutLink) -> Path {
        Path { path in
            let middle = (link.x0 + link.x1) / 2
            path.move(to: CGPoint(x: link.x0, y: link.sourceTop))
            path.addCurve(to: CGPoint(x: link.x1, y: link.targetTop), control1: CGPoint(x: middle, y: link.sourceTop), control2: CGPoint(x: middle, y: link.targetTop))
            path.addLine(to: CGPoint(x: link.x1, y: link.targetBottom))
            path.addCurve(to: CGPoint(x: link.x0, y: link.sourceBottom), control1: CGPoint(x: middle, y: link.targetBottom), control2: CGPoint(x: middle, y: link.sourceBottom))
            path.closeSubpath()
        }
    }
    private func plot(_ model: FabricatorSankeyLayout) -> some View {
        let highlight = selectedIndex.flatMap { FabricatorSankeyEngine.highlight(index: $0, in: model) }
        return Canvas { context, _ in
            for link in model.links {
                let isLit = highlight?.links.contains(link.id) ?? false
                context.opacity = highlight != nil && !isLit ? 0.2 : 1
                context.fill(ribbon(link), with: .color(paint(link.color).opacity(isLit ? 0.45 : 0.22)))
            }
            for node in model.nodes {
                context.opacity = highlight != nil && highlight?.nodes.contains(node.id) == false ? 0.2 : 1
                let rectangle = CGRect(x: node.x, y: node.y, width: node.width, height: node.height)
                context.fill(Path(roundedRect: rectangle, cornerRadius: min(3, node.height / 2)), with: .color(paint(node.color)))
            }
            for node in model.nodes where node.labelLines > 0 {
                context.opacity = highlight != nil && highlight?.nodes.contains(node.id) == false ? 0.2 : 1
                let x = node.isLabelBefore ? node.x - 6 : node.x + node.width + 6
                let middle = node.y + node.height / 2
                let half = node.labelLines == 2 ? Double(fontSize) * 1.3 / 2 : 0
                let anchor: UnitPoint = node.isLabelBefore ? .trailing : .leading
                context.draw(Text(node.title).font(theme.font(fontSize, weight: .medium)).foregroundStyle(theme.color("foreground")), at: CGPoint(x: x, y: middle - half), anchor: anchor)
                if node.labelLines == 2 { context.draw(Text(node.valueText).font(theme.font(fontSize)).foregroundStyle(theme.color("muted-foreground")), at: CGPoint(x: x, y: middle + half), anchor: anchor) }
            }
        }.contentShape(Rectangle()).onTapGesture { point in selectedIndex = FabricatorSankeyEngine.markAt(x: point.x, y: point.y, in: model) }
            .onContinuousHover { phase in switch phase { case .active(let point): selectedIndex = FabricatorSankeyEngine.markAt(x: point.x, y: point.y, in: model); case .ended: selectedIndex = nil } }
            .accessibilityLabel(label).accessibilityChildren {
                ForEach(Array(model.links.enumerated()), id: \.element.id) { index, link in Button("\(title(link)): \(FabricatorChartEngine.format(link.value)), \(FabricatorChartEngine.percent(link.share)) of source") { selectedIndex = index } }
                ForEach(Array(model.nodes.enumerated()), id: \.element.id) { index, node in Button("\(node.title), in \(FabricatorChartEngine.format(node.valueIn)), out \(FabricatorChartEngine.format(node.valueOut))") { selectedIndex = model.links.count + index } }
            }
    }
    @ViewBuilder private func inspector(_ model: FabricatorSankeyLayout) -> some View {
        if let selectedIndex, model.links.indices.contains(selectedIndex) {
            let link = model.links[selectedIndex]
            VStack(alignment: .leading, spacing: 5) {
                Text(title(link)).fontWeight(.medium)
                HStack { Text("Flow"); Spacer(); Text(FabricatorChartEngine.format(link.value)).monospacedDigit() }
                HStack { Text("Of \(nodes.first { $0.id == link.source }?.title ?? link.source)"); Spacer(); Text(FabricatorChartEngine.percent(link.share)).monospacedDigit() }
            }.font(theme.font(theme.text(11))).accessibilityElement(children: .combine)
        } else if let selectedIndex, model.nodes.indices.contains(selectedIndex - model.links.count) {
            let node = model.nodes[selectedIndex - model.links.count]
            VStack(alignment: .leading, spacing: 5) {
                Text(node.title).fontWeight(.medium)
                if node.valueIn > 0 { HStack { Text("In"); Spacer(); Text(FabricatorChartEngine.format(node.valueIn)).monospacedDigit() } }
                if node.valueOut > 0 { HStack { Text("Out"); Spacer(); Text(FabricatorChartEngine.format(node.valueOut)).monospacedDigit() } }
            }.font(theme.font(theme.text(11))).accessibilityElement(children: .combine)
        }
    }
    private func legend(_ model: FabricatorSankeyLayout) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 14) { ForEach(model.series) { item in Button { if hidden.contains(item.id) { hidden.remove(item.id) } else { hidden.insert(item.id) }; selectedIndex = nil } label: { HStack(spacing: 6) { Circle().fill(paint(item.color)).frame(width: 7, height: 7); Text(item.series.title).font(theme.font(theme.text(11))) }.opacity(hidden.contains(item.id) ? 0.4 : 1).frame(minHeight: theme.minimumHitSize) }.buttonStyle(.plain).accessibilityLabel("\(item.series.title), \(hidden.contains(item.id) ? "hidden" : "visible")") } }
        }
    }
    private func table(_ model: FabricatorSankeyLayout) -> some View {
        DisclosureGroup("View data", isExpanded: $isTableExpanded) {
            ScrollView(.horizontal) {
                Grid(alignment: .leading, horizontalSpacing: 20, verticalSpacing: 8) {
                    GridRow { Text("Connection").fontWeight(.medium); Text("Flow").fontWeight(.medium); Text("Share of source").fontWeight(.medium) }
                    ForEach(model.links) { link in GridRow { Text(title(link)); Text(FabricatorChartEngine.format(link.value)).monospacedDigit(); Text(FabricatorChartEngine.percent(link.share)).monospacedDigit() }.accessibilityElement(children: .combine) }
                }.padding(.top, 8)
            }
        }.font(theme.font(theme.text(11))).foregroundStyle(theme.color("muted-foreground")).tint(theme.color("muted-foreground"))
    }
    private func title(_ link: FabricatorSankeyLayoutLink) -> String { "\(nodes.first { $0.id == link.source }?.title ?? link.source) → \(nodes.first { $0.id == link.target }?.title ?? link.target)" }
    private func step(_ key: FabricatorChartStep) { if case .success(let model) = layout { selectedIndex = FabricatorChartEngine.step(selectedIndex, key: key, count: model.markCount) } }
}

public struct FabricatorAreaChart: View { public var data: [FabricatorChartDatum]; public init(_ data: [FabricatorChartDatum]) { self.data = data }; public var body: some View { FabricatorChart(.area, data: data) } }
public struct FabricatorBarChart: View { public var data: [FabricatorChartDatum]; public init(_ data: [FabricatorChartDatum]) { self.data = data }; public var body: some View { FabricatorChart(.bar, data: data) } }
public struct FabricatorLineChart: View { public var data: [FabricatorChartDatum]; public init(_ data: [FabricatorChartDatum]) { self.data = data }; public var body: some View { FabricatorChart(.line, data: data) } }
public struct FabricatorDonutChart: View { public var data: [FabricatorChartDatum]; public init(_ data: [FabricatorChartDatum]) { self.data = data }; public var body: some View { FabricatorChart(.donut, data: data) } }
public struct FabricatorPieChart: View { public var data: [FabricatorChartDatum]; public init(_ data: [FabricatorChartDatum]) { self.data = data }; public var body: some View { FabricatorChart(.pie, data: data) } }
public struct FabricatorCompositionChart: View { public var data: [FabricatorChartDatum]; public init(_ data: [FabricatorChartDatum]) { self.data = data }; public var body: some View { FabricatorChart(.composition, data: data) } }
public struct FabricatorCandlestickChart: View { public var data: [FabricatorChartDatum]; public init(_ data: [FabricatorChartDatum]) { self.data = data }; public var body: some View { FabricatorChart(.candlestick, data: data) } }
public struct FabricatorRadarChart: View { public var data: [FabricatorChartDatum]; public init(_ data: [FabricatorChartDatum]) { self.data = data }; public var body: some View { FabricatorChart(.radar, data: data) } }
public struct FabricatorRadialChart: View { public var data: [FabricatorChartDatum]; public init(_ data: [FabricatorChartDatum]) { self.data = data }; public var body: some View { FabricatorChart(.radial, data: data) } }
public struct FabricatorFunnelChart: View { public var data: [FabricatorChartDatum]; public init(_ data: [FabricatorChartDatum]) { self.data = data }; public var body: some View { FabricatorChart(.funnel, data: data) } }
public struct FabricatorHeatCalendar: View { public var data: [FabricatorChartDatum]; public init(_ data: [FabricatorChartDatum]) { self.data = data }; public var body: some View { FabricatorChart(.heatCalendar, data: data) } }
public struct FabricatorTreemap: View { public var data: [FabricatorChartDatum]; public init(_ data: [FabricatorChartDatum]) { self.data = data }; public var body: some View { FabricatorChart(.treemap, data: data) } }
