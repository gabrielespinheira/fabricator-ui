import CoreText
import Foundation

struct FabricatorTypographyTokens: Decodable, Sendable {
    struct Weights: Decodable, Sendable { var medium: Double; var semibold: Double }
    var weights: Weights
}

enum FabricatorFontAdapter {
    private static let registered: Bool = {
        registerFonts(["InterVariable", "InterVariable-Italic"])
    }()
    private static let registeredMonospace: Bool = {
        registerFonts(["GeistMonoVariable", "GeistMonoVariable-Italic"])
    }()

    private static func registerFonts(_ names: [String]) -> Bool {
        #if SWIFT_PACKAGE
        let bundle = Bundle.module
        #else
        let bundle = Bundle.main
        #endif
        for name in names {
            guard let url = bundle.url(forResource: name, withExtension: "ttf") else { preconditionFailure("Fabricator UI font is missing: \(name)") }
            var error: Unmanaged<CFError>?
            if !CTFontManagerRegisterFontsForURL(url as CFURL, .process, &error) {
                let failure = error?.takeRetainedValue()
                guard let failure, CFErrorGetCode(failure) == CTFontManagerError.alreadyRegistered.rawValue else { preconditionFailure("Fabricator UI font registration failed for \(name): \(String(describing: failure))") }
            }
        }
        return true
    }

    static func makeFont(size: CGFloat, weight: Double, isItalic: Bool = false) -> CTFont {
        _ = registered
        // Contract 10: named Apple weights round away the web's 450/550 axes.
        let descriptor = CTFontDescriptorCreateWithAttributes([
            kCTFontNameAttribute: isItalic ? "InterVariableItalic" : "InterVariable",
            kCTFontVariationAttribute: [NSNumber(value: 0x77676874): weight, NSNumber(value: 0x6f70737a): size]
        ] as CFDictionary)
        return CTFontCreateWithFontDescriptor(descriptor, size, nil)
    }

    static func makeMonospaceFont(size: CGFloat, weight: Double = 400, isItalic: Bool = false) -> CTFont {
        _ = registeredMonospace
        let descriptor = CTFontDescriptorCreateWithAttributes([
            kCTFontNameAttribute: isItalic ? "GeistMono-Italic" : "GeistMono-Regular",
            kCTFontVariationAttribute: [NSNumber(value: 0x77676874): weight]
        ] as CFDictionary)
        return CTFontCreateWithFontDescriptor(descriptor, size, nil)
    }

    static func withMonospacedDigits(_ font: CTFont) -> CTFont {
        let descriptor = CTFontDescriptorCreateWithAttributes([
            kCTFontFeatureSettingsAttribute: [[kCTFontFeatureTypeIdentifierKey: kNumberSpacingType, kCTFontFeatureSelectorIdentifierKey: kMonospacedNumbersSelector]]
        ] as CFDictionary)
        return CTFontCreateCopyWithAttributes(font, 0, nil, descriptor)
    }

    static func measureTextWidth(_ text: String, font: CTFont) -> CGFloat {
        let attributed = NSAttributedString(string: text, attributes: [NSAttributedString.Key(kCTFontAttributeName as String): font])
        return ceil(CTLineGetTypographicBounds(CTLineCreateWithAttributedString(attributed), nil, nil, nil))
    }
}
