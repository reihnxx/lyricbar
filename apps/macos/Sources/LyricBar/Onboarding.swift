import AppKit
import ServiceManagement

/// First-launch welcome: tells non-technical users where LyricBar lives and
/// what the one remaining step is, and offers to start it at login.
enum Onboarding {
    static let guideURL = URL(string: "https://github.com/reihnxx/lyricbar#readme")!

    /// Running as a real LyricBar.app (not a `swift run` / debug binary).
    static var isAppBundle: Bool { Bundle.main.bundleURL.pathExtension == "app" }

    static func showIfNeeded() {
        let defaults = UserDefaults.standard
        guard isAppBundle, !defaults.bool(forKey: "onboarded") else { return }
        defaults.set(true, forKey: "onboarded")

        let alert = NSAlert()
        alert.icon = NSApp.applicationIconImage
        alert.messageText = "LyricBar is running ♪"
        alert.informativeText = """
        Look for ♪ in the menu bar — and in the Touch Bar's Control Strip if your Mac has one.

        One more step: add the LyricBar extension to your browser (Brave, Chrome, Edge or Arc), then play a song on open.spotify.com.
        """
        alert.addButton(withTitle: "Show Me How")
        alert.addButton(withTitle: "Done")

        var loginBox: NSButton?
        if #available(macOS 13.0, *) {
            let box = NSButton(checkboxWithTitle: "Start LyricBar automatically when I log in", target: nil, action: nil)
            box.state = .on
            alert.accessoryView = box
            loginBox = box
        }

        NSApp.activate(ignoringOtherApps: true)
        // Background (menu bar) apps may not be allowed to come to the front;
        // float the welcome above other windows so it is never hidden.
        alert.window.level = .floating
        let response = alert.runModal()

        if #available(macOS 13.0, *), loginBox?.state == .on {
            try? SMAppService.mainApp.register()
        }
        if response == .alertFirstButtonReturn { openExtensionGuide() }
    }

    static func openExtensionGuide() {
        NSWorkspace.shared.open(guideURL)
    }
}
