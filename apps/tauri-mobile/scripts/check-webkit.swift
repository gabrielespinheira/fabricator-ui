import AppKit
import WebKit

@MainActor
final class WebKitCheck: NSObject, WKNavigationDelegate {
    private let application = NSApplication.shared
    private let outputDirectory: URL
    private var window: NSWindow?
    private var webView: WKWebView?

    init(outputDirectory: URL) {
        self.outputDirectory = outputDirectory
    }

    func run() {
        let configuration = WKWebViewConfiguration()
        configuration.userContentController.addUserScript(WKUserScript(
            source: "localStorage.setItem('fabricator.tauri-mobile.theme', 'dark');localStorage.removeItem('fabricator.tauri-mobile.settings');",
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        ))
        let view = WKWebView(frame: NSRect(x: 0, y: 0, width: 1280, height: 800), configuration: configuration)
        view.navigationDelegate = self
        view.appearance = NSAppearance(named: .darkAqua)
        let window = NSWindow(contentRect: view.frame, styleMask: [.titled], backing: .buffered, defer: false)
        window.contentView = view
        window.orderBack(nil)
        self.window = window
        self.webView = view
        guard let address = URL(string: "http://localhost:1420") else { fail("Invalid preview address."); return }
        view.load(URLRequest(url: address))
        application.run()
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) { [weak self] in self?.capture() }
    }

    private func capture() {
        guard let webView else { fail("WKWebView was not created."); return }
        let script = """
        JSON.stringify({
          userAgent: navigator.userAgent,
          root: document.documentElement.className,
          elements: document.elementsFromPoint(60, 90).map(element => {
            const style = getComputedStyle(element);
            return {tag: element.tagName, slot: element.getAttribute('data-slot'), background: style.backgroundColor,
            opacity: style.opacity, filter: style.filter, backdrop: style.backdropFilter, surface: style.getPropertyValue('--surface-1'),
            frame: style.getPropertyValue('--app-shell-frame'), fill: style.getPropertyValue('--app-shell-frame-fill')};
          })
        }, null, 2)
        """
        webView.evaluateJavaScript(script) { [weak self] result, error in
            guard let self else { return }
            if let error { self.fail(error.localizedDescription); return }
            guard let result = result as? String else { self.fail("WKWebView returned no diagnostics."); return }
            do {
                try result.write(to: self.outputDirectory.appendingPathComponent("styles.json"), atomically: true, encoding: .utf8)
            } catch { self.fail(error.localizedDescription); return }
            webView.takeSnapshot(with: nil) { [weak self] image, error in
                guard let self else { return }
                if let error { self.fail(error.localizedDescription); return }
                guard let data = image?.tiffRepresentation,
                      let bitmap = NSBitmapImageRep(data: data),
                      let png = bitmap.representation(using: .png, properties: [:]) else { self.fail("WKWebView returned no screenshot."); return }
                do {
                    try png.write(to: self.outputDirectory.appendingPathComponent("desktop-dark.png"))
                    print("WKWebView screenshot and computed styles: \(self.outputDirectory.path)")
                    self.application.terminate(nil)
                } catch { self.fail(error.localizedDescription) }
            }
        }
    }

    private func fail(_ message: String) {
        fputs("\(message)\n", stderr)
        exit(1)
    }
}

@main
struct RunWebKitCheck {
    @MainActor static func main() throws {
        let output = URL(fileURLWithPath: "build/webkit-check", isDirectory: true)
        try FileManager.default.createDirectory(at: output, withIntermediateDirectories: true)
        let check = WebKitCheck(outputDirectory: output)
        check.run()
    }
}
