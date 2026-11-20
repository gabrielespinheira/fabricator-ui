import SwiftUI
import FabricatorUI
import AVFoundation

struct FormsShowcase: View {
    var toaster: FabricatorToaster
    @State private var name = "Alex Morgan"
    @State private var email = "alex@fabricator.design"
    @State private var role = "Designer"
    @State private var selection = FabricatorSelection(values: ["Design", "Product"], maximum: 3)
    @State private var date = Date.now
    @State private var quantity = 3.0
    @State private var code = ""
    @State private var files: [URL] = []
    @State private var color = Color.blue
    @State private var submitted = false
    var body: some View {
        GalleryGrid {
            FabricatorCard("Profile", description: "Labels, descriptions and validation stay together.") {
                FabricatorForm(validate: { submitted = true; return email.contains("@") && !name.isEmpty }, onSubmit: { toaster.show("Profile updated", variant: .success) }) {
                    FabricatorField("Name", error: submitted && name.isEmpty ? "Enter your name." : nil) { FabricatorInput("Full name", text: $name, isInvalid: submitted && name.isEmpty) }
                    FabricatorField("Email", description: "We'll use this for account notifications.", error: submitted && !email.contains("@") ? "Enter a valid email address." : nil) { FabricatorInput("Email address", text: $email, icon: "mail", isInvalid: submitted && !email.contains("@")) }
                    FabricatorField("Role") { FabricatorCombobox("Choose a role", options: ["Designer", "Engineer", "Product manager", "Founder"], selection: $role) }
                }
            }
            FabricatorCard("Pickers & selection", description: "Same intent, platform-native interaction.") {
                FabricatorField("Interests", description: "Choose up to three.") { FabricatorMultiSelect(options: ["Design", "Engineering", "Product", "Marketing", "Research"], selection: $selection) }
                FabricatorField("Start date") { FabricatorDatePicker(selection: $date) }
                FabricatorField("Reminder") { FabricatorTimeInput("Reminder", selection: $date) }
                FabricatorColorPicker("Project color", selection: $color)
                FabricatorField("Team seats") { FabricatorNumberField("Seats", value: $quantity, in: 1...20) }
            }
            FabricatorCard("Calendar", description: "Keyboard and touch selection, with month navigation.") { FabricatorCalendarView(selection: $date).frame(maxWidth: .infinity) }
            FabricatorCard("Verify & upload", description: "Native autofill and the system document picker.") {
                FabricatorField("Verification code") { FabricatorInputOTP(code: $code) { _ in toaster.show("Code entered", variant: .success) } }
                FabricatorFileUpload(files: $files)
            }
        }
    }
}
struct ChartsShowcase: View {
    var body: some View {
        GalleryGrid {
            ForEach(FabricatorChartKind.allCases, id: \.self) { kind in
                FabricatorCard(kind == .heatCalendar ? "Heat Calendar" : kind.rawValue.capitalized) {
                    FabricatorChart(kind, data: DemoData.chartData(for: kind))
                }
            }
            FabricatorCard("Bump Chart") { FabricatorBumpChart([FabricatorBumpSeries(id: "a", title: "Design", ranks: [1, 2, 1, 3]), FabricatorBumpSeries(id: "b", title: "Engineering", ranks: [2, 1, 3, 1]), FabricatorBumpSeries(id: "c", title: "Product", ranks: [3, 3, 2, 2])], labels: ["Q1", "Q2", "Q3", "Q4"]) }
            FabricatorCard("Sankey Chart") { SankeyDemo() }
            FabricatorCard("Service health", description: "Availability over the past 90 days.") { FabricatorStatusBar(DemoData.statusPeriods) }
        }
    }
}
struct SankeyDemo: View {
    var body: some View { FabricatorSankeyChart(nodes: [FabricatorSankeyNode(id: "web", title: "Web", column: 0), FabricatorSankeyNode(id: "mobile", title: "Mobile", column: 0), FabricatorSankeyNode(id: "trial", title: "Trial", column: 1), FabricatorSankeyNode(id: "paid", title: "Paid", column: 2), FabricatorSankeyNode(id: "free", title: "Free", column: 2)], links: [FabricatorSankeyLink(source: "web", target: "trial", value: 60), FabricatorSankeyLink(source: "mobile", target: "trial", value: 40), FabricatorSankeyLink(source: "trial", target: "paid", value: 65), FabricatorSankeyLink(source: "trial", target: "free", value: 35)]) }
}
struct ChatShowcase: View {
    @State private var messages = [FabricatorChatMessage(author: "Alex Morgan", content: "Can we use the same design system on iPhone and Mac?", isOutgoing: true), FabricatorChatMessage(author: "Fabricator", content: "Yes. **Shared design tokens** keep colors, spacing and typography consistent.\n\n- SwiftUI renders native controls.\n- Components keep the same variants.\n- Your app owns the source.")]
    @State private var text = ""
    @State private var attachments: [URL] = []
    @State private var model = "Fabricator Assistant"
    var body: some View {
        FabricatorCard {
            HStack { FabricatorBotFace(state: .listening, size: 38); VStack(alignment: .leading, spacing: 3) { FabricatorText("Design assistant", role: .heading); FabricatorText("A local UI demonstration", role: .caption) }; Spacer(); FabricatorBadge("Online", variant: .success) }
            FabricatorSeparator()
            FabricatorMessageScroller(messages).frame(minHeight: 300, maxHeight: 440)
            FabricatorChatInput(text: $text, attachments: $attachments) {
                let message = text; guard !message.isEmpty || !attachments.isEmpty else { return }
                messages.append(FabricatorChatMessage(author: "Alex Morgan", content: message.isEmpty ? "Shared \(attachments.count) attachment(s)" : message, isOutgoing: true)); text = ""; attachments = []
                messages.append(FabricatorChatMessage(author: "Fabricator", content: "This is a local component demo. Connect your preferred model to handle messages in your app."))
            }
            FabricatorModelPicker(["Fabricator Assistant", "Fast model", "Reasoning model"], selection: $model).frame(maxWidth: 240)
        }
    }
}
struct ShellShowcase: View {
    @Environment(\.fabricatorTheme) private var theme
    var onCatalog: (() -> Void)? = nil
    @State private var selection = "launch"
    @State private var inspector = "details"
    var body: some View {
        GeometryReader { geometry in
            let isCompact = geometry.size.width < 700
            shell(isCompact: isCompact, width: geometry.size.width).overlay(alignment: .bottom) {
                if !isCompact, let onCatalog { FabricatorButton("Catalog", icon: "arrow-left", variant: .ghost, size: .sm) { onCatalog() } }
            }
        }
    }
    private func shell(isCompact: Bool, width: CGFloat) -> some View {
        let panelWidth: CGFloat = width < 1200 ? 240 : 320
        return FabricatorAppShell("Q4 launch", groups: [
            FabricatorNavigationGroup("", items: [
                FabricatorNavigationItem(id: "home", title: "Home", icon: "house"),
                FabricatorNavigationItem(id: "inbox", title: "Inbox", icon: "inbox", badge: "12"),
                FabricatorNavigationItem(id: "calendar", title: "Calendar", icon: "calendar")
            ]),
            FabricatorNavigationGroup("Workspace", items: [
                FabricatorNavigationItem(id: "projects", title: "Projects", icon: "box", children: [
                    FabricatorNavigationItem(id: "launch", title: "Q4 launch", icon: ""),
                    FabricatorNavigationItem(id: "website", title: "Website", icon: ""),
                    FabricatorNavigationItem(id: "mobile", title: "Mobile app", icon: "")
                ]),
                FabricatorNavigationItem(id: "docs", title: "Documents", icon: "file-text"),
                FabricatorNavigationItem(id: "team", title: "Team", icon: "users"),
                FabricatorNavigationItem(id: "reports", title: "Reports", icon: "chart-line")
            ]),
            FabricatorNavigationGroup("Support", items: [
                FabricatorNavigationItem(id: "help", title: "Help center", icon: "life-buoy"),
                FabricatorNavigationItem(id: "settings", title: "Settings", icon: "settings")
            ])
        ], selection: $selection, sidebarWidth: 256, panelWidth: panelWidth, status: "Synced", statusTrailing: "12 tasks", workspaces: ["Fabricator", "Studio", "Lab"], workspaceDetail: "Studio", breadcrumb: ["Fabricator", "Projects", "Q4 launch"]) {
            if isCompact, let onCatalog { FabricatorButton("Catalog", icon: "arrow-left", variant: .ghost, size: .icon) { onCatalog() } }
            HStack(spacing: theme.space(4)) {
                FabricatorButton("Search", icon: "search", variant: .ghost, size: .icon) {}
                FabricatorButton("Share", icon: "share", variant: .ghost, size: .icon) {}
                FabricatorButton("New task", icon: "plus") {}
            }
        } content: {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    Text("Q4 launch").font(theme.font(24, weight: .semibold)).tracking(-0.4)
                    Text("Scroll down: the page title takes the breadcrumb's place in the header. Press F6 to move between the sidebar, the page and the panel.").font(theme.bodyFont).foregroundStyle(theme.color("muted-foreground")).fixedSize(horizontal: false, vertical: true)
                    ForEach(0..<8, id: \.self) { _ in RoundedRectangle(cornerRadius: theme.radius("xl"), style: .continuous).fill(theme.color("muted").opacity(0.5)).frame(height: 128) }
                }.padding(24).frame(maxWidth: 896, alignment: .leading).frame(maxWidth: .infinity)
            }
        } panel: {
            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: theme.space(6)) {
                    HStack(spacing: 0) {
                        ForEach([("details", "Details", "info"), ("activity", "Activity", "activity"), ("comments", "Comments", "message-square")], id: \.0) { id, title, icon in
                            let isSelected = inspector == id
                            Button { inspector = id } label: {
                                FabricatorIcon(icon, size: 16, strokeWidth: isSelected ? 2 : 1.5).foregroundStyle(theme.color(isSelected ? "foreground" : "muted-foreground")).frame(width: 32, height: theme.space(28)).fabricatorSurface(radius: "lg", elevation: isSelected ? "raised" : nil, fill: isSelected ? (theme.colorScheme == .dark ? theme.color("foreground").opacity(0.14) : theme.color("surface-4")) : .clear)
                            }.buttonStyle(.plain).accessibilityLabel(title).accessibilityAddTraits(isSelected ? .isSelected : [])
                        }
                    }.padding(theme.space(4)).background(theme.color("foreground").opacity(0.05), in: RoundedRectangle(cornerRadius: theme.radius("xl"), style: .continuous))
                    Spacer(minLength: 0)
                    FabricatorButton("Close inspector", icon: "panel-right", variant: .ghost, size: .iconSm) {}
                }.padding(.horizontal, theme.space(8)).frame(height: theme.space(48))
                Group {
                    if inspector == "details" {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Q4 launch").font(theme.font(theme.text(), weight: .medium))
                            Text("Drag the panel's edge to resize it, or past its minimum to close it. Press ⌘\\ to toggle it.").font(theme.bodyFont).foregroundStyle(theme.color("muted-foreground")).fixedSize(horizontal: false, vertical: true)
                        }
                    } else if inspector == "activity" {
                        Text("Nothing new today.").font(theme.bodyFont).foregroundStyle(theme.color("muted-foreground"))
                    } else {
                        Text("No comments yet.").font(theme.bodyFont).foregroundStyle(theme.color("muted-foreground"))
                    }
                }.padding(16).frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            }
        }
    }
}

struct ComponentDetail: View {
    @Environment(\.fabricatorTheme) private var theme
    @Environment(\.dynamicTypeSize) private var textSize
    var name: String
    var toaster: FabricatorToaster
    @State private var text = ""
    @State private var profileName = "Pedro Duarte"
    @State private var fruit = ""
    @State private var username = "@peduarte"
    @State private var isOn = true
    @State private var secondIsOn = false
    @State private var invalidIsOn = true
    @State private var radioSelection = "Comfortable"
    @State private var invalidRadioSelection = "Invalid choice"
    @State private var selected = "Design"
    @State private var multi = FabricatorSelection(values: ["Design"])
    @State private var value = 64.0
    @State private var rating = 4
    @State private var date = Date.now
    @State private var color = Color.blue
    @State private var files: [URL] = []
    @State private var isPresented = false
    @State private var expanded: Set<String> = ["first"]
    @State private var page = 0
    @State private var ratio = 0.5
    @State private var selectedFile: String?
    @State private var expandedFiles: Set<String> = ["app", "ui"]
    @State private var events: [FabricatorEvent] = []
    @State private var questionnaire = FabricatorQuestionnaireState()
    @State private var tabs = [FabricatorTab(id: "design", title: "Design", icon: "pen-tool"), FabricatorTab(id: "code", title: "Code", icon: "code"), FabricatorTab(id: "preview", title: "Preview", icon: "eye")]
    @State private var tab = "Overview"
    @State private var password = ""
    private var choices: [String] { ["Design", "Engineering", "Product", "Research"] }
    private var cardDemo: some View {
        FabricatorCard {
            HStack(alignment: .top, spacing: theme.space(4)) {
                FabricatorCardHeader("Login to your account", description: "Enter your email below to login to your account").frame(maxWidth: .infinity, alignment: .leading)
                FabricatorButton("Sign Up", variant: .link) { toaster.show("Sign up selected") }.fixedSize()
            }
            VStack(spacing: theme.space(24)) {
                VStack(alignment: .leading, spacing: theme.space(8)) {
                    FabricatorLabel("Email")
                    FabricatorInput("m@example.com", text: $text)
                }
                VStack(alignment: .leading, spacing: theme.space(8)) {
                    HStack {
                        FabricatorLabel("Password")
                        Spacer(minLength: theme.space(8))
                        Button { toaster.show("Password reset selected") } label: { Text("Forgot your password?").font(theme.font(14)).foregroundStyle(theme.color("foreground")).frame(minHeight: 20) }.buttonStyle(.plain)
                    }
                    FabricatorInput("", text: $password, isSecure: true).accessibilityLabel("Password")
                }
            }
            VStack(spacing: theme.space(8)) {
                FabricatorButton("Login", fillsWidth: true) { toaster.show("Signed in", variant: .success) }
                FabricatorButton("Login with Google", variant: .outline, fillsWidth: true) { toaster.show("Google sign-in requested") }
            }
        }.frame(maxWidth: 384).frame(maxWidth: .infinity)
    }
    private var tabsDemo: some View {
        VStack(alignment: .leading, spacing: 16) {
            FabricatorTabs(["Overview", "Analytics", "Reports", "Settings"], selection: $tab, gooey: .init(effect: .move, intensity: 1, waviness: 0.35)) {
                FabricatorCard {
                    Text(tab).font(theme.font(theme.text(14), weight: .medium))
                    Text(tab == "Overview" ? "View your key metrics and recent project activity. Track progress across all your active projects." : "Nothing new in \(tab.lowercased()) yet.").font(theme.bodyFont).foregroundStyle(theme.color("muted-foreground")).fixedSize(horizontal: false, vertical: true)
                    if tab == "Overview" { Text("You have 12 active projects and 3 pending tasks.").font(theme.bodyFont).padding(.top, 8) }
                }
            }
        }.frame(maxWidth: 420, alignment: .leading).frame(maxWidth: .infinity)
    }
    private var checkboxDemo: some View {
        VStack(alignment: .leading, spacing: theme.space(16)) {
            FabricatorCheckbox("Accept terms and conditions", isOn: $isOn)
            FabricatorCheckbox("Receive product updates", isOn: $secondIsOn)
            FabricatorCheckbox("Indeterminate selection", isOn: .constant(false), isIndeterminate: true)
            FabricatorCheckbox("Invalid selection", isOn: $invalidIsOn, isInvalid: true)
            FabricatorCheckbox("Disabled unchecked", isOn: .constant(false)).disabled(true)
            FabricatorCheckbox("Disabled checked", isOn: .constant(true)).disabled(true)
        }.frame(maxWidth: 384)
    }
    private var switchDemo: some View {
        VStack(alignment: .leading, spacing: theme.space(16)) {
            FabricatorSwitch("Push notifications", isOn: $isOn)
            FabricatorSwitch("Marketing updates", isOn: $secondIsOn)
            FabricatorSwitch("Invalid setting", isOn: $invalidIsOn, isInvalid: true)
            FabricatorSwitch("Disabled unchecked", isOn: .constant(false)).disabled(true)
            FabricatorSwitch("Disabled checked", isOn: .constant(true)).disabled(true)
        }.frame(maxWidth: 384)
    }
    private var radioDemo: some View {
        VStack(alignment: .leading, spacing: theme.space(24)) {
            FabricatorRadioGroup(["Default", "Comfortable", "Compact"], selection: $radioSelection)
            FabricatorRadioGroup(["Invalid choice", "Other choice"], selection: $invalidRadioSelection, isInvalid: true)
            FabricatorRadioGroup(["Disabled unchecked", "Disabled checked"], selection: .constant("Disabled checked")).disabled(true)
        }.frame(maxWidth: 384)
    }
    private var actions: [FabricatorMenuItem] { [FabricatorMenuItem(title: "Edit", icon: "pencil") { toaster.show("Edit selected") }, FabricatorMenuItem(title: "Duplicate", icon: "copy") { toaster.show("Item duplicated", variant: .success) }, FabricatorMenuItem(title: "Delete", icon: "trash", isDestructive: true) { toaster.show("Item deleted", variant: .destructive) }] }
    var body: some View {
        if name == "app-shell" { ShellShowcase() }
        else if name == "card" { cardDemo }
        else if name == "tabs" { tabsDemo }
        else if name.hasPrefix("login-") || name.hasPrefix("signup-") || name.hasPrefix("sidebar-") || name.hasPrefix("app-shell-") || name == "preview-03" { FabricatorBlock(name, onSubmit: { _ in toaster.show("Form submitted", variant: .success) }, onAction: { toaster.show($0) }, onProviderSignIn: { toaster.show("\($0.capitalized) sign-in requested", description: "Connect your authentication adapter in your app.") }).frame(minHeight: 520) }
        else if name.hasSuffix("-chart") || name == "heat-calendar" || name == "treemap" || name == "status-bar" { chartDetail }
        else if ["chat-input", "message", "message-scroller", "bubble"].contains(name) { ChatShowcase() }
        else {
            detail.frame(maxWidth: ["data-table", "event-calendar", "editor", "resizable", "menubar"].contains(name) ? .infinity : 760, alignment: .leading).frame(maxWidth: .infinity, alignment: .leading)
        }
    }
    @ViewBuilder private var detail: some View {
        switch name {
        case "button": FabricatorFlowLayout { ForEach(FabricatorButtonVariant.allCases, id: \.self) { variant in FabricatorButton(variant.rawValue.capitalized, icon: "plus", variant: variant) { toaster.show("\(variant.rawValue.capitalized) pressed") } }; FabricatorButton("Disabled", action: {}).disabled(true); FabricatorButton("Saving", isLoading: true) {} }
        case "input": FabricatorInput("Email address", text: $text, icon: "mail"); FabricatorInput("Password", text: $text, isSecure: true); FabricatorInput("Invalid input", text: $text, isInvalid: true)
        case "textarea": FabricatorTextarea("Write your message…", text: $text)
        case "checkbox": checkboxDemo
        case "switch": switchDemo
        case "radio-group": radioDemo
        case "badge": FabricatorFlowLayout { ForEach(FabricatorBadgeVariant.allCases, id: \.self) { FabricatorBadge($0.rawValue.capitalized, variant: $0) } }
        case "avatar": HStack { FabricatorAvatar("Alex Morgan", size: 24); FabricatorAvatar("Sam Rivera"); FabricatorAvatar("Jordan Lee", size: 44); FabricatorAvatar("Taylor Brooks", size: 64) }.accessibilityElement(children: .contain).accessibilityIdentifier("fabricator-avatar-example")
        case "rating": FabricatorRating(value: $rating); FabricatorText("\(rating) out of 5", role: .caption)
        case "slider": FabricatorSlider("Volume", value: $value, gooey: .init(effect: .bend, intensity: 1, waviness: 0.6)); FabricatorText("\(Int(value))%", role: .caption)
        case "gooey": GooeyDemo()
        case "toggle": FabricatorToggle("Bold", isOn: $isOn)
        case "toggle-group": FabricatorToggleGroup(choices, selection: $selected)
        case "kbd": HStack { FabricatorKbd("⌘ K"); FabricatorKbd("⌘ ⇧ P"); FabricatorKbd("esc") }
        case "label": FabricatorLabel("Your email address"); FabricatorInput("Email", text: $text)
        case "separator": FabricatorText("Components"); FabricatorSeparator(); FabricatorText("Consistent spacing and hierarchy", role: .caption)
        case "skeleton": HStack { FabricatorSkeleton(width: 40, height: 40); VStack { FabricatorSkeleton(height: 12); FabricatorSkeleton(width: 180, height: 12) } }
        case "spinner": FabricatorFlowLayout(spacing: 12) { ForEach(FabricatorSpinner.definitions) { definition in VStack(spacing: 12) { FabricatorSpinner(variant: definition.value, size: 32); FabricatorText(definition.label, role: .caption) }.frame(width: 100, height: 86) } }
        case "aspect-ratio": FabricatorAspectRatio { LinearGradient(colors: [theme.color("chart-series-1").opacity(0.2), theme.color("chart-series-3").opacity(0.3)], startPoint: .topLeading, endPoint: .bottomTrailing).overlay { FabricatorIcon("image", size: 40).foregroundStyle(theme.color("foreground").opacity(0.4)) } }
        case "scroll-area": FabricatorScrollArea { VStack { ForEach(1...30, id: \.self) { FabricatorItem("Component \($0)", icon: "box"); FabricatorSeparator() } } }.frame(height: 300)
        case "density": DensityDemo()
        case "theme-toggle": FabricatorThemeToggle(isDark: $isOn); FabricatorText("Use the appearance button in the toolbar to change this gallery.", role: .caption)
        case "typography", "text": FabricatorText("The quick brown fox", role: .title); FabricatorText("Calm, precise interfaces", role: .heading); FabricatorText("Shared typography keeps every platform familiar."); FabricatorText("Supporting information", role: .caption); FabricatorText("let fabricator = DesignSystem()", role: .code)
        case "fabricator-root": FabricatorRoot(colorScheme: isOn ? .dark : .light) { FabricatorCard("Scoped appearance") { FabricatorButton("Toggle local theme") { isOn.toggle() } } }
        case "field", "form": FormsShowcase(toaster: toaster)
        case "input-group": FabricatorInputGroup("Your website", text: $text) { Text("https://") } trailing: { FabricatorKbd("⌘ ↵") }
        case "button-group": FabricatorButtonGroup { FabricatorButton("Save", icon: "check", variant: .secondary) { toaster.show("Saved", variant: .success) }; FabricatorButton("More", icon: "chevron-down", variant: .secondary, size: .icon) { isPresented = true } }
        case "search": FabricatorSearch(query: $text); ForEach(choices.filter { text.isEmpty || $0.localizedCaseInsensitiveContains(text) }, id: \.self) { FabricatorItem($0, icon: "search") }
        case "select": FabricatorSelect("Select a fruit", options: ["Apple", "Banana", "Blueberry", "Grapes", "Pineapple"], selection: $fruit, groupLabel: "Fruits").frame(maxWidth: textSize.isAccessibilitySize ? 360 : 180)
        case "combobox": FabricatorCombobox("Search teams…", options: choices, selection: $selected)
        case "multi-select": FabricatorMultiSelect(options: choices, selection: $multi)
        case "number-field": FabricatorNumberField("Quantity", value: $value, in: 0...100)
        case "input-otp": FabricatorInputOTP(code: $text) { _ in toaster.show("Code entered") }
        case "calendar": CalendarDemo()
        case "date-picker": DatePickerDemo()
        case "time-input": TimeInputDemo()
        case "time-wheel": TimeWheelDemo()
        case "color-picker": FabricatorColorPicker("Accent color", selection: $color)
        case "file-upload": FabricatorFileUpload(files: $files)
        case "accordion": FabricatorAccordion([FabricatorAccordionItem(id: "first", title: "Is this native SwiftUI?", content: "Yes. These controls render with SwiftUI, UIKit and AppKit. No webview is used."), FabricatorAccordionItem(id: "second", title: "Can I customize the source?", content: "Every component is copy-in source that belongs to your project.")], expanded: $expanded)
        case "collapsible": FabricatorCollapsible("Show project details", isExpanded: $isOn) { FabricatorItem("Fabricator UI", description: "A design system for every platform.", icon: "component") }
        case "tabs": EmptyView()
        case "tab-strip": FabricatorTabStrip(tabs: $tabs, selection: $selected)
        case "breadcrumb": FabricatorBreadcrumb(["Workspace", "Projects", "Fabricator UI"]) { toaster.show("Opened breadcrumb \($0 + 1)") }
        case "pagination": FabricatorPagination(page: $page, pageCount: 10)
        case "card": EmptyView()
        case "item": FabricatorItem("Design system", description: "Updated 5 minutes ago", icon: "component", accessory: "chevron-right")
        case "navigation-menu": FabricatorNavigationMenu(groups: ["Product": ["Components", "Icons", "Templates"], "Resources": ["Documentation", "Changelog"]]) { toaster.show($0) }
        case "sidebar", "app-nav": FabricatorAppNav([FabricatorNavigationItem(id: "Design", title: "Design", icon: "pen-tool"), FabricatorNavigationItem(id: "Engineering", title: "Engineering", icon: "code"), FabricatorNavigationItem(id: "Product", title: "Product", icon: "box")], selection: $selected).frame(height: 250)
        case "workspace-switcher": FabricatorWorkspaceSwitcher(choices, selection: $selected) { toaster.show("Create workspace selected") }
        case "user-menu": FabricatorUserMenu("Alex Morgan", email: "alex@fabricator.design", onSettings: { toaster.show("Account settings selected") }, onSignOut: { toaster.show("Sign out selected") })
        case "carousel": FabricatorCarousel(count: 5, selection: $page) { index in FabricatorCard { Text(String(index + 1)).font(theme.font(56, weight: .semibold)).frame(maxWidth: .infinity).frame(height: 150) } }
        case "preview-rail": FabricatorPreviewRail(count: 6, selection: $page) { index in Text("\(index + 1)").font(theme.font(24, weight: .medium)).frame(width: 100, height: 80).background(theme.color("hover"), in: RoundedRectangle(cornerRadius: 8)) }
        case "resizable": FabricatorResizable(ratio: $ratio) { Text("Sidebar").frame(maxWidth: .infinity, maxHeight: .infinity).background(theme.color("hover")) } trailing: { Text("Content").frame(maxWidth: .infinity, maxHeight: .infinity) }.frame(height: 250)
        case "direction": FabricatorDirection(isOn ? .rightToLeft : .leftToRight) { FabricatorItem("Direction-aware layout", description: "Leading and trailing adapt automatically.", icon: "arrow-right", accessory: "chevron-right") }; FabricatorSwitch("Right to left", isOn: $isOn)
        case "dialog", "sheet", "drawer", "alert-dialog", "popover", "hover-card", "tooltip", "dropdown-menu", "context-menu", "menubar", "command": overlayDetail
        case "alert": FabricatorAlert("Your workspace is ready", message: "Invite your team and start your first project.", variant: .info); FabricatorAlert("Payment failed", message: "Update your billing details to continue.", variant: .destructive, icon: "circle-alert")
        case "empty":
            let linkTheme = FabricatorTheme(density: .compact)
            FabricatorEmpty("No Projects Yet", description: "You haven't created any projects yet. Get started by creating your first project.", icon: "folder-code") {
                VStack(spacing: theme.space(16)) {
                    HStack(spacing: 8) {
                        FabricatorButton("Create Project") { toaster.show("Project created", variant: .success) }
                        FabricatorButton("Import Project", variant: .outline) { toaster.show("Import project selected") }
                    }
                    Button { toaster.show("Learn more selected") } label: {
                        HStack(spacing: linkTheme.space(6)) { Text("Learn More"); FabricatorIcon("arrow-up-right", size: linkTheme.icon()) }
                            .foregroundStyle(theme.color("muted-foreground"))
                    }.buttonStyle(FabricatorButtonStyle(variant: .link, size: .sm))
                }
            }
        case "progress": FabricatorProgress(value: value / 100); FabricatorSlider("Progress", value: $value)
        case "toast", "sonner": FabricatorButton("Show notification", icon: "bell") { toaster.show("Changes saved", description: "Your workspace is up to date.", variant: .success) }
        case "markdown": MarkdownDemo()
        case "syntax-highlight": SyntaxHighlightDemo()
        case "table": FabricatorTable(columns: DemoData.invoiceColumns, rows: DemoData.invoiceRows, caption: "A list of your recent invoices.", footer: FabricatorTableRow(id: "total", cells: ["invoice": "Total", "amount": "$2,500.00"]), columnWidths: ["invoice": 100], emphasizedColumns: ["invoice"]).accessibilityIdentifier("fabricator-invoice-table")
        case "data-table": DataTableDemo()
        case "file-tree": FileTreeDemo()
        case "event-calendar": FabricatorEventCalendar(selection: $date, events: $events) { toaster.show($0.title) }.onAppear { if events.isEmpty { let start = Calendar.current.date(bySettingHour: 10, minute: 0, second: 0, of: date) ?? date; events = [FabricatorEvent(title: "Design review", start: start, end: start.addingTimeInterval(3600), category: "info"), FabricatorEvent(title: "Team sync", start: start.addingTimeInterval(7200), end: start.addingTimeInterval(9000), category: "success")] } }
        case "editor": EditorDemo()
        case "image-compare": FabricatorImageCompare(position: $ratio) { LinearGradient(colors: [.gray.opacity(0.2), .gray.opacity(0.7)], startPoint: .top, endPoint: .bottom).overlay { Text("Before").font(theme.font(28, weight: .semibold)) } } after: { LinearGradient(colors: [theme.color("chart-series-1").opacity(0.3), theme.color("chart-series-3").opacity(0.7)], startPoint: .topLeading, endPoint: .bottomTrailing).overlay { Text("After").font(theme.font(28, weight: .semibold)) } }.frame(height: 280)
        case "audio-player", "video-player": MediaDemo(isVideo: name == "video-player")
        case "attachment": FabricatorAttachment("design-system.pdf", detail: "PDF · 2.4 MB") { toaster.show("Attachment removed") }
        case "marker": FabricatorMarker("Today")
        case "model-picker": FabricatorModelPicker(["Design assistant", "Fast model", "Reasoning model"], selection: $selected)
        case "questionnaire": FabricatorQuestionnaire([FabricatorQuestion(id: "role", title: "What do you do?", options: choices), FabricatorQuestion(id: "size", title: "How large is your team?", options: ["Just me", "2–10 people", "11–50 people", "50+ people"])], state: $questionnaire) { _ in toaster.show("Preferences saved", variant: .success) }
        case "bot-face": BotFaceDemo()
        case "sounds", "sound-effects": SoundsDemo()
        default: FabricatorText("This catalog entry is not implemented in this renderer.", role: .caption)
        }
    }
    @ViewBuilder private var overlayDetail: some View {
        switch name {
        case "command": FabricatorCommand(choices.map { choice in FabricatorCommandItem(id: choice, title: choice, group: "Teams", icon: "users") { toaster.show("Opened \(choice)") } })
        case "dropdown-menu": FabricatorDropdownMenu("Project actions", items: actions)
        case "context-menu": FabricatorContextMenu(items: actions) { FabricatorEmpty("Project actions", description: "Touch and hold or right-click to open the context menu.", icon: "mouse-pointer-2") { EmptyView() } }
        case "menubar": FabricatorMenubar([("File", actions), ("Edit", actions), ("View", actions)])
        case "tooltip": FabricatorTooltip("Add this project to your favorites") { FabricatorButton("Favorite", icon: "star", variant: .outline) { toaster.show("Added to favorites") } }
        case "hover-card": FabricatorHoverCard { FabricatorLabel("@alexmorgan") } content: { FabricatorItem("Alex Morgan", description: "Product designer at Fabricator UI", icon: "user") }
        case "popover": FabricatorPopover(isPresented: $isPresented) { FabricatorButton("Open popover", variant: .outline) { isPresented = true } } content: { FabricatorField("Project name") { FabricatorInput("Name", text: $text) } }
        default:
            FabricatorButton("Open \(name.replacingOccurrences(of: "-", with: " "))", variant: .outline) { isPresented = true }
            if name == "alert-dialog" { FabricatorAlertDialog("Delete project?", message: "This action cannot be undone.", isPresented: $isPresented, confirmLabel: "Delete project", isDestructive: true) { toaster.show("Project deleted", variant: .destructive) } }
            else if name == "sheet" { FabricatorSheet("Edit profile", description: "Make changes to your profile here. Click save when you're done.", isPresented: $isPresented) { VStack(alignment: .leading, spacing: 24) { FabricatorField("Name") { FabricatorInput("Pedro Duarte", text: $profileName) }; FabricatorField("Username") { FabricatorInput("@peduarte", text: $username) }; Spacer(minLength: 0); VStack(spacing: 8) { FabricatorButton("Save changes", fillsWidth: true) { isPresented = false; toaster.show("Profile saved", variant: .success) }; FabricatorButton("Close", variant: .outline, fillsWidth: true) { isPresented = false } } }.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading) } }
            else if name == "drawer" { FabricatorDrawer("Daily goal", isPresented: $isPresented) { FabricatorNumberField("Goal", value: $value, in: 0...1000, step: 10); FabricatorButton("Set goal") { isPresented = false } } }
            else { FabricatorDialog("Edit profile", description: "Make changes to your profile here. Click save when you're done.", isPresented: $isPresented) { FabricatorField("Name") { FabricatorInput("Pedro Duarte", text: $profileName) }; FabricatorField("Username") { FabricatorInput("@peduarte", text: $username) }; HStack(spacing: 8) { Spacer(minLength: 0); FabricatorButton("Cancel", variant: .outline) { isPresented = false }; FabricatorButton("Save changes") { isPresented = false; toaster.show("Profile saved", variant: .success) } }.padding(.top, 8) } }
        }
    }
    @ViewBuilder private var chartDetail: some View {
        if name == "bump-chart" { FabricatorCard("Rankings") { FabricatorBumpChart([FabricatorBumpSeries(id: "a", title: "Design", ranks: [1, 2, 1, 3]), FabricatorBumpSeries(id: "b", title: "Engineering", ranks: [2, 1, 3, 1])], labels: ["Q1", "Q2", "Q3", "Q4"]) } }
        else if name == "sankey-chart" { FabricatorCard("Conversion flow") { SankeyDemo() } }
        else if name == "status-bar" { FabricatorCard("Service health", description: "Availability over the past 90 days.") { FabricatorStatusBar(DemoData.statusPeriods) } }
        else {
            let raw = name.replacingOccurrences(of: "-chart", with: "")
            let kind = name == "heat-calendar" ? FabricatorChartKind.heatCalendar : FabricatorChartKind(rawValue: raw) ?? .line
            FabricatorCard { FabricatorChart(kind, data: DemoData.chartData(for: kind), height: 280) }
        }
    }
}
struct FileTreeDemo: View {
    @Environment(\.fabricatorTheme) private var theme
    @State private var selected: String? = "src/app.tsx"
    @State private var expanded: Set<String> = ["src"]
    @State private var selectedState: String?
    @State private var expandedStates: Set<String> = []
    @State private var opened = "No file open"
    private let nodes = [
        FabricatorFileNode(id: "src", name: "src", children: [FabricatorFileNode(id: "src/app.tsx", name: "app.tsx"), FabricatorFileNode(id: "src/styles.css", name: "styles.css")]),
        FabricatorFileNode(id: "package.json", name: "package.json")
    ]
    var body: some View {
        VStack(alignment: .leading, spacing: theme.space(24)) {
            VStack(alignment: .leading, spacing: theme.space(12)) {
                FabricatorFileTree(nodes, selection: $selected, expanded: $expanded, onOpen: { opened = "Opened \($0.name)" }).accessibilityLabel("Source files")
                Text("\(opened). Double-click or press Enter to open.").font(theme.font(theme.text(12))).foregroundStyle(theme.color("muted-foreground"))
            }
            VStack(alignment: .leading, spacing: theme.space(8)) {
                FabricatorText("States", role: .heading)
                FabricatorFileTree([
                    FabricatorFileNode(id: "empty", name: "Empty folder", children: []),
                    FabricatorFileNode(id: "cache", name: ".cache", isMuted: true),
                    FabricatorFileNode(id: "disabled", name: ".env.local", isDisabled: true)
                ], selection: $selectedState, expanded: $expandedStates).accessibilityLabel("File states")
            }
        }.frame(maxWidth: 384, alignment: .leading)
    }
}

struct DensityDemo: View {
    var body: some View { VStack(alignment: .leading, spacing: 20) { ForEach([FabricatorDensity.compact, .regular, .spacious], id: \.self) { density in FabricatorRoot(density: density) { HStack { FabricatorText(density.rawValue.capitalized, role: .caption).frame(width: 80, alignment: .leading); FabricatorButton("Create project", icon: "plus") {}; FabricatorBadge("Active", variant: .success) } } } } }
}
struct BotFaceDemo: View {
    @State private var state = FabricatorBotFaceState.idle
    var body: some View { VStack(alignment: .leading, spacing: 24) { FabricatorFlowLayout(spacing: 20) { ForEach(FabricatorBotFaceShape.allCases, id: \.self) { shape in FabricatorBotFace(state: state, shape: shape, size: 72) } }; FabricatorSelect("Assistant state", options: FabricatorBotFaceState.allCases.map(\.rawValue), selection: Binding(get: { state.rawValue }, set: { state = FabricatorBotFaceState(rawValue: $0) ?? .idle })).frame(maxWidth: 280) } }
}
struct SoundsDemo: View {
    @State private var effects = FabricatorSoundEffects.shared
    var body: some View { VStack(alignment: .leading, spacing: 16) { FabricatorSwitch("Enable interface sounds", isOn: $effects.isEnabled); FabricatorSwitch("Enable haptics", isOn: $effects.isHapticsEnabled); FabricatorFlowLayout { ForEach(effects.definitions) { sound in FabricatorButton(sound.name, icon: "volume-2", variant: .outline) { effects.play(sound.name) } } } } }
}
struct MediaDemo: View {
    var isVideo: Bool
    @State private var selected: [URL] = []
    var body: some View { VStack(spacing: 16) { if let url = selected.first { if isVideo { FabricatorVideoPlayer(url: url) } else { FabricatorAudioPlayer(url.lastPathComponent, player: AVPlayer(url: url)) } }; FabricatorFileUpload(files: $selected, allowedTypes: isVideo ? [.movie] : [.audio], allowsMultipleSelection: false) } }
}
