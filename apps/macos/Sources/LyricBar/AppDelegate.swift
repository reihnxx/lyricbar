import AppKit

final class AppDelegate: NSObject, NSApplicationDelegate {
    private let store = LyricStore()
    private let touchBar = TouchBarController()
    private var server: LyricServer!
    private var statusItem: StatusItemController!

    /// Song + lyrics availability we last acted on, so auto-show / auto-hide
    /// fire once per change instead of fighting the user.
    private var lastDecision: (key: String, available: Bool)?

    func applicationDidFinishLaunching(_ notification: Notification) {
        Settings.register()
        let port = Settings.port

        touchBar.install()
        statusItem = StatusItemController(store: store, touchBar: touchBar, port: port)

        store.onChange = { [weak self] in self?.render() }
        store.onTrack = { [weak self] track, previous in self?.trackUpdated(track, previous: previous) }

        server = LyricServer(port: port)
        server.onMessage = { [weak self] message in self?.store.apply(message) }
        server.onConnectionsChanged = { [weak self] count in
            self?.statusItem.serverError = nil
            self?.store.setConnections(count)
        }
        server.onListenerError = { [weak self] error in self?.statusItem.serverError = error }
        statusItem.send = { [weak self] command in self?.server.broadcast(command) }
        server.start()

        render()
        Onboarding.showIfNeeded()
    }

    func applicationWillTerminate(_ notification: Notification) {
        touchBar.uninstall()
    }

    private func trackUpdated(_ track: TrackInfo, previous: TrackInfo?) {
        // Timing nudged for this song → confirm on the Touch Bar.
        if let previous, (previous.offsetMs ?? 0) != (track.offsetMs ?? 0) {
            touchBar.flash("timing \(StatusItemController.format(track.offsetMs ?? 0))")
        }
        if let previous, previous.match?.index != track.match?.index, let match = track.match, match.count > 1 {
            touchBar.flash("match \(match.index + 1)/\(match.count)")
        }

        // Wait until the lookup has finished before deciding anything.
        guard track.loading != true else { return }
        let available = track.hasLyrics && track.hidden != true
        if let last = lastDecision, last.key == track.key, last.available == available { return }
        lastDecision = (track.key, available)

        if available {
            if Settings.autoShowTouchBar { touchBar.show() }
        } else if Settings.hideWhenNoLyrics, touchBar.isVisible {
            touchBar.hide()
        }
    }

    private func render() {
        touchBar.update(store.display)
        statusItem.refresh()
    }
}
