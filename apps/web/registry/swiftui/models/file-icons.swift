import Foundation

struct FabricatorFileIconCatalog: Decodable, Sendable {
    var names: Set<String>
    var fileNames: [String: String]
    var fileExtensions: [String: String]
    var folderNames: [String: String]

    func resolve(_ name: String, isDirectory: Bool, isExpanded: Bool = false) -> String {
        let base = name.replacingOccurrences(of: "\\", with: "/").split(separator: "/", omittingEmptySubsequences: false).last.map(String.init)?.lowercased() ?? ""
        if isDirectory {
            let icon = folderNames[base, default: "default-folder"]
            return isExpanded ? "\(icon)-open" : icon
        }
        if let exact = fileNames[base] { return exact }
        var suffix = base[...]
        while let dot = suffix.firstIndex(of: ".") {
            suffix = suffix[suffix.index(after: dot)...]
            if let icon = fileExtensions[String(suffix)] { return icon }
        }
        return "default-file"
    }
}
