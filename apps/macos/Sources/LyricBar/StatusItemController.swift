import AppKit
import ServiceManagement

/// Menu bar item: status, settings, and (optionally) the current lyric line.
/// Also the whole UI on Macs without a Touch Bar.
final class StatusItemController: NSObject, NSMenuDelegate {
    private let item = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
    private let store: LyricStore
    private let touchBar: TouchBarController
    private let port: UInt16
    var serverError: String?
    /// Sends a command to the browser extension.
    var send: (Command) -> Void = { _ in }

    init(store: LyricStore, touchBar: TouchBarController, port: UInt16) {
        self.store = store
        self.touchBar = touchBar
        self.port = port
        super.init()
        let menu = NSMenu()
        menu.delegate = self
        item.menu = menu
        item.button?.imagePosition = .imageLeading
        refresh()
    }

    func refresh() {
        guard let button = item.button else { return }
        button.image = NSImage(systemSymbolName: "music.note", accessibilityDescription: "LyricBar")
        if Settings.menuBarLyrics, store.track != nil {
            let text = store.display.primary
            button.title = " " + (text.count > 60 ? String(text.prefix(57)) + "…" : text)
        } else {
            button.title = ""
        }
    }

    func menuNeedsUpdate(_ menu: NSMenu) {
        menu.removeAllItems()

        if let track = store.track {
            menu.addItem(info("\(track.title) — \(track.artist)", bold: true))
            menu.addItem(info(lyricsStatus(track)))
        } else {
            menu.addItem(info("Nothing playing", bold: true))
        }

        if let serverError {
            menu.addItem(info("⚠︎ \(serverError)"))
        } else if store.connections == 0 {
            menu.addItem(info("Waiting for browser extension (port \(port))"))
            menu.addItem(action("Install Browser Extension…", #selector(openExtensionGuide)))
        } else {
            menu.addItem(info("Browser extension connected"))
        }

        menu.addItem(.separator())
        if touchBar.isAvailable {
            menu.addItem(toggle("Show Lyrics on Touch Bar", touchBar.isVisible, #selector(toggleTouchBar), key: "l"))
        } else {
            menu.addItem(info("No Touch Bar detected"))
        }

        if let track = store.track, store.connections > 0 {
            menu.addItem(.separator())
            menu.addItem(info("This Song"))
            let offset = track.offsetMs ?? 0
            let hasLyrics = track.hasLyrics && track.hidden != true
            let late = action("Lyrics Are Late — Show 0.5 s Earlier", #selector(shiftEarlier), key: "]")
            let early = action("Lyrics Are Early — Show 0.5 s Later", #selector(shiftLater), key: "[")
            late.isEnabled = hasLyrics
            early.isEnabled = hasLyrics
            menu.addItem(late)
            menu.addItem(early)
            let reset = action("Reset Timing (now \(Self.format(offset)))", #selector(resetTiming))
            reset.isEnabled = offset != 0
            menu.addItem(reset)

            let count = track.match?.count ?? 0
            let index = (track.match?.index ?? -1) + 1
            let next = action(count > 1 ? "Wrong Lyrics? Try Next Match (\(index)/\(count))" : "Wrong Lyrics? No Other Match Found", #selector(nextMatch))
            next.isEnabled = count > 1
            menu.addItem(next)
            menu.addItem(action(track.hidden == true ? "Show Lyrics for This Song" : "Hide Lyrics for This Song", #selector(toggleHidden)))
            let retry = action("Search Lyrics Again", #selector(retry))
            retry.isEnabled = track.loading != true
            menu.addItem(retry)
        }

        menu.addItem(.separator())
        if touchBar.isAvailable {
            menu.addItem(toggle("Auto-show When a Song Starts", Settings.autoShowTouchBar, #selector(toggleAutoShow)))
            let noLyrics = NSMenuItem(title: "When a Song Has No Lyrics", action: nil, keyEquivalent: "")
            let sub = NSMenu()
            sub.addItem(toggle("Show Song Info", !Settings.hideWhenNoLyrics, #selector(noLyricsShowInfo)))
            sub.addItem(toggle("Return to Normal Touch Bar", Settings.hideWhenNoLyrics, #selector(noLyricsHide)))
            noLyrics.submenu = sub
            menu.addItem(noLyrics)
        }
        menu.addItem(toggle("Show Next Line", Settings.showNextLine, #selector(toggleNextLine)))
        menu.addItem(toggle("Show Lyrics in Menu Bar", Settings.menuBarLyrics, #selector(toggleMenuBarLyrics)))
        if #available(macOS 13.0, *), Onboarding.isAppBundle {
            menu.addItem(toggle("Launch at Login", SMAppService.mainApp.status == .enabled, #selector(toggleLogin)))
        }

        menu.addItem(.separator())
        menu.addItem(action("LyricBar on GitHub", #selector(openGitHub)))
        menu.addItem(action("Quit LyricBar", #selector(quit), key: "q"))
    }

    private func lyricsStatus(_ track: TrackInfo) -> String {
        if track.loading == true { return "Looking up lyrics…" }
        if track.hidden == true { return "Lyrics hidden for this song" }
        if track.error == "network" { return "Can't reach the lyrics service — retrying…" }
        if track.instrumental == true { return "Instrumental" }
        guard let source = track.source, track.hasLyrics else { return "No lyrics found" }
        var parts = ["Lyrics: \(source == "spotify" ? "Spotify" : "LRCLIB")"]
        parts.append(track.synced == true ? "synced" : "unsynced (timing estimated)")
        if let match = track.match, match.count > 1 { parts.append("match \(match.index + 1)/\(match.count)") }
        if let offset = track.offsetMs, offset != 0 { parts.append("timing \(Self.format(offset))") }
        return parts.joined(separator: " · ")
    }

    /// "+0.5 s" / "−1.0 s" / "±0.0 s" (positive = lyrics earlier).
    static func format(_ offsetMs: Double) -> String {
        let s = offsetMs / 1000
        let sign = s > 0 ? "+" : (s < 0 ? "−" : "±")
        return "\(sign)\(String(format: "%.1f", abs(s))) s"
    }

    // MARK: Actions

    @objc private func toggleTouchBar() { touchBar.toggle() }
    @objc private func shiftEarlier() { send(.offset(deltaMs: 500)) }
    @objc private func shiftLater() { send(.offset(deltaMs: -500)) }
    @objc private func resetTiming() { send(.offsetReset) }
    @objc private func nextMatch() { send(.nextMatch) }
    @objc private func toggleHidden() { send(.toggleHidden) }
    @objc private func retry() { send(.retry) }
    @objc private func toggleAutoShow() { Settings.autoShowTouchBar.toggle() }
    @objc private func noLyricsShowInfo() { Settings.hideWhenNoLyrics = false }
    @objc private func noLyricsHide() { Settings.hideWhenNoLyrics = true }
    @objc private func toggleNextLine() {
        Settings.showNextLine.toggle()
        store.onChange?()
    }
    @objc private func toggleMenuBarLyrics() {
        Settings.menuBarLyrics.toggle()
        refresh()
    }

    @objc private func toggleLogin() {
        guard #available(macOS 13.0, *) else { return }
        do {
            if SMAppService.mainApp.status == .enabled {
                try SMAppService.mainApp.unregister()
            } else {
                try SMAppService.mainApp.register()
            }
        } catch {
            let alert = NSAlert()
            alert.messageText = "Couldn't change Launch at Login"
            alert.informativeText = "\(error.localizedDescription)\n\nTip: move LyricBar.app to /Applications first."
            alert.runModal()
        }
    }

    @objc private func openExtensionGuide() { Onboarding.openExtensionGuide() }

    @objc private func openGitHub() {
        NSWorkspace.shared.open(URL(string: "https://github.com/reihnxx/lyricbar")!)
    }

    @objc private func quit() { NSApp.terminate(nil) }

    // MARK: Menu helpers

    private func info(_ title: String, bold: Bool = false) -> NSMenuItem {
        let menuItem = NSMenuItem(title: title, action: nil, keyEquivalent: "")
        menuItem.isEnabled = false
        if bold {
            menuItem.attributedTitle = NSAttributedString(string: title, attributes: [.font: NSFont.boldSystemFont(ofSize: 13)])
        }
        return menuItem
    }

    private func action(_ title: String, _ selector: Selector, key: String = "") -> NSMenuItem {
        let menuItem = NSMenuItem(title: title, action: selector, keyEquivalent: key)
        menuItem.target = self
        return menuItem
    }

    private func toggle(_ title: String, _ on: Bool, _ selector: Selector, key: String = "") -> NSMenuItem {
        let menuItem = action(title, selector, key: key)
        menuItem.state = on ? .on : .off
        return menuItem
    }
}
