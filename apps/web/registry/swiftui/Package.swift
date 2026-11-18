// swift-tools-version: 6.0
import PackageDescription
import Foundation

let sourceRoot = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
let shouldTestBlocks = FileManager.default.fileExists(atPath: sourceRoot.appendingPathComponent("ui/blocks.swift").path)
let excludedFiles = ["tests", "Package.swift", "README.md", "manifest.json", "parity-exceptions.json", "LICENSE.md", "NOTICE.md", "fabricator.json"].filter { FileManager.default.fileExists(atPath: sourceRoot.appendingPathComponent($0).path) }

let package = Package(
    name: "FabricatorUI",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [.library(name: "FabricatorUI", targets: ["FabricatorUI"])],
    targets: [
        .target(name: "FabricatorUI", path: ".", exclude: excludedFiles, sources: ["models", "ui", "platform"], resources: [.process("resources")]),
        .testTarget(name: "FabricatorUITests", dependencies: ["FabricatorUI"], path: "tests", swiftSettings: shouldTestBlocks ? [.define("FABRICATOR_BLOCKS")] : [])
    ]
)
