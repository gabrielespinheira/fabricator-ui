import SwiftUI

public struct FabricatorFileTypeIcon: View {
    @Environment(\.fabricatorTheme) private var theme
    public var name: String
    public var isDirectory: Bool
    public var isExpanded: Bool
    public var size: CGFloat?
    public init(_ name: String, isDirectory: Bool = false, isExpanded: Bool = false, size: CGFloat? = nil) {
        self.name = name; self.isDirectory = isDirectory; self.isExpanded = isExpanded; self.size = size
    }
    public var body: some View {
        let icon = FabricatorFileIconAssets.catalog.resolve(name, isDirectory: isDirectory, isExpanded: isExpanded)
        let scheme = theme.colorScheme == .dark ? "dark" : "light"
        Image(decorative: FabricatorFileIconAssets.image(icon, scheme: scheme), scale: 3)
            .resizable().renderingMode(.original).interpolation(.high)
            .frame(width: size ?? theme.icon(), height: size ?? theme.icon()).accessibilityHidden(true)
    }
}
