import SwiftUI
import FabricatorUI
import AVFoundation

struct ComponentGallery: View {
    @Environment(\.dynamicTypeSize) private var systemTextSize
    private let usesLargeText: Bool
    private let isMotionEnabled: Bool
    @State private var selection: String
    @State private var isDark: Bool
    @State private var isCommandPresented = false
    @State private var search = ""
    @State private var toaster = FabricatorToaster()
    init() {
        let arguments = ProcessInfo.processInfo.arguments
        usesLargeText = arguments.contains("--large-text")
        isMotionEnabled = !arguments.contains("--motion-off")
        let index = arguments.firstIndex(of: "--page")
        _selection = State(initialValue: index.flatMap { arguments.indices.contains($0 + 1) ? arguments[$0 + 1] : nil } ?? "overview")
        _isDark = State(initialValue: arguments.contains("--dark"))
    }
    private var groups: [FabricatorNavigationGroup] {
        let overview = FabricatorNavigationGroup("Explore", items: [
            FabricatorNavigationItem(id: "overview", title: "Overview", icon: "layout-grid"),
            FabricatorNavigationItem(id: "app-shell", title: "App Shell", icon: "panels-top-left"),
            FabricatorNavigationItem(id: "showcase-forms", title: "Forms", icon: "list-checks"),
            FabricatorNavigationItem(id: "showcase-charts", title: "Charts", icon: "chart-no-axes-combined"),
            FabricatorNavigationItem(id: "showcase-chat", title: "Chat", icon: "messages-square")
        ])
        let order = ["Basics", "Forms", "Overlays", "Structure", "Content", "Charts", "Chat", "Advanced", "Blocks"]
        return [overview] + order.compactMap { group in
            let items = FabricatorTheme.catalog.filter { $0.group == group && (search.isEmpty || $0.title.localizedCaseInsensitiveContains(search)) }
            if items.isEmpty { return nil }
            return FabricatorNavigationGroup(group, items: items.map { FabricatorNavigationItem(id: $0.name, title: $0.title, icon: icon(for: group)) })
        }
    }
    private var pageTitle: String {
        if selection == "overview" { return "Component library" }
        if selection.hasPrefix("showcase-") { return selection.replacingOccurrences(of: "showcase-", with: "").capitalized }
        return FabricatorTheme.catalog.first(where: { $0.name == selection })?.title ?? "App Shell"
    }
    var body: some View {
        GeometryReader { geometry in
            FabricatorRoot(colorScheme: isDark ? .dark : .light, density: .regular, isMotionEnabled: isMotionEnabled) {
                Group {
                    if selection == "app-shell" {
                        ShellShowcase(onCatalog: { selection = "overview" }).accessibilityIdentifier("fabricator-gallery-page-app-shell")
                    } else {
                        FabricatorAppShell(pageTitle, groups: groups, selection: $selection, status: "Fabricator UI · SwiftUI") {
                            FabricatorBadge("SwiftUI", variant: .outline)
                            FabricatorButton("Search components", icon: "search", variant: .ghost, size: .icon) { isCommandPresented = true }.keyboardShortcut("k", modifiers: .command)
                            FabricatorThemeToggle(isDark: $isDark)
                        } content: {
                            ScrollView {
                                VStack(alignment: .leading, spacing: 24) {
                                    GalleryHeading(title: selection == "overview" ? "One design. Every Apple screen." : pageTitle, description: selection == "overview" ? "Familiar components, shared tokens and native interactions. Built with SwiftUI." : "Fabricator UI components with native Apple input and accessibility.")
                                        .accessibilityElement(children: .combine).accessibilityIdentifier("fabricator-gallery-page-\(selection)")
                                    if selection == "overview" { OverviewShowcase(toaster: toaster) }
                                    else if selection == "showcase-forms" { FormsShowcase(toaster: toaster) }
                                    else if selection == "showcase-charts" { ChartsShowcase() }
                                    else if selection == "showcase-chat" { ChatShowcase() }
                                    else { ComponentDetail(name: selection, toaster: toaster) }
                                }.padding(geometry.size.width < 700 ? 16 : 24).frame(maxWidth: 1120).frame(maxWidth: .infinity)
                            }
                        }
                    }
                }.overlay(alignment: .bottomTrailing) { FabricatorSonner(toaster) }
                    .background { FabricatorDialog("Find a component", isPresented: $isCommandPresented) { FabricatorCommand(FabricatorTheme.catalog.filter { $0.type != "registry:block" }.map { item in FabricatorCommandItem(id: item.name, title: item.title, group: item.group, icon: icon(for: item.group)) { selection = item.name } }) { isCommandPresented = false } } }
                    .onReceive(NotificationCenter.default.publisher(for: .fabricatorCommand)) { _ in isCommandPresented = true }
                    .onReceive(NotificationCenter.default.publisher(for: .fabricatorAppearance)) { _ in isDark.toggle() }
            }.environment(\.dynamicTypeSize, usesLargeText ? .accessibility3 : systemTextSize)
        }
    }
    private func icon(for group: String) -> String {
        switch group { case "Basics": "box"; case "Forms": "list-checks"; case "Overlays": "layers"; case "Structure": "panels-top-left"; case "Content": "text"; case "Charts": "chart-no-axes-combined"; case "Chat": "messages-square"; case "Advanced": "blocks"; default: "layout-template" }
    }
}
struct GalleryHeading: View {
    @Environment(\.fabricatorTheme) private var theme
    var title: String
    var description: String
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title).font(theme.font(24, weight: .semibold)).tracking(-0.4).fixedSize(horizontal: false, vertical: true)
            Text(description).font(theme.font(theme.text())).foregroundStyle(theme.color("muted-foreground")).fixedSize(horizontal: false, vertical: true)
        }
    }
}
struct GalleryGrid<Content: View>: View {
    var minimumWidth: CGFloat
    var content: Content
    init(minimumWidth: CGFloat = 340, @ViewBuilder content: () -> Content) { self.minimumWidth = minimumWidth; self.content = content() }
    var body: some View { LazyVGrid(columns: [GridItem(.adaptive(minimum: minimumWidth), spacing: 16, alignment: .top)], alignment: .leading, spacing: 16) { content } }
}
struct OverviewShowcase: View {
    @Environment(\.fabricatorTheme) private var theme
    var toaster: FabricatorToaster
    @State private var name = "Alex Morgan"
    @State private var email = "alex@fabricator.design"
    @State private var notifications = true
    @State private var marketing = false
    @State private var slider: Double = 64
    @State private var rating = 4
    @State private var selection = "Monthly"
    var body: some View {
        GalleryGrid {
            FabricatorCard("Buttons", description: "Clear actions, six familiar variants.") {
                FabricatorFlowLayout(spacing: 8) {
                    FabricatorButton("Create project", icon: "plus") { toaster.show("Project created", description: "Your workspace is ready.", variant: .success) }
                    FabricatorButton("Secondary", variant: .secondary) { toaster.show("Secondary action") }
                    FabricatorButton("Outline", variant: .outline) { toaster.show("Outline action") }
                    FabricatorButton("Ghost", variant: .ghost) { toaster.show("Ghost action") }
                    FabricatorButton("Delete", icon: "trash", variant: .destructive) { toaster.show("Item moved to trash", variant: .destructive) }
                }
                FabricatorSeparator()
                HStack(spacing: 8) { FabricatorButton("Favorite", icon: "star", variant: .outline, size: .iconSm) { toaster.show("Added to favorites") }; FabricatorButton("Share", icon: "share-2", variant: .outline, size: .iconSm) { toaster.show("Share action") }; FabricatorButton("Download", icon: "download", variant: .outline, size: .iconSm) { toaster.show("Download started") }; Spacer(); FabricatorKbd("⌘ K"); Text("Quick actions").font(theme.font(11)).foregroundStyle(theme.color("muted-foreground")) }
            }
            FabricatorCard("Inputs & fields", description: "Thoughtful defaults for everyday forms.") {
                FabricatorField("Full name") { FabricatorInput("Your name", text: $name, icon: "user") }
                FabricatorField("Email address") { FabricatorInput("you@example.com", text: $email, icon: "mail") }
                HStack { Text("Native text editing and autofill").font(theme.font(11)).foregroundStyle(theme.color("muted-foreground")); Spacer(); FabricatorBadge("Ready", variant: .success, icon: "check") }
            }
            FabricatorCard("Selection controls", description: "Small details. Predictable behavior.") {
                FabricatorSwitch("Push notifications", isOn: $notifications)
                FabricatorCheckbox("Receive product updates", isOn: $marketing)
                FabricatorSeparator()
                HStack { Text("Volume").font(theme.font(theme.text(), weight: .medium)); Spacer(); Text("\(Int(slider))%").font(theme.font(11)).monospacedDigit().foregroundStyle(theme.color("muted-foreground")) }
                FabricatorSlider("Volume", value: $slider)
            }
            FabricatorCard("Status & feedback", description: "A quiet hierarchy, with color that means something.") {
                FabricatorFlowLayout(spacing: 6) { FabricatorBadge("Active", variant: .success, icon: "circle-check"); FabricatorBadge("In review", variant: .warning, icon: "clock-3"); FabricatorBadge("Information", variant: .info); FabricatorBadge("Archived", variant: .outline) }
                FabricatorAlert("All changes saved", message: "Your team can see the latest version.", variant: .success, icon: "circle-check")
                HStack { HStack(spacing: -6) { FabricatorAvatar("Alex Morgan"); FabricatorAvatar("Sam Rivera"); FabricatorAvatar("Jordan Lee") }; Spacer(); Text("3 team members").font(theme.font(11)).foregroundStyle(theme.color("muted-foreground")) }
            }
            FabricatorCard("Activity", description: "Shared chart tokens, rendered natively.") {
                HStack(alignment: .firstTextBaseline, spacing: 8) { Text("12,864").font(theme.font(28, weight: .semibold)).tracking(-1); FabricatorBadge("+18.6%", variant: .success, icon: "trending-up"); Spacer() }
                FabricatorChart(.area, data: DemoData.chart, height: 145, label: "Weekly activity")
            }
            FabricatorCard("Composed by you", description: "Reusable parts that work together.") {
                FabricatorTabs(["Monthly", "Yearly"], selection: $selection) {
                    HStack(alignment: .firstTextBaseline, spacing: 4) { Text(selection == "Monthly" ? "$24" : "$240").font(theme.font(28, weight: .semibold)).tracking(-1); Text(selection == "Monthly" ? "/ month" : "/ year").foregroundStyle(theme.color("muted-foreground")); Spacer(); FabricatorBadge("Pro", variant: .default) }
                    Text("Everything you need to build your next idea.").font(theme.font(theme.text(12))).foregroundStyle(theme.color("muted-foreground"))
                    VStack(alignment: .leading, spacing: 12) { FabricatorRating(value: $rating); FabricatorButton("Choose plan", variant: .outline) { toaster.show("Pro plan selected", variant: .success) } }
                }
            }
        }
    }
}
enum DemoData {
    static let statusPeriods: [FabricatorStatusPeriod] = (0..<90).map { day in
        let status = day == 42 ? "outage" : day == 73 ? "degraded" : day == 18 ? "maintenance" : "operational"
        return FabricatorStatusPeriod(id: "day-\(day)", label: "Day \(day + 1)", status: status, note: status == "operational" ? "All systems operational" : "Incident resolved")
    }
    static let chart: [FabricatorChartDatum] = {
        let labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        let values: [Double] = [32, 46, 39, 67, 56, 78, 92]
        return labels.indices.map { index in
            let value = values[index]
            return FabricatorChartDatum(id: labels[index], label: labels[index], value: value, secondary: value * 0.7, low: value * 0.65, high: value * 1.2)
        }
    }()
    static let categories = [FabricatorChartDatum(id: "desktop", label: "Desktop", value: 48), FabricatorChartDatum(id: "mobile", label: "Mobile", value: 32), FabricatorChartDatum(id: "tablet", label: "Tablet", value: 20)]
    static let columns = [FabricatorTableColumn("name", title: "Customer"), FabricatorTableColumn("status", title: "Status"), FabricatorTableColumn("amount", title: "Amount", isNumeric: true)]
    static let rows = [FabricatorTableRow(id: "1", cells: ["name": "Alex Morgan", "status": "Paid", "amount": "250"]), FabricatorTableRow(id: "2", cells: ["name": "Sam Rivera", "status": "Pending", "amount": "150"]), FabricatorTableRow(id: "3", cells: ["name": "Jordan Lee", "status": "Paid", "amount": "350"]), FabricatorTableRow(id: "4", cells: ["name": "Taylor Brooks", "status": "Paid", "amount": "450"])]
    static let invoiceColumns = [FabricatorTableColumn("invoice", title: "Invoice"), FabricatorTableColumn("status", title: "Status"), FabricatorTableColumn("method", title: "Method"), FabricatorTableColumn("amount", title: "Amount", isNumeric: true)]
    static let invoiceRows = [
        FabricatorTableRow(id: "INV001", cells: ["invoice": "INV001", "status": "Paid", "method": "Credit Card", "amount": "$250.00"]),
        FabricatorTableRow(id: "INV002", cells: ["invoice": "INV002", "status": "Pending", "method": "PayPal", "amount": "$150.00"]),
        FabricatorTableRow(id: "INV003", cells: ["invoice": "INV003", "status": "Unpaid", "method": "Bank Transfer", "amount": "$350.00"]),
        FabricatorTableRow(id: "INV004", cells: ["invoice": "INV004", "status": "Paid", "method": "Credit Card", "amount": "$450.00"]),
        FabricatorTableRow(id: "INV005", cells: ["invoice": "INV005", "status": "Paid", "method": "PayPal", "amount": "$550.00"]),
        FabricatorTableRow(id: "INV006", cells: ["invoice": "INV006", "status": "Pending", "method": "Bank Transfer", "amount": "$200.00"]),
        FabricatorTableRow(id: "INV007", cells: ["invoice": "INV007", "status": "Unpaid", "method": "Credit Card", "amount": "$300.00"])
    ]
    static let tree = [FabricatorFileNode(id: "app", name: "app", children: [FabricatorFileNode(id: "ui", name: "ui", children: [FabricatorFileNode(id: "button", name: "button.swift"), FabricatorFileNode(id: "card", name: "card.swift")]), FabricatorFileNode(id: "main", name: "main.swift")]), FabricatorFileNode(id: "package", name: "Package.swift")]
    static func chartData(for kind: FabricatorChartKind) -> [FabricatorChartDatum] {
        if kind == .heatCalendar {
            var days: [FabricatorChartDatum] = []
            for day in 0..<210 {
                let amount: Int = (day * 7 + 13) % 12
                days.append(FabricatorChartDatum(id: String(day), label: "Day \(day + 1)", value: Double(amount)))
            }
            return days
        }
        if [.donut, .pie, .radial, .treemap, .radar, .funnel].contains(kind) {
            return categories + [FabricatorChartDatum(id: "other", label: "Other", value: 12), FabricatorChartDatum(id: "direct", label: "Direct", value: 28)]
        }
        return chart
    }
}
