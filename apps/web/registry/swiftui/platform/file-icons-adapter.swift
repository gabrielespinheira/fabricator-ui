import Foundation
import ImageIO

enum FabricatorFileIconAssets {
    @MainActor private static var images: [String: CGImage] = [:]
    #if SWIFT_PACKAGE
    static let bundle = Bundle.module
    #else
    static let bundle = Bundle.main
    #endif

    static let catalog: FabricatorFileIconCatalog = {
        guard let url = bundle.url(forResource: "file-icons", withExtension: "json") else { preconditionFailure("Fabricator file icon assets are missing. Run sync-contract.ts.") }
        let catalog: FabricatorFileIconCatalog
        do { catalog = try JSONDecoder().decode(FabricatorFileIconCatalog.self, from: Data(contentsOf: url)) }
        catch { preconditionFailure("Fabricator file icon catalog cannot be decoded: \(error)") }
        for name in catalog.names {
            for scheme in ["light", "dark"] {
                precondition(bundle.url(forResource: "fabricator-files-\(scheme)-\(name)@3x", withExtension: "png") != nil, "Missing Fabricator file icon: \(scheme)/\(name)")
            }
        }
        return catalog
    }()

    @MainActor
    static func image(_ name: String, scheme: String) -> CGImage {
        let key = "fabricator-files-\(scheme)-\(name)@3x"
        if let image = images[key] { return image }
        guard let url = bundle.url(forResource: key, withExtension: "png"),
              let source = CGImageSourceCreateWithURL(url as CFURL, nil),
              let image = CGImageSourceCreateImageAtIndex(source, 0, nil)
        else { preconditionFailure("Fabricator file icon cannot be decoded: \(key)") }
        images[key] = image
        return image
    }
}
