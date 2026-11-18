#if os(iOS)
import XCTest
import UIKit
import CoreText
@testable import FabricatorUI

@MainActor
final class EditorRenderingTests: XCTestCase {
    func testFirstCodeBlockKeepsItsFullHeaderInsideDocumentInsets() throws {
        let state = FabricatorEditorState("```md\n# Code title\n**strong**\n```")
        let view = EditorNativeTextView(frame: CGRect(x: 0, y: 0, width: 400, height: 240))
        let presentation = FabricatorEditorUIKitPresentation(theme: FabricatorTheme(), size: .default)
        view.receiveTheme(presentation.record, fontResolver: presentation.resolveFont, codeStyle: presentation.codeStyle)
        view.setContentInsets(presentation.insets)
        let content = try JSONDecoder().decode(EditorContentRecord.self, from: JSONEncoder().encode(state.snapshot.nativeContent))
        view.receiveContent(content); view.applyReceivedProps()
        _ = view.sizeThatFits(CGSize(width: 400, height: 240))
        view.layoutIfNeeded()
        let text = try XCTUnwrap(view.subviews.compactMap { $0 as? UITextView }.first)
        let layout = try XCTUnwrap(text.textLayoutManager)
        let storage = try XCTUnwrap(layout.textContentManager)
        let fragment = try XCTUnwrap(layout.textLayoutFragment(for: storage.documentRange.location) as? EditorLayoutFragment)
        let decoration = try XCTUnwrap(fragment.decoration)
        let lines = try XCTUnwrap(fragment.lineBounds(decoration))
        let frame = fragment.layoutFragmentFrame
        let panel = EditorLayoutFragment.codeBlockRect(decoration, first: lines.first, last: lines.last, left: -frame.minX)
            .offsetBy(dx: frame.minX + text.textContainerInset.left, dy: frame.minY + text.textContainerInset.top)
        XCTAssertEqual(panel.minY, presentation.insets.top, accuracy: 1)
        XCTAssertGreaterThanOrEqual(EditorCodeChrome(decoration: decoration, block: panel).copyRect.minY, presentation.insets.top)
        var plain = EditorContentRecord(); plain.version = 2; plain.text = "Plain"
        var paragraph = EditorParagraphRecord(); paragraph.start = 0; paragraph.end = 5
        plain.paragraphs = [paragraph]
        view.receiveContent(plain); view.applyReceivedProps()
        XCTAssertEqual(text.textContainerInset, presentation.insets)
    }

    func testHostedTaskControlStaysVisibleAfterRepeatedRestyling() throws {
        let view = EditorNativeTextView(frame: CGRect(x: 0, y: 0, width: 400, height: 160))
        let presentation = FabricatorEditorUIKitPresentation(theme: FabricatorTheme(), size: .default)
        view.receiveTheme(presentation.record, fontResolver: presentation.resolveFont, codeStyle: presentation.codeStyle)
        view.setContentInsets(presentation.insets)
        let button = UIButton(type: .custom)
        view.setDecorationControlProvider(size: 44) { _, _ in button }
        let lines = (1...30).map { "Paragraph \($0)" }
        let source = (lines + ["Task"]).joined(separator: "\n")
        var paragraphs: [EditorParagraphRecord] = []
        var offset = 0
        for line in lines {
            var paragraph = EditorParagraphRecord(); paragraph.start = offset; paragraph.end = offset + line.utf16.count
            paragraphs.append(paragraph); offset = paragraph.end + 1
        }
        let text = try XCTUnwrap(view.subviews.compactMap { $0 as? UITextView }.first)
        for version in 1...4 {
            var content = EditorContentRecord(); content.version = version; content.text = source
            var paragraph = EditorParagraphRecord(); paragraph.kind = .task; paragraph.start = offset; paragraph.end = offset + 4; paragraph.checked = version.isMultiple(of: 2)
            content.paragraphs = paragraphs + [paragraph]
            view.receiveContent(content); view.applyReceivedProps()
            if version == 1 {
                let height = view.sizeThatFits(CGSize(width: 400, height: CGFloat.greatestFiniteMagnitude)).height
                text.setContentOffset(CGPoint(x: 0, y: height - 160), animated: false)
            }
            view.setNeedsLayout(); view.layoutIfNeeded()
            let host = try XCTUnwrap(button.superview)
            XCTAssertFalse(host.isHidden, "Task control disappeared after update \(version)")
            let frame = button.convert(button.bounds, to: view)
            XCTAssertEqual(frame.width, 44)
            XCTAssertGreaterThanOrEqual(frame.midY, 0)
            XCTAssertLessThanOrEqual(frame.midY, view.bounds.maxY)
        }
    }

    func testReplacingStateWithMatchingRevisionUpdatesNativeTextAndSelection() throws {
        let before = FabricatorEditorState("Before")
        before.select(NSRange(location: 4, length: 0))
        let view = EditorNativeTextView(frame: CGRect(x: 0, y: 0, width: 400, height: 160))
        let coordinator = FabricatorNativeEditor.Coordinator(before)
        coordinator.receiveSnapshot(view); view.applyReceivedProps()
        let after = FabricatorEditorState("After")
        after.select(NSRange(location: 0, length: 0))
        XCTAssertEqual(before.snapshot.nativeContent.version, after.snapshot.nativeContent.version)
        XCTAssertEqual(before.revision, after.revision)
        coordinator.state = after
        coordinator.receiveSnapshot(view); view.applyReceivedProps()
        let text = try XCTUnwrap(view.subviews.compactMap { $0 as? UITextView }.first)
        XCTAssertEqual(text.text, "After")
        XCTAssertEqual(text.selectedRange, NSRange(location: 0, length: 0))
    }

    func testFocusFlushesPendingCanonicalTextAndCaretBeforeUIKitReceivesFocus() throws {
        let state = FabricatorEditorState("Before")
        let view = EditorNativeTextView(frame: CGRect(x: 0, y: 0, width: 400, height: 160))
        let presentation = FabricatorEditorUIKitPresentation(theme: FabricatorTheme(), size: .default)
        view.receiveTheme(presentation.record, fontResolver: presentation.resolveFont, codeStyle: presentation.codeStyle)
        let coordinator = FabricatorNativeEditor.Coordinator(state)
        coordinator.connect(view); coordinator.receiveSnapshot(view); view.applyReceivedProps()
        let text = try XCTUnwrap(view.subviews.compactMap { $0 as? UITextView }.first)
        XCTAssertEqual(text.selectedRange, NSRange(location: 0, length: 0))
        state.replace(from: 0, to: 6, text: "Current 👩🏽‍💻")
        let caret = state.snapshot.flatText.utf16.count
        state.select(NSRange(location: caret, length: 0))
        coordinator.focus(view)
        XCTAssertEqual(text.text, "Current 👩🏽‍💻")
        XCTAssertEqual(text.selectedRange, NSRange(location: caret, length: 0))
        XCTAssertEqual(state.selectedRange, text.selectedRange)
    }

    func testTaskControlHitAreaEndsBeforeEditableText() throws {
        let view = EditorNativeTextView(frame: CGRect(x: 0, y: 0, width: 400, height: 160))
        let presentation = FabricatorEditorUIKitPresentation(theme: FabricatorTheme(), size: .default)
        view.receiveTheme(presentation.record, fontResolver: presentation.resolveFont, codeStyle: presentation.codeStyle)
        view.setContentInsets(presentation.insets)
        var content = EditorContentRecord(); content.text = "Review this task"; content.version = 1
        var paragraph = EditorParagraphRecord(); paragraph.kind = .task; paragraph.start = 0; paragraph.end = content.text.utf16.count
        content.paragraphs = [paragraph]
        let button = UIButton(type: .custom)
        view.setDecorationControlProvider(size: 44) { _, _ in button }
        view.receiveContent(content); view.applyReceivedProps()
        _ = view.sizeThatFits(CGSize(width: 400, height: 160))
        view.setNeedsLayout(); view.layoutIfNeeded()
        let buttonFrame = button.convert(button.bounds, to: view)
        XCTAssertEqual(buttonFrame.width, 44)
        let controlHit = try XCTUnwrap(view.hitTest(CGPoint(x: buttonFrame.midX, y: buttonFrame.midY), with: nil))
        XCTAssertTrue(controlHit.isDescendant(of: button))
        let textHit = try XCTUnwrap(view.hitTest(CGPoint(x: presentation.insets.left + presentation.record.indentWidth + 1, y: buttonFrame.midY), with: nil))
        XCTAssertFalse(textHit.isDescendant(of: button))
    }

    func testFencedMarkdownPreservesTokenDecorationsWithoutCreatingInteractiveLinks() throws {
        let state = FabricatorEditorState("```md\n# Code title\n**strong** *emphasis* [link](https://example.com)\n```")
        let content = try JSONDecoder().decode(EditorContentRecord.self, from: JSONEncoder().encode(state.snapshot.nativeContent))
        let presentation = FabricatorEditorUIKitPresentation(theme: FabricatorTheme(), size: .default)
        let styled = NSMutableAttributedString(string: content.text)
        EditorStyler(theme: presentation.resolvedTheme).apply(EditorDocument(record: content), to: styled)
        let link = try XCTUnwrap(state.snapshot.nativeContent.spans.first { $0.token == "link" })
        XCTAssertEqual(styled.attribute(.underlineStyle, at: link.start, effectiveRange: nil) as? Int, NSUnderlineStyle.single.rawValue)
        XCTAssertEqual(styled.attribute(.underlineColor, at: link.start, effectiveRange: nil) as? UIColor, presentation.resolvedTheme.syntax["link"])
        XCTAssertNil(styled.attribute(.link, at: link.start, effectiveRange: nil))
        let strong = try XCTUnwrap(state.snapshot.nativeContent.spans.first { $0.bold && $0.token == nil })
        let font = try XCTUnwrap(styled.attribute(.font, at: strong.start, effectiveRange: nil) as? UIFont)
        XCTAssertEqual(font.familyName, "Geist Mono")
        let axes = try XCTUnwrap(CTFontCopyVariation(font as CTFont) as? [NSNumber: NSNumber])
        XCTAssertEqual(axes[NSNumber(value: 0x77676874)]?.doubleValue, 550)
        let emphasis = try XCTUnwrap(state.snapshot.nativeContent.spans.first { $0.italic })
        let italic = try XCTUnwrap(styled.attribute(.font, at: emphasis.start, effectiveRange: nil) as? UIFont)
        XCTAssertTrue(italic.fontDescriptor.symbolicTraits.contains(.traitItalic))
    }

    func testEditorUsesExactVariableWeightsAndRealItalicCuts() throws {
        let presentation = FabricatorEditorUIKitPresentation(theme: FabricatorTheme(), size: .default)
        let theme = presentation.resolvedTheme
        let semibold = theme.semiboldFont(size: 20)
        XCTAssertEqual(semibold.familyName, "Inter Variable")
        let variation = try XCTUnwrap(CTFontCopyVariation(semibold as CTFont) as? [NSNumber: NSNumber])
        XCTAssertEqual(variation[NSNumber(value: 0x77676874)]?.doubleValue, 550)
        let paragraph = EditorParagraph.empty
        let styler = EditorStyler(theme: theme)
        var marks = EditorMarks(); marks.isBold = true; marks.isItalic = true
        let metrics = styler.metrics(for: paragraph)
        let attributes = styler.attributes(for: paragraph, marks: marks, metrics: metrics, paragraphStyle: styler.paragraphStyle(for: paragraph, metrics: metrics, next: nil, isFirst: true))
        let italic = try XCTUnwrap(attributes[.font] as? UIFont)
        XCTAssertTrue(italic.fontName.hasPrefix("InterVariableItalic"))
        XCTAssertTrue(italic.fontDescriptor.symbolicTraits.contains(.traitItalic))
        let italicVariation = try XCTUnwrap(CTFontCopyVariation(italic as CTFont) as? [NSNumber: NSNumber])
        XCTAssertEqual(italicVariation[NSNumber(value: 0x77676874)]?.doubleValue, 550)
        XCTAssertEqual(theme.monoFont(size: 14, isBold: false).familyName, "Geist Mono")
    }

    func testDocumentSizesStayIndependentOfInterfaceDensityAndCodeSize() {
        for (size, body) in [(FabricatorDocumentSize.sm, 14.0), (.default, 16.0), (.lg, 18.0)] {
            for density in [FabricatorDensity.compact, .regular, .spacious] {
                let input = FabricatorTheme(density: density)
                let presentation = FabricatorEditorUIKitPresentation(theme: input, size: size)
                XCTAssertEqual(presentation.record.fontSize, body)
                XCTAssertEqual(presentation.insets.left, body)
                XCTAssertEqual(presentation.insets.top, body * 0.75)
                var paragraph = EditorParagraph.empty; paragraph.kind = .code
                let metrics = EditorStyler(theme: presentation.resolvedTheme).metrics(for: paragraph)
                XCTAssertEqual(metrics.font.pointSize, input.text(14))
                XCTAssertEqual(metrics.headerHeight, input.minimumControlHeight(36, textStep: 12))
            }
        }
    }

    func testLiveTextSizeChangesRestyleWithoutChangingTextOrSelection() throws {
        let view = EditorNativeTextView(frame: CGRect(x: 0, y: 0, width: 400, height: 300))
        let regular = FabricatorEditorUIKitPresentation(theme: FabricatorTheme(), size: .default)
        view.receiveTheme(regular.record, fontResolver: regular.resolveFont, codeStyle: regular.codeStyle)
        view.setContentInsets(regular.insets)
        var content = EditorContentRecord(); content.version = 1; content.text = "Native text"
        var paragraph = EditorParagraphRecord(); paragraph.start = 0; paragraph.end = 11
        content.paragraphs = [paragraph]
        view.receiveContent(content)
        var selection = EditorSelectionRecord(); selection.start = 2; selection.end = 6; selection.version = 1
        view.receiveSelection(selection); view.applyReceivedProps()
        let text = try XCTUnwrap(view.subviews.compactMap { $0 as? UITextView }.first)
        XCTAssertEqual((text.attributedText.attribute(.font, at: 0, effectiveRange: nil) as? UIFont)?.pointSize, 16)
        var largeTheme = FabricatorTheme(); largeTheme.fontScale = 2
        let large = FabricatorEditorUIKitPresentation(theme: largeTheme, size: .default)
        view.receiveTheme(large.record, fontResolver: large.resolveFont, codeStyle: large.codeStyle)
        view.setContentInsets(large.insets); view.applyReceivedProps()
        XCTAssertEqual(text.text, "Native text")
        XCTAssertEqual(text.selectedRange, NSRange(location: 2, length: 4))
        XCTAssertEqual((text.attributedText.attribute(.font, at: 0, effectiveRange: nil) as? UIFont)?.pointSize, 32)
        XCTAssertEqual(text.textContainerInset.left, 32)
    }

    func testCodeUsesCanonicalTokenAliases() throws {
        let input = FabricatorTheme(colorScheme: .dark)
        let presentation = FabricatorEditorUIKitPresentation(theme: input, size: .default)
        for (token, role) in [("attribute", "syntax-constant"), ("property", "syntax-function"), ("variable", "syntax-tag"), ("regex", "syntax-type"), ("inserted", "success-text"), ("deleted", "destructive-text")] {
            let actual = try XCTUnwrap(presentation.resolvedTheme.syntax[token]).cgColor.components ?? []
            let expected = UIColor(input.color(role)).cgColor.components ?? []
            XCTAssertEqual(actual.count, 4)
            XCTAssertEqual(expected.count, 4)
            for (left, right) in zip(actual, expected) { XCTAssertEqual(left, right, accuracy: 0.5 / 255) }
        }
    }
}
#endif

#if os(macOS)
import XCTest
import AppKit
import CoreText
@testable import FabricatorUI

@MainActor
final class EditorAppKitFocusTests: XCTestCase {
    func testMatchingStateRevisionsRefreshTheAppKitDocumentAndCaret() {
        _ = NSApplication.shared
        let before = FabricatorEditorState("Before")
        before.select(NSRange(location: 4, length: 0))
        let view = FabricatorEditorNSTextView(frame: CGRect(x: 0, y: 0, width: 400, height: 160))
        let coordinator = FabricatorNativeEditor.Coordinator(before)
        let theme = FabricatorTheme()
        coordinator.receiveSnapshot(view, theme: theme, size: .default)
        let after = FabricatorEditorState("After")
        after.select(NSRange(location: 0, length: 0))
        XCTAssertEqual(before.snapshot.nativeContent.version, after.snapshot.nativeContent.version)
        XCTAssertEqual(before.revision, after.revision)
        coordinator.state = after
        coordinator.receiveSnapshot(view, theme: theme, size: .default)
        XCTAssertEqual(view.string, "After")
        XCTAssertEqual(view.selectedRange(), after.selectedRange)
    }

    func testPendingFocusAndStateReplacementFlushCanonicalContentAndSelection() {
        _ = NSApplication.shared
        let state = FabricatorEditorState("Before")
        let view = FabricatorEditorNSTextView(frame: CGRect(x: 0, y: 0, width: 400, height: 160))
        let coordinator = FabricatorNativeEditor.Coordinator(state)
        let theme = FabricatorTheme()
        coordinator.receiveSnapshot(view, theme: theme, size: .default)
        state.replace(from: 0, to: 6, text: "Current 👩🏽‍💻")
        state.select(NSRange(location: state.snapshot.flatText.utf16.count, length: 0))
        coordinator.focus(view, theme: theme, size: .default)
        XCTAssertEqual(view.string, "Current 👩🏽‍💻")
        XCTAssertEqual(view.selectedRange(), state.selectedRange)
        let replacement = FabricatorEditorState("After")
        replacement.select(NSRange(location: 0, length: 0))
        coordinator.state = replacement
        coordinator.receiveSnapshot(view, theme: theme, size: .default)
        XCTAssertEqual(view.string, "After")
        XCTAssertEqual(view.selectedRange(), replacement.selectedRange)
    }

    func testFencedMarkdownKeepsCodeWeightItalicAndNoninteractiveLinkUnderline() throws {
        let state = FabricatorEditorState("```md\n# Code title\n**strong** *emphasis* [link](https://example.com)\n```")
        let theme = FabricatorTheme()
        let styled = makeAppKitContent(state.snapshot.nativeContent, theme: theme, size: .default)
        let link = try XCTUnwrap(state.snapshot.nativeContent.spans.first { $0.token == "link" })
        XCTAssertEqual(styled.attribute(.underlineStyle, at: link.start, effectiveRange: nil) as? Int, NSUnderlineStyle.single.rawValue)
        XCTAssertNil(styled.attribute(.link, at: link.start, effectiveRange: nil))
        let color = try XCTUnwrap((styled.attribute(.underlineColor, at: link.start, effectiveRange: nil) as? NSColor)?.usingColorSpace(.sRGB))
        let expected = try XCTUnwrap(NSColor(theme.color("syntax-function")).usingColorSpace(.sRGB))
        XCTAssertEqual(color.redComponent, expected.redComponent, accuracy: 0.0001)
        XCTAssertEqual(color.greenComponent, expected.greenComponent, accuracy: 0.0001)
        XCTAssertEqual(color.blueComponent, expected.blueComponent, accuracy: 0.0001)
        let strong = try XCTUnwrap(state.snapshot.nativeContent.spans.first { $0.bold && $0.token == nil })
        let font = try XCTUnwrap(styled.attribute(.font, at: strong.start, effectiveRange: nil) as? NSFont)
        XCTAssertEqual(font.familyName, "Geist Mono")
        let axes = try XCTUnwrap(CTFontCopyVariation(font as CTFont) as? [NSNumber: NSNumber])
        XCTAssertEqual(axes[NSNumber(value: 0x77676874)]?.doubleValue, 550)
        let emphasis = try XCTUnwrap(state.snapshot.nativeContent.spans.first { $0.italic })
        let italic = try XCTUnwrap(styled.attribute(.font, at: emphasis.start, effectiveRange: nil) as? NSFont)
        XCTAssertTrue(CTFontGetSymbolicTraits(italic as CTFont).contains(.traitItalic))
    }

    func testNativeFocusReportsTheInitialCaretBeforeTypingAndResignation() throws {
        _ = NSApplication.shared
        let state = FabricatorEditorState("# Native heading")
        let view = FabricatorEditorNSTextView(frame: CGRect(x: 0, y: 0, width: 400, height: 200))
        view.string = "Native heading"
        var focusChanges: [Bool] = []
        view.onFocusChange = { isFocused in
            focusChanges.append(isFocused)
            if isFocused { state.select(view.selectedRange()) }
        }
        let window = NSWindow(contentRect: view.frame, styleMask: .borderless, backing: .buffered, defer: false)
        window.isReleasedWhenClosed = false
        window.contentView = view
        defer { window.close() }
        XCTAssertNil(state.snapshot.selection)
        XCTAssertTrue(window.makeFirstResponder(view))
        XCTAssertEqual(focusChanges, [true])
        XCTAssertNotNil(state.snapshot.selection)
        XCTAssertEqual(state.snapshot.headingLevel, 1)
        XCTAssertTrue(try XCTUnwrap(state.snapshot.commands.first { $0.id == "heading-1" }).isActive)
        XCTAssertTrue(window.makeFirstResponder(nil))
        XCTAssertEqual(focusChanges, [true, false])
        XCTAssertFalse(state.canUndo)
    }
}
#endif
