import Foundation

/// What a frontend should render right now.
struct Display: Equatable {
    enum Style { case lyric, info }
    var primary: String
    var next: String?
    var style: Style
    /// Seconds the current line stays on screen (used to pace marquee scrolling).
    var lineDuration: Double?
    /// Small status marker shown at the right edge ("⏸", "≈ unsynced").
    var badge: String?
}

/// Latest state received from the browser extension. Main-thread only.
final class LyricStore {
    private(set) var track: TrackInfo?
    private(set) var state: PlaybackState?
    private(set) var line: LinePayload?
    private(set) var connections = 0

    /// Fired after every change.
    var onChange: (() -> Void)?
    /// Fired for every `track` message: (new value, previous value for the same song or nil for a new song).
    var onTrack: ((TrackInfo, TrackInfo?) -> Void)?

    func apply(_ message: Incoming) {
        switch message {
        case .track(let info):
            let previous = info.key == track?.key ? track : nil
            if previous == nil { line = nil }
            track = info
            onTrack?(info, previous)
        case .state(let s):
            state = s
        case .line(let l):
            line = l
        case .clear:
            track = nil
            state = nil
            line = nil
        case .hello, .ping, .unknown:
            return
        }
        onChange?()
    }

    func setConnections(_ count: Int) {
        connections = count
        if count == 0 {
            track = nil
            state = nil
            line = nil
        }
        onChange?()
    }

    var display: Display {
        guard let track else {
            return Display(
                primary: "♪ LyricBar",
                next: connections > 0 ? "play something on open.spotify.com" : "waiting for the browser extension…",
                style: .info
            )
        }
        let paused = state?.isPlaying == false
        let info = "♪ \(track.title) — \(track.artist)"

        if track.hidden == true {
            return Display(primary: info, next: "lyrics hidden for this song", style: .info, badge: paused ? "⏸" : nil)
        }
        if track.hasLyrics, let line, line.index >= 0, let text = line.text {
            let duration = line.endMs.map { max(0, ($0 - line.startMs) / 1000) }
            let badge = paused ? "⏸" : (track.synced == false ? "≈ unsynced" : nil)
            return Display(primary: text, next: line.next, style: .lyric, lineDuration: duration, badge: badge)
        }
        let status: String?
        if track.loading == true {
            status = "looking up lyrics…"
        } else if track.error == "network" {
            status = "can't reach the lyrics service — retrying…"
        } else if track.instrumental == true {
            status = "instrumental"
        } else if !track.hasLyrics {
            status = "no lyrics found"
        } else {
            status = line?.next // before the first line: preview it
        }
        return Display(primary: info, next: status, style: .info, badge: paused ? "⏸" : nil)
    }
}
