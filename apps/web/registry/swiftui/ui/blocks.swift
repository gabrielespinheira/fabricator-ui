import SwiftUI

public struct FabricatorAuthValues: Sendable, Equatable {
    public var name: String
    public var email: String
    public var password: String
    public var confirmPassword: String
    public init(name: String = "", email: String = "", password: String = "", confirmPassword: String = "") {
        self.name = name; self.email = email; self.password = password; self.confirmPassword = confirmPassword
    }
}

private struct BlockAuthSpecification {
    enum Layout { case card, split, providerCard, imageCard, emailOnly }
    var name: String
    var isSignup: Bool
    var layout: Layout
    var title: String
    var description: String
    var hasName: Bool
    var hasPassword: Bool
    var hasConfirmation: Bool
    init(name: String) {
        self.name = name; isSignup = name.hasPrefix("signup-")
        switch name {
        case "login-01": layout = .card; title = "Login to your account"; description = "Enter your email below to login to your account"
        case "login-02": layout = .split; title = "Login to your account"; description = "Enter your email below to login to your account"
        case "login-03": layout = .providerCard; title = "Welcome back"; description = "Login with your Apple or Google account"
        case "login-04": layout = .imageCard; title = "Welcome back"; description = "Login to your Acme Inc account"
        case "login-05": layout = .emailOnly; title = "Welcome to Acme Inc."; description = ""
        case "signup-01": layout = .card; title = "Create an account"; description = "Enter your information below to create your account"
        case "signup-02": layout = .split; title = "Create your account"; description = "Fill in the form below to create your account"
        case "signup-03": layout = .providerCard; title = "Create your account"; description = "Enter your email below to create your account"
        case "signup-04": layout = .imageCard; title = "Create your account"; description = "Enter your email below to create your account"
        case "signup-05": layout = .emailOnly; title = "Welcome to Acme Inc."; description = ""
        default: preconditionFailure("Unknown authentication block: \(name)")
        }
        hasName = ["signup-01", "signup-02", "signup-03"].contains(name)
        hasPassword = layout != .emailOnly; hasConfirmation = isSignup && hasPassword
    }
}

/// Required fields follow each published template, including the email-only flows.
public func validateFabricatorAuthValues(_ values: FabricatorAuthValues, template: String) -> [String: String] {
    let specification = BlockAuthSpecification(name: template)
    var errors: [String: String] = [:]
    let email = values.email.trimmingCharacters(in: .whitespacesAndNewlines)
    let parts = email.split(separator: "@", omittingEmptySubsequences: false)
    let isValidEmail = parts.count == 2 && !parts[0].isEmpty && parts[1].contains(".") && parts[1].split(separator: ".", omittingEmptySubsequences: false).allSatisfy { !$0.isEmpty } && !email.contains(where: \.isWhitespace)
    if !isValidEmail { errors["email"] = "Enter a valid email address." }
    if specification.hasName && values.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { errors["name"] = "Enter your full name." }
    if specification.hasPassword {
        if values.password.isEmpty { errors["password"] = "Enter your password." }
        else if specification.isSignup && values.password.count < 8 { errors["password"] = "Must be at least 8 characters long." }
    }
    if specification.hasConfirmation && values.confirmPassword != values.password { errors["confirmPassword"] = "Passwords must match." }
    return errors
}

public struct FabricatorAuthBlock: View {
    @Environment(\.fabricatorTheme) private var theme
    @State private var values = FabricatorAuthValues()
    @State private var hasSubmitted = false
    public var isSignup: Bool
    public var variant: Int
    public var onSubmit: (FabricatorAuthValues) -> Void
    public var onProviderSignIn: (String) -> Void
    public var onNavigate: (String) -> Void
    public init(isSignup: Bool = false, variant: Int = 1, onSubmit: @escaping (FabricatorAuthValues) -> Void, onProviderSignIn: @escaping (String) -> Void = { _ in }, onNavigate: @escaping (String) -> Void = { _ in }) {
        precondition((1...5).contains(variant), "Authentication block variants are 1 through 5.")
        self.isSignup = isSignup; self.variant = variant; self.onSubmit = onSubmit; self.onProviderSignIn = onProviderSignIn; self.onNavigate = onNavigate
    }
    private var specification: BlockAuthSpecification { .init(name: "\(isSignup ? "signup" : "login")-0\(variant)") }
    private var errors: [String: String] { hasSubmitted ? validateFabricatorAuthValues(values, template: specification.name) : [:] }
    public var body: some View {
        Group {
            switch specification.layout {
            case .card:
                FabricatorCard(specification.title, description: specification.description) { fields }.frame(maxWidth: 384).padding(24).frame(maxWidth: .infinity, minHeight: 540)
            case .split:
                ViewThatFits(in: .horizontal) {
                    HStack(spacing: 0) {
                        VStack(alignment: .leading, spacing: 40) { brand; formBody.frame(maxWidth: 320).frame(maxWidth: .infinity) }.padding(40).frame(width: 420)
                        BlockAuthIllustration().frame(width: 380, height: isSignup ? 760 : 620)
                    }.frame(minWidth: 800)
                    VStack(spacing: 32) { brand; formBody }.frame(maxWidth: 384).padding(24)
                }.frame(maxWidth: .infinity, minHeight: 540)
            case .providerCard:
                VStack(spacing: 24) {
                    brand
                    FabricatorCard { heading; if !isSignup { provider("apple", title: "Login with Apple"); provider("google", title: "Login with Google"); separator("Or continue with") }; fields }
                    legal
                }.frame(maxWidth: 384).padding(24).frame(maxWidth: .infinity, minHeight: 540).background(theme.color("muted"))
            case .imageCard:
                VStack(spacing: 24) {
                    ViewThatFits(in: .horizontal) {
                        HStack(spacing: 0) { formBody.padding(32).frame(width: 384); BlockAuthIllustration().frame(width: 384, height: isSignup ? 670 : 590) }.frame(minWidth: 768).fabricatorSurface()
                        FabricatorCard { formBody }
                    }
                    legal
                }.frame(maxWidth: 896).padding(24).frame(maxWidth: .infinity, minHeight: 540).background(theme.color("muted"))
            case .emailOnly:
                VStack(spacing: 24) {
                    VStack(spacing: 10) { FabricatorIcon("gallery-vertical-end", size: 24).frame(height: 32).accessibilityLabel("Acme Inc."); Text(specification.title).font(theme.font(20, weight: .semibold)); accountPrompt }
                    fields; separator("Or")
                    ViewThatFits(in: .horizontal) {
                        HStack(spacing: 16) { provider("apple", title: "Continue with Apple").frame(minWidth: 172); provider("google", title: "Continue with Google").frame(minWidth: 172) }
                        VStack(spacing: 16) { provider("apple", title: "Continue with Apple"); provider("google", title: "Continue with Google") }
                    }
                    legal
                }.frame(maxWidth: 384).padding(24).frame(maxWidth: .infinity, minHeight: 540)
            }
        }.background(theme.color("background")).onSubmit(submit)
    }
    private var formBody: some View { VStack(spacing: 24) { heading; fields } }
    private var heading: some View {
        VStack(spacing: 6) { Text(specification.title).font(theme.font(24, weight: .semibold)).tracking(-0.5); Text(specification.description).font(theme.bodyFont).foregroundStyle(theme.color("muted-foreground")).multilineTextAlignment(.center).fixedSize(horizontal: false, vertical: true) }.frame(maxWidth: .infinity)
    }
    private var brand: some View {
        Button { onNavigate("home") } label: { HStack(spacing: 8) { FabricatorIcon("gallery-vertical-end", size: 16).foregroundStyle(theme.color("primary-foreground")).frame(width: 24, height: 24).background(theme.color("primary"), in: RoundedRectangle(cornerRadius: theme.radius("sm"))); Text("Acme Inc.").font(theme.font(theme.text(), weight: .medium)) } }.buttonStyle(.plain).foregroundStyle(theme.color("foreground"))
    }
    private var fields: some View {
        FabricatorFieldGroup {
            if specification.hasName { FabricatorField("Full Name", error: errors["name"]) { FabricatorInput("John Doe", text: $values.name, isInvalid: errors["name"] != nil).textContentType(.name) } }
            FabricatorField("Email", description: isSignup && [1, 2, 4].contains(variant) ? "We'll use this to contact you. We will not share your email with anyone else." : nil, error: errors["email"]) { FabricatorInput("m@example.com", text: $values.email, isInvalid: errors["email"] != nil).textContentType(.emailAddress) }
            if specification.hasPassword {
                if isSignup && [3, 4].contains(variant) { VStack(alignment: .leading, spacing: 6) { HStack(alignment: .top, spacing: 16) { passwordField; confirmationField }; caption("Must be at least 8 characters long.") } }
                else { passwordField; if specification.hasConfirmation { confirmationField } }
            }
            VStack(spacing: 12) {
                Button(action: submit) { Text(isSignup ? "Create Account" : "Login").frame(maxWidth: .infinity) }.buttonStyle(FabricatorButtonStyle()).keyboardShortcut(.defaultAction)
                if variant == 1 { provider("google", title: isSignup ? "Sign up with Google" : "Login with Google", showsIcon: false) }
                if [1, 3].contains(variant) { accountPrompt }
            }
            if variant == 2 { separator("Or continue with"); provider("github", title: isSignup ? "Sign up with GitHub" : "Login with GitHub"); accountPrompt }
            if variant == 4 { separator("Or continue with"); HStack(spacing: 16) { provider("apple", title: isSignup ? "Sign up with Apple" : "Login with Apple", iconOnly: true); provider("google", title: isSignup ? "Sign up with Google" : "Login with Google", iconOnly: true); provider("meta", title: isSignup ? "Sign up with Meta" : "Login with Meta", iconOnly: true) }; accountPrompt }
        }
    }
    private var passwordField: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack { FabricatorLabel("Password"); Spacer(minLength: 0); if !isSignup { Button("Forgot your password?") { onNavigate("forgot-password") }.font(theme.font(theme.text(12))).buttonStyle(.plain) } }
            FabricatorInput(text: $values.password, isSecure: true, isInvalid: errors["password"] != nil).textContentType(isSignup ? .newPassword : .password).accessibilityLabel("Password")
            if let error = errors["password"] { caption(error, isError: true) }
            else if isSignup && [1, 2].contains(variant) { caption("Must be at least 8 characters long.") }
        }
    }
    private var confirmationField: some View { FabricatorField("Confirm Password", description: [1, 2].contains(variant) ? "Please confirm your password." : nil, error: errors["confirmPassword"]) { FabricatorInput(text: $values.confirmPassword, isSecure: true, isInvalid: errors["confirmPassword"] != nil).textContentType(.newPassword) } }
    private var accountPrompt: some View { HStack(spacing: 4) { caption(isSignup ? "Already have an account?" : "Don't have an account?"); Button(isSignup ? "Sign in" : "Sign up") { onNavigate(isSignup ? "login" : "signup") }.buttonStyle(.plain).font(theme.font(theme.text(12))).underline() }.frame(maxWidth: .infinity) }
    private var legal: some View {
        Text("By clicking continue, you agree to our **[Terms of Service](fabricator://terms)** and **[Privacy Policy](fabricator://privacy)**.").font(theme.font(theme.text(12))).foregroundStyle(theme.color("muted-foreground")).multilineTextAlignment(.center).environment(\.openURL, OpenURLAction { address in onNavigate(address.host ?? "legal"); return .handled })
    }
    private func provider(_ provider: String, title: String, showsIcon: Bool = true, iconOnly: Bool = false) -> some View {
        Button { onProviderSignIn(provider) } label: { HStack(spacing: 8) { if showsIcon { FabricatorIcon("brand-\(provider)", size: 16) }; if !iconOnly { Text(title) } }.frame(maxWidth: .infinity) }.buttonStyle(FabricatorButtonStyle(variant: .outline)).accessibilityLabel(title)
    }
    private func separator(_ title: String) -> some View { HStack(spacing: 12) { FabricatorSeparator(); caption(title).fixedSize(); FabricatorSeparator() } }
    private func caption(_ title: String, isError: Bool = false) -> some View { Text(title).font(theme.font(theme.text(12))).foregroundStyle(theme.color(isError ? "destructive-text" : "muted-foreground")).fixedSize(horizontal: false, vertical: true) }
    private func submit() { hasSubmitted = true; if validateFabricatorAuthValues(values, template: specification.name).isEmpty { onSubmit(values) } }
}

private struct BlockAuthIllustration: View {
    @Environment(\.fabricatorTheme) private var theme
    var body: some View {
        ZStack {
            theme.color("muted")
            GeometryReader { geometry in
                Path { path in
                    let center = CGPoint(x: geometry.size.width / 2, y: geometry.size.height / 2)
                    path.move(to: CGPoint(x: center.x - 140, y: center.y - 140)); path.addLine(to: CGPoint(x: center.x + 140, y: center.y + 140))
                    path.move(to: CGPoint(x: center.x + 140, y: center.y - 140)); path.addLine(to: CGPoint(x: center.x - 140, y: center.y + 140))
                    path.move(to: CGPoint(x: center.x - 180, y: center.y)); path.addLine(to: CGPoint(x: center.x + 180, y: center.y))
                    path.move(to: CGPoint(x: center.x, y: center.y - 180)); path.addLine(to: CGPoint(x: center.x, y: center.y + 180))
                    path.addEllipse(in: CGRect(x: center.x - 110, y: center.y - 110, width: 220, height: 220))
                }.stroke(theme.color("border").opacity(0.4), lineWidth: 1)
            }
            Circle().fill(theme.color("background").opacity(0.65)).frame(width: 96, height: 96)
            FabricatorIcon("image", size: 32).foregroundStyle(theme.color("muted-foreground"))
        }.accessibilityLabel("Image placeholder")
    }
}

private struct BlockNavigationNode: Identifiable, Sendable {
    var title: String
    var icon: String? = nil
    var emoji: String? = nil
    var badge: String? = nil
    var children: [BlockNavigationNode] = []
    var id: String { title }
}
private struct BlockNavigationSection: Identifiable, Sendable {
    var title: String
    var items: [BlockNavigationNode]
    var id: String { title }
}
private enum BlockContent {
    static let documentation: [BlockNavigationSection] = [
        .init(title: "Getting Started", items: [.init(title: "Installation"), .init(title: "Project Structure")]),
        .init(title: "Build Your Application", items: ["Routing", "Data Fetching", "Rendering", "Caching", "Styling", "Optimizing", "Configuring", "Testing", "Authentication", "Deploying", "Upgrading", "Examples"].map { .init(title: $0) }),
        .init(title: "API Reference", items: ["Components", "File Conventions", "Functions", "next.config.js Options", "CLI", "Edge Runtime"].map { .init(title: $0) }),
        .init(title: "Architecture", items: ["Accessibility", "Fast Refresh", "Next.js Compiler", "Supported Browsers", "Turbopack"].map { .init(title: $0) }),
        .init(title: "Community", items: [.init(title: "Contribution Guide")])
    ]
    static let platform: [BlockNavigationNode] = [
        .init(title: "Playground", icon: "square-terminal", children: ["History", "Starred", "Settings"].map { .init(title: $0) }),
        .init(title: "Models", icon: "bot", children: ["Genesis", "Explorer", "Quantum"].map { .init(title: $0) }),
        .init(title: "Documentation", icon: "book-open", children: ["Introduction", "Get Started", "Tutorials", "Changelog"].map { .init(title: $0) }),
        .init(title: "Settings", icon: "settings-2", children: ["General", "Team", "Billing", "Limits"].map { .init(title: $0) })
    ]
    static let projects: [BlockNavigationNode] = [.init(title: "Design Engineering", icon: "frame"), .init(title: "Sales & Marketing", icon: "chart-pie"), .init(title: "Travel", icon: "map")]
    static let secondary: [BlockNavigationNode] = [.init(title: "Support", icon: "life-buoy"), .init(title: "Feedback", icon: "send")]
    static let favorites: [BlockNavigationNode] = [
        .init(title: "Project Management & Task Tracking", emoji: "📊"), .init(title: "Family Recipe Collection & Meal Planning", emoji: "🍳"), .init(title: "Fitness Tracker & Workout Routines", emoji: "💪"), .init(title: "Book Notes & Reading List", emoji: "📚"), .init(title: "Sustainable Gardening Tips & Plant Care", emoji: "🌱"), .init(title: "Language Learning Progress & Resources", emoji: "🗣️"), .init(title: "Home Renovation Ideas & Budget Tracker", emoji: "🏠"), .init(title: "Personal Finance & Investment Portfolio", emoji: "💰"), .init(title: "Movie & TV Show Watchlist with Reviews", emoji: "🎬"), .init(title: "Daily Habit Tracker & Goal Setting", emoji: "✅")
    ]
    static let workspaces: [BlockNavigationNode] = [
        .init(title: "Personal Life Management", emoji: "🏠", children: [.init(title: "Daily Journal & Reflection", emoji: "📔"), .init(title: "Health & Wellness Tracker", emoji: "🍏"), .init(title: "Personal Growth & Learning Goals", emoji: "🌟")]),
        .init(title: "Professional Development", emoji: "💼", children: [.init(title: "Career Objectives & Milestones", emoji: "🎯"), .init(title: "Skill Acquisition & Training Log", emoji: "🧠"), .init(title: "Networking Contacts & Events", emoji: "🤝")]),
        .init(title: "Creative Projects", emoji: "🎨", children: [.init(title: "Writing Ideas & Story Outlines", emoji: "✍️"), .init(title: "Art & Design Portfolio", emoji: "🖼️"), .init(title: "Music Composition & Practice Log", emoji: "🎵")]),
        .init(title: "Home Management", emoji: "🏡", children: [.init(title: "Household Budget & Expense Tracking", emoji: "💰"), .init(title: "Home Maintenance Schedule & Tasks", emoji: "🔧"), .init(title: "Family Calendar & Event Planning", emoji: "📅")]),
        .init(title: "Travel & Adventure", emoji: "🧳", children: [.init(title: "Trip Planning & Itineraries", emoji: "🗺️"), .init(title: "Travel Bucket List & Inspiration", emoji: "🌎"), .init(title: "Travel Journal & Photo Gallery", emoji: "📸")])
    ]
    static let workspaceMain: [BlockNavigationNode] = [.init(title: "Search", icon: "search"), .init(title: "Ask AI", icon: "sparkles"), .init(title: "Home", icon: "house"), .init(title: "Inbox", icon: "inbox", badge: "10")]
    static let workspaceSecondary: [BlockNavigationNode] = [.init(title: "Calendar", icon: "calendar"), .init(title: "Settings", icon: "settings-2"), .init(title: "Templates", icon: "blocks"), .init(title: "Trash", icon: "trash"), .init(title: "Help", icon: "message-circle-question-mark")]
    static let settings: [BlockNavigationNode] = [.init(title: "Notifications", icon: "bell"), .init(title: "Navigation", icon: "menu"), .init(title: "Home", icon: "house"), .init(title: "Appearance", icon: "paintbrush"), .init(title: "Messages & media", icon: "message-circle"), .init(title: "Language & region", icon: "globe"), .init(title: "Accessibility", icon: "keyboard"), .init(title: "Mark as read", icon: "check"), .init(title: "Audio & video", icon: "video"), .init(title: "Connected accounts", icon: "link"), .init(title: "Privacy & visibility", icon: "lock"), .init(title: "Advanced", icon: "settings")]
}

private struct BlockNavigationBranch: View {
    @Environment(\.fabricatorTheme) private var theme
    var node: BlockNavigationNode
    @Binding var selection: String
    @Binding var expanded: Set<String>
    var depth = 0
    var usesPlus = false
    var separatesDisclosure = false
    var onAction: (String) -> Void = { _ in }
    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack(spacing: 0) {
                Button {
                    if !node.children.isEmpty && !separatesDisclosure { toggle() }
                    else { selection = node.title; onAction(node.title) }
                } label: {
                    HStack(spacing: 8) {
                        if let emoji = node.emoji { Text(emoji).frame(width: 18) }
                        if let icon = node.icon { FabricatorIcon(icon, size: 16) }
                        Text(node.title).lineLimit(1)
                        Spacer(minLength: 0)
                        if let badge = node.badge { Text(badge).font(theme.font(11)).monospacedDigit() }
                        if !node.children.isEmpty && !separatesDisclosure { FabricatorIcon(usesPlus ? expanded.contains(node.title) ? "minus" : "plus" : expanded.contains(node.title) ? "chevron-down" : "chevron-right", size: 12) }
                    }.font(theme.font(theme.text(12), weight: selection == node.title ? .medium : .regular))
                        .foregroundStyle(theme.color(selection == node.title ? "foreground" : "mutedOnFrame"))
                        .padding(.horizontal, 10).frame(minHeight: theme.controlHeight - 4).contentShape(Rectangle())
                }.buttonStyle(.plain).accessibilityAddTraits(selection == node.title ? .isSelected : []).accessibilityValue(node.children.isEmpty ? "" : expanded.contains(node.title) ? "Expanded" : "Collapsed")
                if separatesDisclosure && !node.children.isEmpty { FabricatorButton("Toggle \(node.title)", icon: expanded.contains(node.title) ? "chevron-down" : "chevron-right", variant: .ghost, size: .iconXs, action: toggle) }
            }.background(selection == node.title ? theme.color("hover") : .clear, in: RoundedRectangle(cornerRadius: theme.radius("sm")))
            if expanded.contains(node.title) {
                ForEach(node.children) { child in BlockNavigationBranch(node: child, selection: $selection, expanded: $expanded, depth: depth + 1, usesPlus: usesPlus, separatesDisclosure: separatesDisclosure, onAction: onAction).padding(.leading, 14) }
            }
        }
    }
    private func toggle() { if expanded.contains(node.title) { expanded.remove(node.title) } else { expanded.insert(node.title) } }
}

private struct BlockGroupHeading: View {
    @Environment(\.fabricatorTheme) private var theme
    var title: String
    var body: some View { Text(title).font(theme.font(theme.text(11), weight: .medium)).foregroundStyle(theme.color("mutedOnFrame")).padding(.horizontal, 10).padding(.top, 12).padding(.bottom, 4).frame(maxWidth: .infinity, alignment: .leading) }
}

private struct BlockFrame<Sidebar: View, Content: View, Actions: View>: View {
    @Environment(\.fabricatorTheme) private var theme
    @State private var isMobileNavigationPresented = false
    @Binding var isSidebarOpen: Bool
    var selection: String
    var breadcrumbs: [String]
    var sidebarWidth: CGFloat = 256
    var allowsIconRail = false
    var hasInsetMain = false
    var hasFloatingSidebar = false
    var isRightSidebar = false
    var hasGlobalHeader = false
    var hidesCompactHeader = false
    @ViewBuilder var sidebar: (Bool) -> Sidebar
    @ViewBuilder var content: (Bool) -> Content
    @ViewBuilder var actions: (Bool) -> Actions
    var body: some View {
        GeometryReader { geometry in
            let isCompact = geometry.size.width < 700
            let isRail = allowsIconRail && !isSidebarOpen
            VStack(spacing: 0) {
                if hasGlobalHeader { header(isCompact: isCompact) }
                HStack(spacing: 0) {
                    if !isCompact && !isRightSidebar && (isSidebarOpen || allowsIconRail) { navigation(isRail: isRail) }
                    VStack(spacing: 0) {
                        if !hasGlobalHeader && !(isCompact && hidesCompactHeader) { header(isCompact: isCompact) }
                        content(isCompact).frame(maxWidth: .infinity, maxHeight: .infinity)
                    }.background(theme.color("background"))
                        .clipShape(RoundedRectangle(cornerRadius: hasInsetMain && !isCompact ? theme.radius("xl") : 0))
                        .padding(hasInsetMain && !isCompact ? 8 : 0)
                    if !isCompact && isRightSidebar && isSidebarOpen { navigation(isRail: false) }
                }
            }.background(theme.color("app-shell-frame"))
                .background { FabricatorSheet("Navigation", isPresented: $isMobileNavigationPresented) { sidebar(false) } }
                .onChange(of: selection) { _, _ in isMobileNavigationPresented = false }
        }
    }
    private func navigation(isRail: Bool) -> some View {
        sidebar(isRail).frame(width: isRail ? 56 : sidebarWidth)
            .background(theme.color(hasFloatingSidebar ? "card" : "app-shell-frame"))
            .clipShape(RoundedRectangle(cornerRadius: hasFloatingSidebar ? theme.radius("xl") : 0))
            .padding(hasFloatingSidebar ? 8 : 0)
    }
    private func header(isCompact: Bool) -> some View {
        HStack(spacing: 10) {
            if !isRightSidebar { toggle(isCompact: isCompact) }
            if !breadcrumbs.isEmpty { FabricatorBreadcrumb(breadcrumbs).lineLimit(1); Spacer(minLength: 4) }
            actions(isCompact)
            if isRightSidebar { toggle(isCompact: isCompact) }
        }.padding(.horizontal, 12).frame(minHeight: hasGlobalHeader ? 56 : 64).background(theme.color("background"))
            .overlay(alignment: .bottom) { FabricatorSeparator() }
    }
    private func toggle(isCompact: Bool) -> some View {
        FabricatorButton("Toggle sidebar", icon: "panel-left", variant: .ghost, size: .iconSm) { if isCompact { isMobileNavigationPresented = true } else { isSidebarOpen.toggle() } }
    }
}

private struct BlockPlaceholderContent: View {
    @Environment(\.fabricatorTheme) private var theme
    enum Layout { case dashboard, rows, document, calendar, settings, issues }
    var layout: Layout = .dashboard
    var isCompact = false
    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                switch layout {
                case .dashboard:
                    if isCompact { ForEach(0..<3) { _ in aspect() } }
                    else { HStack(spacing: 16) { ForEach(0..<3) { _ in aspect() } } }
                    rectangle(height: 400)
                case .rows: ForEach(0..<24) { _ in rectangle(height: 48) }
                case .document: rectangle(height: 96); rectangle(height: 500)
                case .calendar:
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 16), count: isCompact ? 1 : 5), spacing: 16) { ForEach(0..<20) { _ in aspect(1) } }
                case .settings: ForEach(0..<10) { _ in aspect() }
                case .issues: ForEach(0..<6) { _ in rectangle(height: 128) }
                }
            }.padding(16).frame(maxWidth: layout == .document || layout == .issues ? 768 : .infinity).frame(maxWidth: .infinity)
        }
    }
    private func rectangle(height: CGFloat) -> some View { RoundedRectangle(cornerRadius: theme.radius("xl")).fill(theme.color("muted").opacity(0.5)).frame(height: height).accessibilityHidden(true) }
    private func aspect(_ ratio: CGFloat = 16 / 9) -> some View { FabricatorAspectRatio(ratio) { RoundedRectangle(cornerRadius: theme.radius("xl")).fill(theme.color("muted").opacity(0.5)) }.accessibilityHidden(true) }
}

private struct BlockTeamSwitcher: View {
    @Environment(\.fabricatorTheme) private var theme
    @Binding var selection: String
    var isRail = false
    var isCompact = false
    var teams = ["Acme Inc", "Acme Corp.", "Evil Corp."]
    var firstIcon = "gallery-vertical-end"
    var onCreate: () -> Void = {}
    private var plan: String { selection == "Acme Inc" ? "Enterprise" : selection == "Fabricator Studio" ? "Pro" : selection == "Acme Corp." ? "Startup" : "Free" }
    var body: some View {
        Menu {
            Text("Teams")
            ForEach(teams, id: \.self) { name in Button(name) { selection = name } }
            Divider(); Button("Add team", action: onCreate)
        } label: {
            HStack(spacing: 8) {
                FabricatorIcon(selection == "Acme Corp." ? "audio-lines" : selection == "Evil Corp." ? "terminal" : firstIcon, size: 16).foregroundStyle(theme.color("primary-foreground")).frame(width: isCompact ? 22 : 32, height: isCompact ? 22 : 32).background(theme.color("primary"), in: RoundedRectangle(cornerRadius: theme.radius("sm")))
                if !isRail { VStack(alignment: .leading, spacing: 2) { Text(selection).font(theme.font(theme.text(), weight: .medium)); if !isCompact { Text(plan).font(theme.font(theme.text(11))).foregroundStyle(theme.color("mutedOnFrame")) } }; Spacer(minLength: 0); FabricatorIcon(isCompact ? "chevron-down" : "chevrons-up-down", size: 12) }
            }.foregroundStyle(theme.color("foreground")).padding(10)
        }.menuStyle(.borderlessButton).accessibilityLabel("Switch team")
    }
}

private struct BlockDocumentationMark: View {
    @Environment(\.fabricatorTheme) private var theme
    @Binding var version: String
    var allowsVersionSelection = false
    var body: some View {
        Menu {
            if allowsVersionSelection { ForEach(["1.0.1", "1.1.0-alpha", "2.0.0-beta1"], id: \.self) { option in Button("v\(option)") { version = option } } }
            else { Text("Documentation v1.0.0") }
        } label: {
            HStack(spacing: 8) { FabricatorIcon("gallery-vertical-end", size: 16).foregroundStyle(theme.color("primary-foreground")).frame(width: 32, height: 32).background(theme.color("primary"), in: RoundedRectangle(cornerRadius: theme.radius())); VStack(alignment: .leading, spacing: 2) { Text("Documentation").font(theme.font(theme.text(), weight: .medium)); Text("v\(allowsVersionSelection ? version : "1.0.0")").font(theme.font(theme.text(11))) }; Spacer(); if allowsVersionSelection { FabricatorIcon("chevrons-up-down", size: 12) } }.foregroundStyle(theme.color("foreground")).padding(10)
        }.menuStyle(.borderlessButton).accessibilityLabel("Documentation version")
    }
}

private struct BlockUserMenu: View {
    @Environment(\.fabricatorTheme) private var theme
    var name = "Gabriel"
    var email = "m@example.com"
    var isRail = false
    var onAction: (String) -> Void = { _ in }
    var body: some View {
        Menu {
            Text(name); Text(email); Divider(); Button("Upgrade to Pro") { onAction("Upgrade to Pro") }; Divider()
            Button("Account") { onAction("Account") }; Button("Billing") { onAction("Billing") }; Button("Notifications") { onAction("Notifications") }; Divider(); Button("Log out") { onAction("Log out") }
        } label: {
            HStack(spacing: 8) { FabricatorAvatar(name, imageURL: name == "Gabriel" ? URL(string: "https://github.com/gabrielespinheira.png") : nil, size: 32); if !isRail { VStack(alignment: .leading, spacing: 2) { Text(name).font(theme.font(theme.text(12), weight: .medium)); Text(email).font(theme.font(theme.text(11))).foregroundStyle(theme.color("mutedOnFrame")) }; Spacer(minLength: 0); FabricatorIcon("chevrons-up-down", size: 12) } }.foregroundStyle(theme.color("foreground")).padding(10)
        }.menuStyle(.borderlessButton).accessibilityLabel("User menu for \(name)")
    }
}

private struct BlockCalendarSidebar: View {
    @Environment(\.fabricatorTheme) private var theme
    @State private var date = Calendar.current.date(bySetting: .day, value: 12, of: Date()) ?? Date()
    @State private var expanded: Set<String> = ["My Calendars"]
    @State private var checked: Set<String> = ["Personal", "Work", "Holidays", "Birthdays", "Travel", "Reminders"]
    var onAction: (String) -> Void = { _ in }
    private let groups = [BlockNavigationSection(title: "My Calendars", items: ["Personal", "Work", "Family"].map { .init(title: $0) }), BlockNavigationSection(title: "Favorites", items: ["Holidays", "Birthdays"].map { .init(title: $0) }), BlockNavigationSection(title: "Other", items: ["Travel", "Reminders", "Deadlines"].map { .init(title: $0) })]
    var body: some View {
        VStack(spacing: 0) {
            BlockUserMenu(onAction: onAction); FabricatorSeparator()
            ScrollView {
                VStack(spacing: 0) {
                    FabricatorCalendarView(selection: $date)
                    FabricatorSeparator()
                    ForEach(groups) { group in
                        FabricatorCollapsible(group.title, isExpanded: Binding(get: { expanded.contains(group.title) }, set: { if $0 { expanded.insert(group.title) } else { expanded.remove(group.title) } })) {
                            VStack(alignment: .leading, spacing: 8) { ForEach(group.items) { item in FabricatorCheckbox(item.title, isOn: Binding(get: { checked.contains(item.title) }, set: { if $0 { checked.insert(item.title) } else { checked.remove(item.title) } })) } }.padding(.vertical, 8)
                        }.padding(.horizontal, 12)
                        FabricatorSeparator()
                    }
                }
            }
            FabricatorButton("New Calendar", icon: "plus", variant: .ghost) { onAction("New Calendar") }.padding(8)
        }.background(theme.color("app-shell-frame"))
    }
}

private struct BlockMail: Identifiable, Sendable {
    var name: String
    var subject: String
    var date: String
    var teaser: String
    var id: String { name }
    static let examples: [BlockMail] = [
        .init(name: "William Smith", subject: "Meeting Tomorrow", date: "09:34 AM", teaser: "Hi team, just a reminder about our meeting tomorrow at 10 AM.\nPlease come prepared with your project updates."),
        .init(name: "Alice Smith", subject: "Re: Project Update", date: "Yesterday", teaser: "Thanks for the update. The progress looks great so far.\nLet's schedule a call to discuss the next steps."),
        .init(name: "Bob Johnson", subject: "Weekend Plans", date: "2 days ago", teaser: "Hey everyone! I'm thinking of organizing a team outing this weekend.\nWould you be interested in a hiking trip or a beach day?"),
        .init(name: "Emily Davis", subject: "Re: Question about Budget", date: "2 days ago", teaser: "I've reviewed the budget numbers you sent over.\nCan we set up a quick call to discuss some potential adjustments?"),
        .init(name: "Michael Wilson", subject: "Important Announcement", date: "1 week ago", teaser: "Please join us for an all-hands meeting this Friday at 3 PM.\nWe have some exciting news to share about the company's future."),
        .init(name: "Sarah Brown", subject: "Re: Feedback on Proposal", date: "1 week ago", teaser: "Thank you for sending over the proposal. I've reviewed it and have some thoughts.\nCould we schedule a meeting to discuss my feedback in detail?"),
        .init(name: "David Lee", subject: "New Project Idea", date: "1 week ago", teaser: "I've been brainstorming and came up with an interesting project concept.\nDo you have time this week to discuss its potential impact and feasibility?"),
        .init(name: "Olivia Wilson", subject: "Vacation Plans", date: "1 week ago", teaser: "Just a heads up that I'll be taking a two-week vacation next month.\nI'll make sure all my projects are up to date before I leave."),
        .init(name: "James Martin", subject: "Re: Conference Registration", date: "1 week ago", teaser: "I've completed the registration for the upcoming tech conference.\nLet me know if you need any additional information from my end."),
        .init(name: "Sophia White", subject: "Team Dinner", date: "1 week ago", teaser: "To celebrate our recent project success, I'd like to organize a team dinner.\nAre you available next Friday evening? Please let me know your preferences.")
    ]
}

private struct BlockMailSidebar: View {
    @Environment(\.fabricatorTheme) private var theme
    @Binding var folder: String
    @State private var query = ""
    @State private var unreadsOnly = false
    @State private var selectedMail = ""
    @State private var mails = BlockMail.examples
    var isRail = false
    var onAction: (String) -> Void = { _ in }
    private let folders = [BlockNavigationNode(title: "Inbox", icon: "inbox"), .init(title: "Drafts", icon: "file"), .init(title: "Sent", icon: "send"), .init(title: "Junk", icon: "archive-x"), .init(title: "Trash", icon: "trash")]
    var body: some View {
        HStack(spacing: 0) {
            VStack(spacing: 8) {
                FabricatorIcon("terminal", size: 18).foregroundStyle(theme.color("primary-foreground")).frame(width: 32, height: 32).background(theme.color("primary"), in: RoundedRectangle(cornerRadius: theme.radius())).padding(.vertical, 12)
                ForEach(folders) { item in FabricatorButton(item.title, icon: item.icon, variant: folder == item.title ? .secondary : .ghost, size: .icon) { folder = item.title; mails = Array(BlockMail.examples.shuffled().prefix(Int.random(in: 5...10))) } }
                Spacer(); BlockUserMenu(isRail: true, onAction: onAction)
            }.frame(width: 56)
            if !isRail {
                VStack(spacing: 0) {
                    VStack(spacing: 12) { HStack { Text(folder).font(theme.font(16, weight: .medium)); Spacer(); FabricatorSwitch("Unreads", isOn: $unreadsOnly).frame(maxWidth: 130) }; FabricatorSearch("Type to search...", query: $query) }.padding(12)
                    FabricatorSeparator()
                    ScrollView {
                        VStack(spacing: 0) {
                            ForEach(Array(mails.enumerated()).filter { index, mail in (!unreadsOnly || index < 3) && (query.isEmpty || "\(mail.name) \(mail.subject) \(mail.teaser)".localizedCaseInsensitiveContains(query)) }, id: \.element.id) { _, mail in
                                Button { selectedMail = mail.id; onAction(mail.subject) } label: {
                                    VStack(alignment: .leading, spacing: 8) { HStack { Text(mail.name); Spacer(); Text(mail.date).font(theme.font(10)) }; Text(mail.subject).fontWeight(.medium); Text(mail.teaser).font(theme.font(theme.text(11))).lineLimit(2).multilineTextAlignment(.leading) }.font(theme.bodyFont).foregroundStyle(theme.color("foreground")).padding(16).frame(maxWidth: .infinity, alignment: .leading).background(selectedMail == mail.id ? theme.color("hover") : .clear)
                                }.buttonStyle(.plain)
                                FabricatorSeparator()
                            }
                        }
                    }
                }.overlay(alignment: .leading) { Rectangle().fill(theme.color("border")).frame(width: 0.5) }
            }
        }
    }
}

private extension BlockContent {
    static let files: [FabricatorFileNode] = [
        .init(id: "app", name: "app", children: [.init(id: "app/api", name: "api", children: [.init(id: "app/api/hello", name: "hello", children: [.init(id: "app/api/hello/route.ts", name: "route.ts")]), .init(id: "app/api/page.tsx", name: "page.tsx"), .init(id: "app/api/layout.tsx", name: "layout.tsx"), .init(id: "app/api/blog", name: "blog", children: [.init(id: "app/api/blog/page.tsx", name: "page.tsx")])])]),
        .init(id: "components", name: "components", children: [.init(id: "components/ui", name: "ui", children: [.init(id: "components/ui/button.tsx", name: "button.tsx"), .init(id: "components/ui/card.tsx", name: "card.tsx")]), .init(id: "components/header.tsx", name: "header.tsx"), .init(id: "components/footer.tsx", name: "footer.tsx")]),
        .init(id: "lib", name: "lib", children: [.init(id: "lib/util.ts", name: "util.ts")]),
        .init(id: "public", name: "public", children: [.init(id: "public/favicon.ico", name: "favicon.ico"), .init(id: "public/vercel.svg", name: "vercel.svg")]),
        .init(id: ".eslintrc.json", name: ".eslintrc.json"), .init(id: ".gitignore", name: ".gitignore"), .init(id: "next.config.js", name: "next.config.js"), .init(id: "tailwind.config.js", name: "tailwind.config.js"), .init(id: "package.json", name: "package.json"), .init(id: "README.md", name: "README.md")
    ]
    static let pageActions: [[BlockNavigationNode]] = [
        [.init(title: "Customize Page", icon: "settings-2"), .init(title: "Turn into wiki", icon: "file-text")],
        [.init(title: "Copy Link", icon: "link"), .init(title: "Duplicate", icon: "copy"), .init(title: "Move to", icon: "corner-up-right"), .init(title: "Move to Trash", icon: "trash")],
        [.init(title: "Undo", icon: "corner-up-left"), .init(title: "View analytics", icon: "chart-line"), .init(title: "Version History", icon: "gallery-vertical-end"), .init(title: "Show delete pages", icon: "trash"), .init(title: "Notifications", icon: "bell")],
        [.init(title: "Import", icon: "arrow-up"), .init(title: "Export", icon: "arrow-down")]
    ]
}

private struct BlockNotebookSidebar: View {
    @Environment(\.fabricatorTheme) private var theme
    @Binding var selection: String
    @State private var team = "Acme Inc"
    @State private var expanded: Set<String> = []
    @State private var favorites = BlockContent.favorites
    var onAction: (String) -> Void = { _ in }
    var body: some View {
        VStack(spacing: 0) {
            BlockTeamSwitcher(selection: $team, isCompact: true, onCreate: { onAction("Add team") })
            VStack(spacing: 2) { ForEach(BlockContent.workspaceMain) { item in BlockNavigationBranch(node: item, selection: $selection, expanded: $expanded, onAction: onAction) } }.padding(.horizontal, 8)
            ScrollView {
                VStack(alignment: .leading, spacing: 4) {
                    BlockGroupHeading(title: "Favorites")
                    ForEach(favorites) { item in
                        BlockNavigationBranch(node: item, selection: $selection, expanded: $expanded, onAction: onAction).contextMenu {
                            Button("Remove from Favorites") { favorites.removeAll { $0.id == item.id }; onAction("Remove from Favorites: \(item.title)") }
                            Divider(); Button("Copy Link") { onAction("Copy Link: \(item.title)") }; Button("Open in New Tab") { onAction("Open in New Tab: \(item.title)") }; Divider(); Button("Delete", role: .destructive) { onAction("Delete: \(item.title)") }
                        }
                    }
                    BlockNavigationBranch(node: .init(title: "More", icon: "ellipsis"), selection: $selection, expanded: $expanded, onAction: onAction)
                    BlockGroupHeading(title: "Workspaces")
                    ForEach(BlockContent.workspaces) { item in BlockNavigationBranch(node: item, selection: $selection, expanded: $expanded, separatesDisclosure: true, onAction: onAction).contextMenu { Button("Add page") { onAction("Add page: \(item.title)") } } }
                    BlockNavigationBranch(node: .init(title: "More workspaces", icon: "ellipsis"), selection: $selection, expanded: $expanded, onAction: onAction)
                    ForEach(BlockContent.workspaceSecondary) { item in BlockNavigationBranch(node: item, selection: $selection, expanded: $expanded, onAction: onAction) }
                }.padding(8)
            }
        }.background(theme.color("app-shell-frame"))
    }
}

private struct BlockPageActions: View {
    @Environment(\.fabricatorTheme) private var theme
    @State private var isPresented = true
    @State private var isStarred = false
    var onAction: (String) -> Void = { _ in }
    var body: some View {
        HStack(spacing: 6) {
            Text("Edit Oct 08").font(theme.font(11)).foregroundStyle(theme.color("muted-foreground")).lineLimit(1)
            FabricatorButton(isStarred ? "Remove star" : "Star page", icon: "star", variant: isStarred ? .secondary : .ghost, size: .iconSm) { isStarred.toggle() }
            FabricatorPopover(isPresented: $isPresented) { FabricatorIcon("ellipsis").frame(width: 28, height: 28) } content: {
                VStack(spacing: 4) {
                    ForEach(Array(BlockContent.pageActions.enumerated()), id: \.offset) { index, actions in
                        ForEach(actions) { item in Button { isPresented = false; onAction(item.title) } label: { HStack(spacing: 10) { if let icon = item.icon { FabricatorIcon(icon, size: 15) }; Text(item.title); Spacer() }.font(theme.bodyFont).foregroundStyle(theme.color("foreground")).padding(.horizontal, 8).frame(minHeight: theme.controlHeight - 4) }.buttonStyle(.plain) }
                        if index < BlockContent.pageActions.count - 1 { FabricatorSeparator() }
                    }
                }.frame(width: 224)
            }.accessibilityLabel("Page actions")
        }
    }
}

private struct BlockSettingsDialog: View {
    @Environment(\.fabricatorTheme) private var theme
    @State private var isPresented = true
    @State private var selection = "Messages & media"
    @State private var expanded: Set<String> = []
    var onAction: (String) -> Void = { _ in }
    private var minimumDialogWidth: CGFloat {
        #if os(macOS)
        760
        #else
        0
        #endif
    }
    var body: some View {
        FabricatorButton("Open Dialog", size: .sm) { isPresented = true }.frame(maxWidth: .infinity, minHeight: 520)
            .background { FabricatorDialog("Settings", description: "Customize your settings here.", isPresented: $isPresented) {
                GeometryReader { geometry in
                    HStack(spacing: 0) {
                        if geometry.size.width >= 600 { ScrollView { VStack(spacing: 2) { ForEach(BlockContent.settings) { item in BlockNavigationBranch(node: item, selection: $selection, expanded: $expanded, onAction: onAction) } }.padding(8) }.frame(width: 224).background(theme.color("app-shell-frame")) }
                        VStack(spacing: 0) {
                            if geometry.size.width < 600 { Menu { ForEach(BlockContent.settings) { item in Button(item.title) { selection = item.title; onAction(item.title) } } } label: { HStack { Text(selection); Spacer(); FabricatorIcon("chevron-down", size: 12) }.font(theme.bodyFont).padding(12) }.menuStyle(.borderlessButton) }
                            else { FabricatorBreadcrumb(["Settings", selection]).padding(16) }
                            BlockPlaceholderContent(layout: .settings)
                        }
                    }
                }.frame(minWidth: minimumDialogWidth, idealWidth: 900, minHeight: 440)
            } }
    }
}

private enum BlockSidebarKind: Int {
    case documentation = 1, collapsibleDocumentation, nestedDocumentation, floatingDocumentation, plusDocumentation, menuDocumentation, workspaceRail, insetWorkspace, mail, notebook, fileTree, calendar, settingsDialog, rightContents, dualSidebars, globalHeader
}

public struct FabricatorSidebarBlock: View {
    public var variant: Int
    public var onAction: (String) -> Void
    public init(variant: Int = 1, onAction: @escaping (String) -> Void = { _ in }) { precondition((1...16).contains(variant), "Sidebar block variants are 1 through 16."); self.variant = variant; self.onAction = onAction }
    public var body: some View {
        if let kind = BlockSidebarKind(rawValue: variant) { BlockSidebarComposition(kind: kind, onAction: onAction).frame(height: 640) }
    }
}

private struct BlockSidebarComposition: View {
    @Environment(\.fabricatorTheme) private var theme
    var kind: BlockSidebarKind
    var onAction: (String) -> Void
    @State private var selection = "Data Fetching"
    @State private var expanded: Set<String> = ["Build Your Application", "Playground"]
    @State private var query = ""
    @State private var version = "1.0.1"
    @State private var team = "Acme Inc"
    @State private var isSidebarOpen = true
    @State private var isCalendarPresented = false
    @State private var selectedFile: String? = "components/ui/button.tsx"
    @State private var expandedFiles: Set<String> = ["components", "components/ui"]
    @State private var newsletterEmail = ""
    @State private var hasNewsletterError = false
    private var breadcrumbs: [String] {
        switch kind { case .mail: ["All Inboxes", selection == "Data Fetching" ? "Inbox" : selection]; case .notebook, .dualSidebars: ["Project Management & Task Tracking"]; case .fileTree: (selectedFile ?? "components/ui/button.tsx").split(separator: "/").map(String.init); case .calendar: ["October 2024"]; default: ["Build Your Application", "Data Fetching"] }
    }
    var body: some View {
        if kind == .settingsDialog { BlockSettingsDialog(onAction: onAction) }
        else {
            BlockFrame(isSidebarOpen: $isSidebarOpen, selection: selection, breadcrumbs: breadcrumbs, sidebarWidth: kind == .floatingDocumentation ? 304 : kind == .mail ? 350 : 256, allowsIconRail: kind == .workspaceRail || kind == .mail, hasInsetMain: kind == .insetWorkspace, hasFloatingSidebar: kind == .floatingDocumentation, isRightSidebar: kind == .rightContents, hasGlobalHeader: kind == .globalHeader) { isRail in
                sidebar(isRail: isRail)
            } content: { isCompact in
                mainContent(isCompact: isCompact)
            } actions: { _ in
                if kind == .notebook { BlockPageActions(onAction: onAction) }
                if kind == .dualSidebars { FabricatorButton("Show calendar", icon: "calendar", variant: .ghost, size: .iconSm) { isCalendarPresented = true } }
                if kind == .globalHeader { FabricatorSearch("Type to search...", query: $query).frame(maxWidth: 220) }
            }.background { FabricatorSheet("Calendar", isPresented: $isCalendarPresented) { BlockCalendarSidebar(onAction: onAction) } }
        }
    }
    @ViewBuilder private func sidebar(isRail: Bool) -> some View {
        switch kind {
        case .mail: BlockMailSidebar(folder: Binding(get: { selection == "Data Fetching" ? "Inbox" : selection }, set: { selection = $0 }), isRail: isRail, onAction: onAction)
        case .calendar: BlockCalendarSidebar(onAction: onAction)
        case .notebook, .dualSidebars: BlockNotebookSidebar(selection: $selection, onAction: onAction)
        case .fileTree: fileSidebar
        case .workspaceRail, .insetWorkspace, .globalHeader: workspaceSidebar(isRail: isRail)
        default: documentationSidebar
        }
    }
    @ViewBuilder private func mainContent(isCompact: Bool) -> some View {
        if kind == .dualSidebars {
            ViewThatFits(in: .horizontal) {
                HStack(spacing: 0) { BlockPlaceholderContent(layout: .document).frame(minWidth: 480); BlockCalendarSidebar(onAction: onAction).frame(width: 256) }.frame(minWidth: 736)
                BlockPlaceholderContent(layout: .document, isCompact: isCompact)
            }
        } else { BlockPlaceholderContent(layout: kind == .collapsibleDocumentation || kind == .mail ? .rows : kind == .calendar ? .calendar : kind == .notebook ? .document : .dashboard, isCompact: isCompact) }
    }
    private var documentationSidebar: some View {
        VStack(spacing: 0) {
            if kind != .rightContents { BlockDocumentationMark(version: $version, allowsVersionSelection: kind == .documentation || kind == .collapsibleDocumentation) }
            if [.documentation, .collapsibleDocumentation, .plusDocumentation].contains(kind) { FabricatorSearch("Search the docs...", query: $query).padding(10) }
            ScrollView {
                VStack(alignment: .leading, spacing: kind == .floatingDocumentation ? 10 : 2) {
                    if kind == .rightContents { BlockGroupHeading(title: "Table of Contents") }
                    ForEach(BlockContent.documentation.filter { kind != .documentation && kind != .menuDocumentation || $0.title != "Community" }) { group in
                        let items = group.items.filter { query.isEmpty || $0.title.localizedCaseInsensitiveContains(query) || group.title.localizedCaseInsensitiveContains(query) }
                        if !items.isEmpty {
                            if kind == .documentation { BlockGroupHeading(title: group.title); ForEach(items) { node in BlockNavigationBranch(node: node, selection: $selection, expanded: $expanded, onAction: onAction) } }
                            else if kind == .menuDocumentation { Menu { ForEach(items) { item in Button(item.title) { selection = item.title; onAction(item.title) } } } label: { HStack { Text(group.title); Spacer(); FabricatorIcon("ellipsis", size: 14) }.font(theme.bodyFont).padding(10) }.menuStyle(.borderlessButton) }
                            else if [.nestedDocumentation, .floatingDocumentation, .rightContents].contains(kind) { BlockGroupHeading(title: group.title); ForEach(items) { node in BlockNavigationBranch(node: node, selection: $selection, expanded: $expanded, onAction: onAction).padding(.leading, kind == .floatingDocumentation ? 0 : 12) } }
                            else { BlockNavigationBranch(node: .init(title: group.title, children: items), selection: $selection, expanded: groupBinding, usesPlus: kind == .plusDocumentation, onAction: onAction) }
                        }
                    }
                }.padding(8)
            }
            if kind == .menuDocumentation { newsletter.padding(10) }
        }
    }
    private var groupBinding: Binding<Set<String>> {
        Binding(get: { kind == .collapsibleDocumentation && expanded == ["Build Your Application", "Playground"] ? Set(BlockContent.documentation.map(\.title)) : expanded }, set: { expanded = $0 })
    }
    private func workspaceSidebar(isRail: Bool) -> some View {
        VStack(spacing: 0) {
            if kind == .workspaceRail { BlockTeamSwitcher(selection: $team, isRail: isRail, onCreate: { onAction("Add team") }) }
            else { HStack(spacing: 8) { FabricatorIcon("terminal", size: 16).foregroundStyle(theme.color("primary-foreground")).frame(width: 32, height: 32).background(theme.color("primary"), in: RoundedRectangle(cornerRadius: theme.radius())); VStack(alignment: .leading, spacing: 2) { Text("Acme Inc").font(theme.font(theme.text(), weight: .medium)); Text("Enterprise").font(theme.font(theme.text(11))) }; Spacer() }.padding(12) }
            ScrollView {
                VStack(alignment: .leading, spacing: 2) {
                    if !isRail { BlockGroupHeading(title: "Platform") }
                    ForEach(BlockContent.platform) { item in
                        if isRail { FabricatorButton(item.title, icon: item.icon, variant: .ghost, size: .icon) { selection = item.title; isSidebarOpen = true } }
                        else { BlockNavigationBranch(node: item, selection: $selection, expanded: $expanded, separatesDisclosure: kind != .workspaceRail, onAction: onAction) }
                    }
                    if !isRail {
                        BlockGroupHeading(title: "Projects")
                        ForEach(BlockContent.projects) { item in BlockNavigationBranch(node: item, selection: $selection, expanded: $expanded, onAction: onAction).contextMenu { Button("View Project") { onAction("View Project: \(item.title)") }; Button("Share Project") { onAction("Share Project: \(item.title)") }; Divider(); Button("Delete Project", role: .destructive) { onAction("Delete Project: \(item.title)") } } }
                        BlockNavigationBranch(node: .init(title: "More", icon: "ellipsis"), selection: $selection, expanded: $expanded, onAction: onAction)
                        if kind != .workspaceRail { ForEach(BlockContent.secondary) { item in BlockNavigationBranch(node: item, selection: $selection, expanded: $expanded, onAction: onAction) } }
                    }
                }.padding(isRail ? 4 : 8)
            }
            BlockUserMenu(isRail: isRail, onAction: onAction)
        }
    }
    private var fileSidebar: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 4) {
                BlockGroupHeading(title: "Changes")
                ForEach([BlockNavigationNode(title: "README.md", icon: "file", badge: "M"), .init(title: "api/hello/route.ts", icon: "file", badge: "U"), .init(title: "app/layout.tsx", icon: "file", badge: "M")]) { item in BlockNavigationBranch(node: item, selection: $selection, expanded: $expanded, onAction: onAction) }
                BlockGroupHeading(title: "Files")
                FabricatorFileTree(BlockContent.files, selection: $selectedFile, expanded: $expandedFiles).padding(.horizontal, 8)
            }.padding(8)
        }
    }
    private var newsletter: some View {
        FabricatorCard("Subscribe to our newsletter", description: "Opt-in to receive updates and news about the sidebar.") {
            FabricatorInput("Email", text: $newsletterEmail, isInvalid: hasNewsletterError).textContentType(.emailAddress)
            Button { hasNewsletterError = !validateFabricatorAuthValues(.init(email: newsletterEmail), template: "login-05").isEmpty; if !hasNewsletterError { onAction("Subscribe: \(newsletterEmail)") } } label: { Text("Subscribe").frame(maxWidth: .infinity) }.buttonStyle(FabricatorButtonStyle())
        }
    }
}

private struct BlockDockedPane<Main: View, Pane: View>: View {
    @Environment(\.fabricatorTheme) private var theme
    @Binding var isOpen: Bool
    @Binding var isSheetPresented: Bool
    var title: String
    var width: CGFloat = 300
    @ViewBuilder var main: () -> Main
    @ViewBuilder var pane: () -> Pane
    var body: some View {
        GeometryReader { geometry in
            let canDock = geometry.size.width >= width + 400
            HStack(spacing: 0) {
                main().frame(maxWidth: .infinity, maxHeight: .infinity)
                if canDock && isOpen { theme.color("border").frame(width: 1).accessibilityHidden(true); pane().frame(width: width).frame(maxHeight: .infinity, alignment: .top).background(theme.color("background")) }
            }.background { FabricatorSheet(title, isPresented: Binding(get: { !canDock && isSheetPresented }, set: { isSheetPresented = $0 })) { pane() } }
        }
    }
}

private struct BlockPanelContent: View {
    @Environment(\.fabricatorTheme) private var theme
    @Binding var selection: String
    var views: [String]
    var text: String
    var onClose: () -> Void
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .top, spacing: 4) {
                FabricatorTabs(views, selection: $selection) { EmptyView() }.frame(maxWidth: .infinity, alignment: .leading)
                FabricatorButton("Close panel", icon: "x", variant: .ghost, size: .iconSm, action: onClose)
            }.padding(8)
            FabricatorSeparator()
            Text(text).font(theme.bodyFont).padding(16).frame(maxWidth: .infinity, alignment: .leading)
            Spacer(minLength: 0)
        }
    }
}

private struct BlockWorkspaceShell: View {
    @Environment(\.fabricatorTheme) private var theme
    var onAction: (String) -> Void
    @State private var selection = "Q4 launch"
    @State private var workspace = "Acme Inc"
    @State private var expanded: Set<String> = ["Projects", "Favorites", "Workspace"]
    @State private var hidden: Set<String> = []
    @State private var pinned: Set<String> = []
    @State private var favorites: [String] = ["Q4 launch", "Roadmap"]
    @State private var isSidebarOpen = true
    @State private var isDetailsOpen = true
    @State private var isDetailsSheetPresented = false
    @State private var detailView = "Details"
    private let workspaceItems: [BlockNavigationNode] = [.init(title: "Projects", icon: "box", children: [.init(title: "Q4 launch"), .init(title: "Website")]), .init(title: "Team", icon: "users"), .init(title: "Settings", icon: "settings")]
    var body: some View {
        BlockFrame(isSidebarOpen: $isSidebarOpen, selection: selection, breadcrumbs: ["Projects", "Q4 launch"], hasInsetMain: true) { _ in
            sidebar
        } content: { _ in
            BlockDockedPane(isOpen: $isDetailsOpen, isSheetPresented: $isDetailsSheetPresented, title: "Details") {
                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        Text("Q4 launch").font(theme.font(24, weight: .semibold)).tracking(-0.6)
                        ForEach(0..<6) { _ in RoundedRectangle(cornerRadius: theme.radius("xl")).fill(theme.color("muted").opacity(0.5)).frame(height: 128).accessibilityHidden(true) }
                    }.padding(24).frame(maxWidth: 768).frame(maxWidth: .infinity)
                }
            } pane: {
                BlockPanelContent(selection: $detailView, views: ["Details", "Activity"], text: detailView == "Details" ? "Owner, status, dates and links." : "What changed, and who changed it.") { isDetailsOpen = false; isDetailsSheetPresented = false }
            }
        } actions: { isCompact in
            if !isCompact { FabricatorButton("Share", icon: "share", variant: .ghost, size: .sm) { onAction("Share") } }
            FabricatorButton("New issue", icon: "plus", size: .sm) { onAction("New issue") }.keyboardShortcut("c", modifiers: [])
            FabricatorButton("Details", icon: "panel-right", variant: .ghost, size: .iconSm) { isDetailsOpen.toggle(); isDetailsSheetPresented = true }
        }
    }
    private var sidebar: some View {
        VStack(spacing: 0) {
            HStack(spacing: 10) {
                Menu {
                    Text("Gabs Fabricator"); Text("gabs@fabricator.dev"); Divider(); Button("Profile") { onAction("Profile") }; Button("Notifications") { onAction("Notifications") }; Divider(); Button("Sign out") { onAction("Sign out") }
                } label: { FabricatorAvatar("Gabs Fabricator", size: 30) }.menuStyle(.borderlessButton).accessibilityLabel("Gabs Fabricator account")
                Menu {
                    ForEach(["Acme Inc", "Fabricator Studio"], id: \.self) { name in Button(name) { workspace = name } }
                    Divider(); Button("Create workspace") { onAction("Create workspace") }
                } label: { HStack(spacing: 6) { FabricatorIcon("command", size: 18); FabricatorIcon("chevron-down", size: 12) }.padding(6) }.menuStyle(.borderlessButton).accessibilityLabel("Workspace: \(workspace)")
                Spacer(minLength: 0)
                FabricatorButton("Collapse sidebar", icon: "panel-left", variant: .ghost, size: .iconSm) { isSidebarOpen = false }
            }.padding(10)
            ScrollView {
                VStack(alignment: .leading, spacing: 2) {
                    navigation(.init(title: "Home", icon: "house")); navigation(.init(title: "Inbox", icon: "inbox", badge: "4"))
                    if !pinned.isEmpty { BlockGroupHeading(title: "Pinned"); ForEach(pinned.sorted(), id: \.self) { name in navigation(.init(title: name)) } }
                    FabricatorCollapsible("Favorites", isExpanded: expansion("Favorites")) {
                        VStack(spacing: 2) {
                            ForEach(favorites, id: \.self) { name in navigation(.init(title: name)).draggable(name).dropDestination(for: String.self) { values, _ in
                                guard let value = values.first, let from = favorites.firstIndex(of: value), let to = favorites.firstIndex(of: name) else { return false }
                                favorites.insert(favorites.remove(at: from), at: to); return true
                            } }
                        }
                    }.padding(.horizontal, 8)
                    FabricatorCollapsible("Workspace", isExpanded: expansion("Workspace")) { VStack(spacing: 2) { ForEach(workspaceItems) { item in navigation(item) } } }.padding(.horizontal, 8)
                }.padding(8)
            }
            Menu {
                ForEach(["Home", "Inbox", "Q4 launch", "Roadmap", "Projects", "Team", "Settings"], id: \.self) { item in Toggle(item, isOn: Binding(get: { !hidden.contains(item) }, set: { if $0 { hidden.remove(item) } else { hidden.insert(item) } })) }
                Divider(); Button("Reset navigation") { hidden = []; pinned = []; favorites = ["Q4 launch", "Roadmap"] }
            } label: { HStack { FabricatorIcon("sliders-horizontal", size: 15); Text("Customize"); Spacer() }.font(theme.bodyFont).padding(12) }.menuStyle(.borderlessButton).accessibilityLabel("Customize navigation")
        }
    }
    @ViewBuilder private func navigation(_ node: BlockNavigationNode) -> some View {
        if !hidden.contains(node.title) {
            BlockNavigationBranch(node: node, selection: $selection, expanded: $expanded, separatesDisclosure: true, onAction: onAction).contextMenu {
                Button(pinned.contains(node.title) ? "Unpin" : "Pin") { if pinned.contains(node.title) { pinned.remove(node.title) } else { pinned.insert(node.title) } }
                Button("Hide") { hidden.insert(node.title) }
            }
        }
    }
    private func expansion(_ title: String) -> Binding<Bool> { Binding(get: { expanded.contains(title) }, set: { if $0 { expanded.insert(title) } else { expanded.remove(title) } }) }
}

private struct BlockWorkbenchShell: View {
    @Environment(\.fabricatorTheme) private var theme
    var onAction: (String) -> Void
    @State private var selection = "Fabricator"
    @State private var isSidebarOpen = false
    @State private var expanded: Set<String> = ["Projects"]
    @State private var isResourcesOpen = true
    @State private var isResourcesSheetPresented = false
    @State private var resourceView = "Files"
    @State private var tabs: [FabricatorTab] = [.init(id: "plan", title: "app-shell.md", icon: "pin", isClosable: false), .init(id: "shell", title: "app-shell.tsx", icon: "file-text"), .init(id: "notes", title: "Notes", icon: "file-text")]
    @State private var activeTab = "shell"
    @State private var nextDocument = 3
    @State private var renameTitle = ""
    @State private var isRenaming = false
    var body: some View {
        BlockFrame(isSidebarOpen: $isSidebarOpen, selection: selection, breadcrumbs: [], hasInsetMain: true) { _ in
            ScrollView { VStack(alignment: .leading, spacing: 2) {
                BlockNavigationBranch(node: .init(title: "Dashboard"), selection: $selection, expanded: $expanded, onAction: onAction)
                BlockNavigationBranch(node: .init(title: "Calendar"), selection: $selection, expanded: $expanded, onAction: onAction)
                FabricatorCollapsible("Projects", isExpanded: Binding(get: { expanded.contains("Projects") }, set: { if $0 { expanded.insert("Projects") } else { expanded.remove("Projects") } })) {
                    VStack(spacing: 2) { BlockNavigationBranch(node: .init(title: "Relay", badge: "3"), selection: $selection, expanded: $expanded, onAction: onAction); BlockNavigationBranch(node: .init(title: "Fabricator"), selection: $selection, expanded: $expanded, onAction: onAction) }
                }.padding(.horizontal, 8)
            }.padding(8) }
        } content: { isCompact in
            VStack(spacing: 0) {
                BlockDockedPane(isOpen: $isResourcesOpen, isSheetPresented: $isResourcesSheetPresented, title: "Resources") {
                    Text(tabs.first { $0.id == activeTab }?.title ?? "No open documents").font(theme.bodyFont).padding(24).frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                } pane: {
                    BlockPanelContent(selection: $resourceView, views: ["Files", "Search"], text: resourceView == "Files" ? "Your files." : "Search the project.") { isResourcesOpen = false; isResourcesSheetPresented = false }
                }
                if !isCompact { FabricatorSeparator(); HStack { Text("main"); Spacer(); Text("\(tabs.count) open") }.font(theme.font(11)).foregroundStyle(theme.color("muted-foreground")).padding(.horizontal, 12).frame(height: 28) }
            }
        } actions: { _ in
            FabricatorTabStrip(tabs: $tabs, selection: $activeTab).contextMenu { Button("Rename document") { renameTitle = tabs.first { $0.id == activeTab }?.title ?? ""; isRenaming = !activeTab.isEmpty } }
            FabricatorButton("New document", icon: "plus", variant: .ghost, size: .iconSm) { let id = "untitled-\(nextDocument)"; nextDocument += 1; tabs.append(.init(id: id, title: "Untitled", icon: "file-text")); activeTab = id; onAction("New document") }
            Menu { ForEach(tabs) { tab in Button(tab.title) { activeTab = tab.id } } } label: { FabricatorIcon("chevron-down", size: 14).frame(width: 24, height: 28) }.menuStyle(.borderlessButton).accessibilityLabel("Open documents")
            FabricatorButton("Files", icon: "files", variant: .ghost, size: .iconSm) { showResources("Files") }.keyboardShortcut("e", modifiers: [.command, .shift])
            FabricatorButton("Search", icon: "search", variant: .ghost, size: .iconSm) { showResources("Search") }.keyboardShortcut("f", modifiers: [.command, .shift])
        }.background { FabricatorDialog("Rename document", isPresented: $isRenaming) { FabricatorInput("Document title", text: $renameTitle); FabricatorButton("Save") { if let index = tabs.firstIndex(where: { $0.id == activeTab }), !renameTitle.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { tabs[index].title = renameTitle; isRenaming = false } }.disabled(renameTitle.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty) } }
    }
    private func showResources(_ view: String) { if resourceView == view { isResourcesOpen.toggle() } else { resourceView = view; isResourcesOpen = true }; isResourcesSheetPresented = true }
}

private struct BlockSaaSShell: View {
    var onAction: (String) -> Void
    @State private var selection = "Dashboard"
    @State private var team = "Acme Inc"
    @State private var expanded: Set<String> = []
    @State private var isSidebarOpen = true
    private let nodes: [BlockNavigationNode] = [.init(title: "Dashboard", icon: "layout-dashboard"), .init(title: "Analytics", icon: "chart-line"), .init(title: "Customers", icon: "users"), .init(title: "Settings", icon: "settings", children: ["General", "Billing", "Members"].map { .init(title: $0) })]
    var body: some View {
        BlockFrame(isSidebarOpen: $isSidebarOpen, selection: selection, breadcrumbs: ["Platform", "Dashboard"], allowsIconRail: true) { isRail in
            VStack(spacing: 0) {
                BlockTeamSwitcher(selection: $team, isRail: isRail, teams: ["Acme Inc", "Fabricator Studio"], firstIcon: "command", onCreate: { onAction("Add team") })
                ScrollView { VStack(alignment: .leading, spacing: 2) { if !isRail { BlockGroupHeading(title: "Platform") }; ForEach(nodes) { node in
                    if isRail { FabricatorButton(node.title, icon: node.icon, variant: selection == node.title ? .secondary : .ghost, size: .icon) { selection = node.title; if !node.children.isEmpty { isSidebarOpen = true; expanded.insert(node.title) }; onAction(node.title) } }
                    else { BlockNavigationBranch(node: node, selection: $selection, expanded: $expanded, separatesDisclosure: true, onAction: onAction) }
                } }.padding(isRail ? 4 : 8) }
                BlockAccountMenu(isRail: isRail, onAction: onAction)
            }
        } content: { isCompact in BlockPlaceholderContent(isCompact: isCompact) } actions: { _ in EmptyView() }
    }
}

private struct BlockAccountMenu: View {
    @Environment(\.fabricatorTheme) private var theme
    var isRail = false
    var onAction: (String) -> Void
    var body: some View {
        Menu {
            Text("Gabs Fabricator"); Text("gabs@fabricator.dev"); Divider(); Button("Account") { onAction("Account") }; Button("Billing") { onAction("Billing") }; Divider(); Button("Log out") { onAction("Log out") }
        } label: {
            HStack(spacing: 8) { FabricatorAvatar("Gabs Fabricator", size: 32); if !isRail { VStack(alignment: .leading, spacing: 2) { Text("Gabs Fabricator").font(theme.font(theme.text(12), weight: .medium)); Text("gabs@fabricator.dev").font(theme.font(theme.text(11))).foregroundStyle(theme.color("mutedOnFrame")) }; Spacer(minLength: 0); FabricatorIcon("chevrons-up-down", size: 12) } }.padding(10)
        }.menuStyle(.borderlessButton).accessibilityLabel("Gabs Fabricator account")
    }
}

private struct BlockLibraryShell: View {
    @Environment(\.fabricatorTheme) private var theme
    var onAction: (String) -> Void
    @State private var selection = "Library"
    @State private var expanded: Set<String> = []
    @AppStorage("fabricator.block.app-shell-04.sidebar") private var isSidebarOpen = true
    @State private var tabs: [FabricatorTab] = [.init(id: "welcome", title: "Welcome"), .init(id: "notes", title: "Meeting notes")]
    @State private var activeTab = "welcome"
    @State private var closedTabs: [FabricatorTab] = []
    var body: some View {
        BlockFrame(isSidebarOpen: $isSidebarOpen, selection: selection, breadcrumbs: [], hasInsetMain: true) { _ in
            VStack(alignment: .leading, spacing: 0) {
                Text("Library").font(theme.font(18, weight: .semibold)).tracking(-0.4).padding(16)
                VStack(spacing: 2) { ForEach([BlockNavigationNode(title: "Library"), .init(title: "Recent"), .init(title: "Shared", badge: "2")]) { item in BlockNavigationBranch(node: item, selection: $selection, expanded: $expanded, onAction: onAction) } }.padding(8)
                Spacer(minLength: 0)
            }.background(.ultraThinMaterial)
        } content: { _ in
            Text("\(tabs.first { $0.id == activeTab }?.title ?? "No open pages"). Drag the tab row or the sidebar's top to move the window.").font(theme.bodyFont).padding(24).frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        } actions: { _ in
            FabricatorTabStrip(tabs: $tabs, selection: $activeTab)
            FabricatorButton("Reopen closed page", icon: "plus", variant: .ghost, size: .iconSm) { if let tab = closedTabs.popLast() { tabs.append(tab); activeTab = tab.id } }.disabled(closedTabs.isEmpty)
        }.onChange(of: tabs) { oldTabs, newTabs in
            if newTabs.count < oldTabs.count { closedTabs.append(contentsOf: oldTabs.filter { old in !newTabs.contains { $0.id == old.id } }) }
        }
    }
}

private struct BlockInboxMessage: Identifiable, Sendable {
    var id: String
    var from: String
    var subject: String
    static let examples: [Self] = [.init(id: "1", from: "Ada", subject: "Launch checklist"), .init(id: "2", from: "Linus", subject: "Release notes draft"), .init(id: "3", from: "Grace", subject: "Design review on Friday")]
}

private struct BlockInboxShell: View {
    @Environment(\.fabricatorTheme) private var theme
    var onAction: (String) -> Void
    @State private var selection = "Inbox"
    @State private var expanded: Set<String> = []
    @State private var isSidebarOpen = true
    @State private var openId = "1"
    @State private var isMessageOpen = true
    @State private var isMessageSheetPresented = false
    @State private var isPhoneMessageOpen = false
    private let nodes: [BlockNavigationNode] = [.init(title: "Home", icon: "house"), .init(title: "Inbox", icon: "inbox", badge: "3"), .init(title: "Settings", icon: "settings")]
    private var openMessage: BlockInboxMessage? { BlockInboxMessage.examples.first { $0.id == openId } }
    var body: some View {
        BlockFrame(isSidebarOpen: $isSidebarOpen, selection: selection, breadcrumbs: ["Inbox"], hidesCompactHeader: isPhoneMessageOpen) { _ in
            VStack(spacing: 2) { ForEach(nodes) { item in BlockNavigationBranch(node: item, selection: $selection, expanded: $expanded, onAction: onAction) }; Spacer(minLength: 0) }.padding(8)
        } content: { isCompact in
            if isCompact && isPhoneMessageOpen { messagePanel(isCompact: true) }
            else if isCompact {
                VStack(spacing: 0) { messageList(isCompact: true).overlay(alignment: .bottomTrailing) { FabricatorButton("Compose", icon: "pencil") { onAction("Compose") }.padding(16) }; bottomBar }
            } else {
                BlockDockedPane(isOpen: $isMessageOpen, isSheetPresented: $isMessageSheetPresented, title: "Message", width: 320) { messageList(isCompact: false) } pane: { messagePanel(isCompact: false) }
            }
        } actions: { isCompact in if !isCompact { FabricatorButton("Compose", icon: "pencil", size: .sm) { onAction("Compose") } } }
    }
    private func messageList(isCompact: Bool) -> some View {
        ScrollView {
            VStack(spacing: 0) { ForEach(BlockInboxMessage.examples) { item in
                Button { openId = item.id; isMessageOpen = true; if isCompact { isPhoneMessageOpen = true } else { isMessageSheetPresented = true }; onAction("Open message: \(item.subject)") } label: {
                    VStack(alignment: .leading, spacing: 3) { Text(item.from).font(theme.font(theme.text(), weight: .medium)); Text(item.subject).font(theme.bodyFont).foregroundStyle(theme.color("muted-foreground")) }.frame(maxWidth: .infinity, alignment: .leading).padding(.horizontal, 16).padding(.vertical, 12).contentShape(Rectangle())
                }.buttonStyle(.plain)
                FabricatorSeparator()
            } }
        }.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
    private func messagePanel(isCompact: Bool) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 8) { FabricatorButton(isCompact ? "Back to inbox" : "Close message", icon: isCompact ? "chevron-left" : "x", variant: .ghost, size: .iconSm) { isPhoneMessageOpen = false; isMessageOpen = false; isMessageSheetPresented = false }; Text(openMessage?.subject ?? "Message").font(theme.font(theme.text(), weight: .medium)); Spacer(minLength: 0) }.padding(12)
            FabricatorSeparator()
            Text("From \(openMessage?.from ?? "").").font(theme.bodyFont).padding(16)
            Spacer(minLength: 0)
        }.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading).background(theme.color("background"))
    }
    private var bottomBar: some View {
        HStack(spacing: 0) { ForEach(nodes) { item in
            Button { selection = item.title; onAction(item.title) } label: { VStack(spacing: 4) { ZStack(alignment: .topTrailing) { FabricatorIcon(item.icon ?? "square", size: 20); if let badge = item.badge { Text(badge).font(theme.font(9, weight: .semibold)).foregroundStyle(theme.color("primary-foreground")).padding(.horizontal, 3).background(theme.color("primary"), in: Capsule()).offset(x: 10, y: -5) } }; Text(item.title).font(theme.font(11, weight: .medium)) }.foregroundStyle(theme.color(selection == item.title ? "foreground" : "muted-foreground")).frame(maxWidth: .infinity).frame(height: 56).contentShape(Rectangle()) }.buttonStyle(.plain).accessibilityAddTraits(selection == item.title ? .isSelected : [])
        } }.background(theme.color("background")).overlay(alignment: .top) { FabricatorSeparator() }
    }
}

public struct FabricatorAppShellBlock: View {
    public var variant: Int
    public var onAction: (String) -> Void
    public init(variant: Int = 1, onAction: @escaping (String) -> Void = { _ in }) { precondition((1...5).contains(variant), "App Shell block variants are 1 through 5."); self.variant = variant; self.onAction = onAction }
    public var body: some View {
        Group {
            switch variant {
            case 1: BlockWorkspaceShell(onAction: onAction)
            case 2: BlockWorkbenchShell(onAction: onAction)
            case 3: BlockSaaSShell(onAction: onAction)
            case 4: BlockLibraryShell(onAction: onAction)
            case 5: BlockInboxShell(onAction: onAction)
            default: EmptyView()
            }
        }.frame(height: 640)
    }
}

/// The published preview-03 fixture contains this text only.
public struct FabricatorPreviewBlock: View {
    public init() {}
    public var body: some View { Text("Preview03").frame(maxWidth: .infinity, minHeight: 320) }
}

public struct FabricatorBlock: View {
    public var name: String
    public var onSubmit: (FabricatorAuthValues) -> Void
    public var onAction: (String) -> Void
    public var onProviderSignIn: (String) -> Void
    public init(_ name: String, onSubmit: @escaping (FabricatorAuthValues) -> Void = { _ in }, onAction: @escaping (String) -> Void = { _ in }, onProviderSignIn: @escaping (String) -> Void = { _ in }) { self.name = name; self.onSubmit = onSubmit; self.onAction = onAction; self.onProviderSignIn = onProviderSignIn }
    public var body: some View {
        let parts = name.split(separator: "-")
        let variant = parts.last.flatMap { Int($0) } ?? 0
        Group {
            switch parts.first {
            case "login" where (1...5).contains(variant): FabricatorAuthBlock(variant: variant, onSubmit: onSubmit, onProviderSignIn: onProviderSignIn, onNavigate: onAction)
            case "signup" where (1...5).contains(variant): FabricatorAuthBlock(isSignup: true, variant: variant, onSubmit: onSubmit, onProviderSignIn: onProviderSignIn, onNavigate: onAction)
            case "sidebar" where (1...16).contains(variant): FabricatorSidebarBlock(variant: variant, onAction: onAction)
            case "app" where name.hasPrefix("app-shell-") && (1...5).contains(variant): FabricatorAppShellBlock(variant: variant, onAction: onAction)
            case "preview" where name == "preview-03": FabricatorPreviewBlock()
            default: Text("Unknown block: \(name)").foregroundStyle(.secondary)
            }
        }
    }
}
